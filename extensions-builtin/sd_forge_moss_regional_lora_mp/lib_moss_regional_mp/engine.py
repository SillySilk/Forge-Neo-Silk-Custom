# Ported from moonwhaler/comfyui-moonpack 0.4.0 (commit d4ce788), GPL-3.0. Changes for Forge Neo: method swaps on Forge's MOSSImage (from the Original engine) replace ComfyUI's hooks, wrapper and injections.
"""MOSS-Image box LoRAs, moonpack style: each box LoRA is added on top of the base layer, weighted per token
by its box mask, so outside its box it contributes exactly zero (moonpack moss_regional_lora_node.py).

Forge plumbing comes from the Original engine (sd_forge_moss_regional_lora/lib_moss_regional/engine.py):
the fast tokenizer for caption spans, the LoRA file -> low-rank layers loader, an instance `forward` swap
on every LoRA Linear, a swapped `moss_image.linear_input_act` (the int8 ffn_down path never calls the
module's forward) and a swapped `MOSSImage._forward` that sets the per-call context. All swaps are undone
by unpatch(); backend/nn/moss_image.py itself is never edited.
"""

import logging
import re
import sys
import types
from dataclasses import dataclass

import torch

from backend.args import dynamic_args
from backend.nn import moss_image as _moss
from backend.operations_mixed_precision import _eager_input_act
from backend.patcher.lora import load_lora, model_lora_keys_unet
from backend.state_dict import state_dict_prefix_replace
from backend.utils import load_torch_file

from . import layout as _layout
from . import lowrank as _lora
from . import masks as _masks
from . import ops

logger = logging.getLogger("MOSS Regional LoRA mp")
if not logger.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("[MOSS Regional LoRA mp] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)
    logger.propagate = False

_EXTRA_NET = re.compile(r"<(\w+):([^>]+)>")  # modules/extra_networks.re_extra_net


@dataclass
class Settings:
    feather: float = 0.1
    skirt: float = 0.0
    text_mode: str = "masked"
    ownership: str = "boxes"
    measure_until: float = 0.3
    spill: float = 0.1
    start: float = 0.0
    end: float = 1.0
    multiplier: float = 1.0


@dataclass
class Entry:
    item: int
    name: str
    strength: float  # already x multiplier
    layers: dict[str, _lora.LowRank]  # module path under the DiT -> LowRank


@dataclass
class LayoutInfo:
    boxes: dict[int, tuple[float, float, float, float]]  # item -> (top, left, bottom, right) fractions
    spans: dict[int, tuple[int, int]]  # item -> caption token range [t0, t1)
    n_tokens: int  # positive prompt token count


class _CallContext:
    """What one MOSSImage._forward call looks like (moonpack _CallContext)."""

    def __init__(self, grid, text_len, active, cond_rows, batch, spans_valid, image_masks):
        self.grid = grid
        self.hw = grid[0] * grid[1]
        self.text_len = text_len
        self.active = active
        self.cond_rows = cond_rows  # batch rows of positive conditioning, or None
        self.batch = batch
        self.spans_valid = spans_valid  # the call's text is the tokenized layout prompt
        self.image_masks = image_masks  # {item: (hw,) tensor}
        self.cache: dict = {}  # (entry index, kind, length) -> (batch, length) weight or None


class _State:
    def __init__(self):
        self.notes: list[str] = []  # skip reasons for the infotext; cleared by patch(), kept by unpatch()
        self.reset()

    def reset(self):
        self.entries: list[Entry] = []
        self.info: LayoutInfo | None = None
        self.settings: Settings = Settings()
        self.sigma_bounds: tuple[float | None, float | None] = (None, None)
        self.measure_sigma: float | None = None  # attention ownership measures while sigma > this (Task 5)
        self.boxes: dict[int, tuple[float, float, float, float]] = {}  # items that carry an entry
        self.module_entries: dict[str, list[tuple[int, _lora.LowRank]]] = {}
        self.module_kinds: dict[str, str] = {}
        self.wrapped: list[torch.nn.Module] = []
        self.ctx: _CallContext | None = None
        self.in_lia: bool = False
        self.warned: set[str] = set()
        self.mask_cache: dict = {}  # (H, W, device, dtype) -> {item: (hw,) tensor}

    def warn_once(self, key: str, msg: str):
        if key not in self.warned:
            self.warned.add(key)
            logger.warning(msg)
            self.notes.append(msg)

    def image_masks(self, gh: int, gw: int, device, dtype) -> dict[int, torch.Tensor]:
        key = (gh, gw, str(device), dtype)
        cached = self.mask_cache.get(key)
        if cached is None:
            s = self.settings
            lists = _masks.geometric_masks(self.boxes, gh, gw, s.feather, s.skirt)
            cached = {i: torch.tensor(m, device=device, dtype=dtype) for i, m in lists.items()}
            if len(self.mask_cache) > 4:
                self.mask_cache.clear()
            self.mask_cache[key] = cached
        return cached

    def weight(self, index: int, kind: str, length: int, like: torch.Tensor) -> torch.Tensor | None:
        """strength * entry_weight for one entry in the running call, cached per (entry, kind, length)."""
        ctx = self.ctx
        key = (index, kind, length)
        if key not in ctx.cache:
            e = self.entries[index]
            w = _masks.entry_weight(
                ctx.image_masks.get(e.item), kind, length, ctx.hw, ctx.text_len, self.settings.text_mode,
                self.info.spans.get(e.item), ctx.cond_rows, ctx.batch, ctx.spans_valid, like=like,
            )
            ctx.cache[key] = None if w is None else w * e.strength
        return ctx.cache[key]


state = _State()
_originals: dict = {}


# ---------------------------------------------------------------- layout -> tokens


_FAST: dict[str, object] = {}


def _fast_tokenizer(slow):
    """Forge loads the slow Qwen tokenizer, which cannot report character offsets; load the fast
    one from the same files (build_layout_info checks that both give the same ids)."""
    if getattr(slow, "is_fast", False):
        return slow
    path = slow.name_or_path
    if path not in _FAST:
        from transformers import AutoTokenizer

        _FAST[path] = AutoTokenizer.from_pretrained(path, use_fast=True)
    return _FAST[path]


def build_layout_info(prompt: str, width: int, height: int, engine) -> LayoutInfo | None:
    """Boxes, caption token spans and token count of the positive prompt as Forge will encode it,
    or None (with a warning) when it is not a layout or the tokenizers disagree."""
    # the engine strips whitespace and wraps the prompt in its chat template (moss_image_engine.py)
    text = _EXTRA_NET.sub("", prompt).strip() or " "
    items = _layout.parse_items(text)
    if not items:
        state.warn_once("layout", "the prompt is not a layout; box LoRAs not applied")
        return None

    template = engine.llama_template
    prefix = template.index("{}")
    escaped, index = _layout.unescape_with_map(template.format(text))
    slow = engine.tokenizer.tokenizer
    enc = _fast_tokenizer(slow)(escaped, return_offsets_mapping=True)
    if enc["input_ids"] != slow(escaped)["input_ids"]:
        state.warn_once("tokens", "the fast tokenizer disagrees with the engine's; box LoRAs not applied")
        return None
    char_spans = [(index[prefix + it.cap_start], index[prefix + it.cap_end]) for it in items]
    token_lists = _layout.token_spans(enc["offset_mapping"], char_spans)

    boxes = {i: _layout.box_fraction(it.bbox, width, height) for i, it in enumerate(items) if it.bbox}
    spans = {i: (min(toks), max(toks) + 1) for i, toks in enumerate(token_lists) if toks}
    return LayoutInfo(boxes, spans, len(enc["input_ids"]))


# ---------------------------------------------------------------- LoRA files


# per-file cache of low-rank layers (CPU) for the session: filename -> (layers, skipped)
_LOWRANK_CACHE: dict[str, tuple[dict[str, _lora.LowRank], int]] = {}


def load_lora_layers(filename: str, unet_model) -> tuple[dict[str, _lora.LowRank], int]:
    """(module path -> LowRank, number of unsupported layers) of one LoRA file, cached."""
    if filename not in _LOWRANK_CACHE:
        sd = load_torch_file(filename, safe_load=True)
        if any(k.startswith("lora_unet__") for k in sd):
            sd = state_dict_prefix_replace(sd, {"lora_unet__": "lora_unet_"})
        patches = load_lora(sd, model_lora_keys_unet(unet_model))
        if isinstance(patches, tuple):  # Forge's load_lora returns (patch_dict, remaining_keys)
            patches = patches[0]
        pieces: dict[str, list] = {}
        skipped = 0
        for key, adapter in patches.items():
            # a tuple key is (fused weight, (dim, start, size)): a separate q / k / v LoRA on MOSS's fused qkv
            name, offset = key if isinstance(key, tuple) else (key, None)
            if not (isinstance(name, str) and name.startswith("diffusion_model.") and name.endswith(".weight")) or not hasattr(adapter, "weights"):
                skipped += 1
                continue
            lr = _lora.extract_lowrank(adapter.weights, 1.0)
            if lr is None or (offset is not None and offset[0] != 0):
                skipped += 1
                continue
            pieces.setdefault(name[len("diffusion_model.") : -len(".weight")], []).append((offset, lr))

        layers: dict[str, _lora.LowRank] = {}
        for path, parts in pieces.items():
            if len(parts) == 1 and parts[0][0] is None:
                layers[path] = parts[0][1]
                continue
            if any(offset is None for offset, _ in parts):
                skipped += len(parts)
                continue
            # stack the slices into one low-rank pair: rows of up only where each slice lands
            out_dim = unet_model.diffusion_model.get_submodule(path).weight.shape[0]
            rank = sum(lr.down.shape[0] for _, lr in parts)
            up = torch.zeros(out_dim, rank, dtype=parts[0][1].up.dtype)
            r = 0
            for (_, start, size), lr in parts:
                k = lr.down.shape[0]
                up[start : start + size, r : r + k] = lr.up * lr.scale
                r += k
            layers[path] = _lora.LowRank(up, torch.cat([lr.down for _, lr in parts], dim=0), 1.0)
        _LOWRANK_CACHE[filename] = (layers, skipped)
    return _LOWRANK_CACHE[filename]


# ---------------------------------------------------------------- patching


def patch(dit, entries: list[Entry], info: LayoutInfo, settings: Settings, device, dtype,
          sigma_bounds: tuple[float | None, float | None] = (None, None),
          measure_sigma: float | None = None) -> dict:
    """Wraps every non-vec layer of the entries' LoRAs on `dit` (a MOSSImage).
    Returns {"hooked": wrapped layers, "vec_skipped": vec layers left alone, "missing": paths not in the model}."""
    unpatch()
    state.notes = []
    stats = {"hooked": 0, "vec_skipped": 0, "missing": 0}
    kept = []
    for e in entries:
        if e.item not in info.boxes:
            state.warn_once(f"nobox{e.item}", f"LoRA '{e.name}': item {e.item + 1} has no box; not applied")
            continue
        kept.append(e)
    if not kept:
        return stats
    try:
        module_entries: dict[str, list[tuple[int, _lora.LowRank]]] = {}
        vec_paths, missing_paths = set(), set()
        for idx, e in enumerate(kept):
            for path, lr in e.layers.items():
                if ops.module_kind(path) == ops.VEC:
                    vec_paths.add(path)
                    continue
                # own copies on the compute device, so the caller's cached CPU LowRanks stay untouched
                module_entries.setdefault(path, []).append((idx, lr.to(device, dtype)))

        kinds = {}
        for path in list(module_entries):
            try:
                m = dit.get_submodule(path)
            except AttributeError:
                missing_paths.add(path)
                del module_entries[path]
                continue
            kinds[path] = ops.module_kind(path)
            m._mrl_mp_path = path
            m.forward = types.MethodType(_linear_forward, m)
            state.wrapped.append(m)

        stats = {"hooked": len(state.wrapped), "vec_skipped": len(vec_paths), "missing": len(missing_paths)}
        if vec_paths:
            state.warn_once("vec", f"{len(vec_paths)} LoRA layer(s) without a token axis (timestep / modulation / patch embed) get no box LoRA")
        if missing_paths:
            state.warn_once("missing", f"{len(missing_paths)} LoRA layer path(s) not found in the model; not applied")

        state.entries = kept
        state.info = info
        state.settings = settings
        state.sigma_bounds = tuple(sigma_bounds)
        state.measure_sigma = measure_sigma
        state.boxes = {e.item: info.boxes[e.item] for e in kept}
        state.module_entries = module_entries
        state.module_kinds = kinds

        _originals["_forward"] = _moss.MOSSImage._forward
        _originals["preprocess_refs"] = _moss.MOSSImage.preprocess_refs
        _originals["linear_input_act"] = _moss.linear_input_act
        _moss.MOSSImage._forward = _dit_forward
        _moss.MOSSImage.preprocess_refs = _preprocess_refs
        _moss.linear_input_act = _linear_input_act

        for e in kept:
            logger.info(f"LoRA '{e.name}' -> item {e.item + 1} at strength {e.strength:g}")
        return stats
    except Exception:
        unpatch()
        raise


def unpatch() -> None:
    for m in state.wrapped:
        m.__dict__.pop("forward", None)
        if hasattr(m, "_mrl_mp_path"):
            delattr(m, "_mrl_mp_path")
    if "_forward" in _originals:
        _moss.MOSSImage._forward = _originals.pop("_forward")
    if "preprocess_refs" in _originals:
        _moss.MOSSImage.preprocess_refs = _originals.pop("preprocess_refs")
    if "linear_input_act" in _originals:
        _moss.linear_input_act = _originals.pop("linear_input_act")
    state.reset()


# ---------------------------------------------------------------- per-call context


def _cond_rows(transformer_options: dict, batch: int) -> list[int] | None:
    """Batch rows of positive conditioning, from cond_or_uncond (0 = cond). moonpack _cond_rows."""
    kinds = transformer_options.get("cond_or_uncond")
    if not kinds or batch % len(kinds):
        return None
    per = batch // len(kinds)
    return [c * per + j for c, k in enumerate(kinds) if k == 0 for j in range(per)]


def _dit_forward(self, x, timestep, context, transformer_options={}):
    orig = _originals["_forward"]
    if dynamic_args.ref_latents and dynamic_args.moss_reference_method in ("index", "index_timestep_zero", None):
        state.warn_once("refs", "reference images are in the sequence; box LoRAs not applied")
        return orig(self, x, timestep, context, transformer_options)

    B, _, H, W = x.shape
    text_len = context.shape[1]
    cond_rows = _cond_rows(transformer_options, B)
    spans_valid = state.info.n_tokens == text_len
    if cond_rows and not spans_valid:
        state.warn_once("len", f"the positive prompt has {text_len} tokens, expected {state.info.n_tokens}; "
                               "'own caption' falls back to the box masks")
    sigmas = transformer_options.get("sigmas")
    active = sigmas is None or ops.schedule_active(float(sigmas.max()), *state.sigma_bounds)
    state.ctx = _CallContext((H, W), text_len, active, cond_rows, B, spans_valid,
                             state.image_masks(H, W, x.device, x.dtype) if active else {})
    try:
        return orig(self, x, timestep, context, transformer_options)
    finally:
        state.ctx = None


def _preprocess_refs(self, refs, transformer_options={}):
    """Isolated reference methods run the blocks over the reference tokens alone; no box LoRA there."""
    ctx, state.ctx = state.ctx, None
    try:
        return _originals["preprocess_refs"](self, refs, transformer_options)
    finally:
        state.ctx = ctx


# ---------------------------------------------------------------- layer hooks


def _apply(path, out, x):
    ctx = state.ctx
    entries = state.module_entries.get(path)
    if ctx is None or not ctx.active or not entries or x.dim() != 3 or x.shape[0] != ctx.batch:
        return out
    kind = state.module_kinds[path]
    length = x.shape[1]
    pairs = []
    for idx, lr in entries:
        w = state.weight(idx, kind, length, x)
        if w is None:
            continue
        if lr.up.device != x.device or lr.up.dtype != x.dtype:
            state.warn_once(f"cast{path}", f"layer '{path}' runs in {x.dtype} on {x.device}, not the patch dtype/device; casting its box LoRA")
            moved = lr.to(x.device, x.dtype)
            lr.up, lr.down = moved.up, moved.down  # patch-local copies, safe to cast in place
        pairs.append((lr, w))
    if not pairs:
        return out
    if not out.is_contiguous():
        out = out.contiguous()
    return _lora.add_weighted(out, x, pairs)


def _linear_forward(self, x):
    out = type(self).forward(self, x)
    if state.in_lia:
        return out
    return _apply(getattr(self, "_mrl_mp_path", None), out, x)


def _linear_input_act(linear, x, input_act, act_weight=None, act_eps=0.0, residual=None, residual_scale=None):
    """Block's ffn_down goes through linear_input_act, whose int8 path never calls the module's forward."""
    orig = _originals["linear_input_act"]
    path = getattr(linear, "_mrl_mp_path", None)
    state.in_lia = True
    try:
        out = orig(linear, x, input_act, act_weight, act_eps, residual, residual_scale)
    finally:
        state.in_lia = False
    ctx = state.ctx
    if path is None or path not in state.module_entries or ctx is None or not ctx.active:
        return out
    return _apply(path, out, _eager_input_act(x, input_act, act_weight, act_eps))
