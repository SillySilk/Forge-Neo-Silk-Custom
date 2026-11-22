"""MOSS-Image regional LoRA: a LoRA tagged inside a JSON Builder item only acts inside that item.

MOSS (backend/nn/moss_image.py) runs [image tokens | text tokens] through one sequence, and the
JSON Builder prompt already places every item with its bbox, so no attention bias is needed:
each LoRA is kept on the image tokens inside its items' boxes and on the text tokens of those
items, and subtracted everywhere else (lowrank.subtract_outside). All patches are swaps
restored by unpatch(); moss_image.py itself is never edited.
"""

import logging
import math
import re
import sys
import types
from dataclasses import dataclass, field

import torch

from backend import memory_management
from backend.args import dynamic_args
from backend.nn import moss_image as _moss
from backend.operations_mixed_precision import _eager_input_act
from backend.patcher.lora import load_lora, model_lora_keys_unet
from backend.state_dict import state_dict_prefix_replace
from backend.utils import load_torch_file

from . import layout as _layout
from . import lowrank as _lora

logger = logging.getLogger("MOSS Regional LoRA")
if not logger.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("[MOSS Regional LoRA] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)
    logger.propagate = False

_EXTRA_NET = re.compile(r"<(\w+):([^>]+)>")  # modules/extra_networks.re_extra_net


@dataclass
class _Spec:
    name: str
    items: list[int]
    layers: dict[str, _lora.LowRank] = field(default_factory=dict)  # module path under the DiT -> LowRank


@dataclass
class _Layout:
    boxes: list[tuple[float, float, float, float] | None]  # per item, fractions (top, left, bottom, right)
    item_tokens: list[list[int]]  # per item, its text-token indices
    loras: list[list[str]]  # per item


# per-file cache of low-rank layers (CPU) for the session: filename -> (layers, skipped)
_LOWRANK_CACHE: dict[str, tuple[dict[str, _lora.LowRank], int]] = {}


class _State:
    def __init__(self):
        self.reset()

    def reset(self):
        self.specs: list[_Spec] = []
        self.layouts: dict[int, _Layout] = {}  # cond text length -> layout
        self.module_entries: dict[str, list[tuple[int, _lora.LowRank]]] = {}
        self.wrapped: list[torch.nn.Module] = []
        self.tok_w: torch.Tensor | None = None  # (n_specs, B, H*W + T) for the running forward
        self.img_len: int = 0
        self.in_lia: bool = False
        self.warned: set[str] = set()


state = _State()
_originals: dict = {}


def _warn_once(key: str, msg: str):
    if key not in state.warned:
        state.warned.add(key)
        logger.warning(msg)


# ---------------------------------------------------------------- layout -> tokens


_FAST: dict[str, object] = {}


def _fast_tokenizer(slow):
    """Forge loads the slow Qwen tokenizer, which cannot report character offsets; load the fast
    one from the same files (build_layout checks that both give the same ids)."""
    if getattr(slow, "is_fast", False):
        return slow
    path = slow.name_or_path
    if path not in _FAST:
        from transformers import AutoTokenizer

        _FAST[path] = AutoTokenizer.from_pretrained(path, use_fast=True)
    return _FAST[path]


def _strip_networks(text: str) -> str:
    return _EXTRA_NET.sub("", text)


def build_layout(tagged_prompt: str, width: int, height: int, engine) -> tuple[int, _Layout] | None:
    """(cond token count, layout) for one prompt as Forge will encode it, or None if it is not a layout."""
    tagged_items = _layout.parse_items(tagged_prompt)
    if not tagged_items:
        return None

    # Forge strips <lora:...> before encoding; the engine then strips whitespace and wraps the
    # prompt in its chat template (backend/text_processing/moss_image_engine.py)
    text = _strip_networks(tagged_prompt).strip() or " "
    items = _layout.parse_items(text)
    if items is None or len(items) != len(tagged_items):
        _warn_once("items", "item count changed after removing LoRA tags; regional LoRA skipped")
        return None

    template = engine.llama_template
    prefix = template.index("{}")
    escaped, index = _layout.unescape_with_map(template.format(text))
    slow = engine.tokenizer.tokenizer
    enc = _fast_tokenizer(slow)(escaped, return_offsets_mapping=True)
    if enc["input_ids"] != slow(escaped)["input_ids"]:
        _warn_once("tokens", "the fast tokenizer disagrees with the engine's; regional LoRA skipped")
        return None
    spans = [(index[prefix + it.start], index[prefix + it.end]) for it in items]
    tokens = _layout.token_spans(enc["offset_mapping"], spans)

    boxes = [_layout.box_fraction(it.bbox, width, height) if it.bbox else None for it in items]
    return len(enc["input_ids"]), _Layout(boxes, tokens, [it.loras for it in tagged_items])


def collect_layouts(prompts: list[str], width: int, height: int, engine) -> tuple[dict[int, _Layout], set[str]]:
    layouts: dict[int, _Layout] = {}
    global_names: set[str] = set()
    for prompt in dict.fromkeys(prompts):
        built = build_layout(prompt, width, height, engine)
        if built is None:
            continue
        length, lay = built
        if length in layouts and layouts[length] != lay:
            _warn_once("ambiguous", "two prompts in this batch encode to the same length with different layouts; using the first")
            continue
        layouts[length] = lay
        global_names |= _layout.global_loras(prompt, _layout.parse_items(prompt))
    return layouts, global_names


# ---------------------------------------------------------------- LoRA specs


def _lowrank_layers(filename: str, unet_model):
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


def _build_specs(layouts: dict[int, _Layout], global_names: set[str], unet_model) -> list[_Spec]:
    nets = getattr(sys.modules.get("networks"), "loaded_networks", [])
    by_name = {}
    for n in nets:
        by_name[n.name] = n
        if getattr(n, "mentioned_name", None):
            by_name[n.mentioned_name] = n

    lay = next(iter(layouts.values()))
    per_name: dict[str, list[int]] = {}
    for i, names in enumerate(lay.loras):
        for name in names:
            per_name.setdefault(name, []).append(i)

    specs = []
    for name, items in per_name.items():
        if name in global_names:
            logger.info(f"LoRA '{name}' is also outside the items; staying global")
            continue
        if any(lay.boxes[i] is None for i in items):
            logger.warning(f"LoRA '{name}': an item has no box; staying global")
            continue
        net = by_name.get(name)
        if net is None:
            logger.warning(f"LoRA '{name}' is not loaded; staying global")
            continue
        layers, skipped = _lowrank_layers(net.network_on_disk.filename, unet_model)
        strength = float(net.unet_multiplier)
        copies = {path: _lora.LowRank(lr.up, lr.down, lr.scale * strength) for path, lr in layers.items()}
        if skipped:
            logger.warning(f"LoRA '{name}': {skipped} unsupported layer(s) stay global")
        if not copies:
            logger.warning(f"LoRA '{name}': no supported layers; staying global")
            continue
        specs.append(_Spec(name, items, copies))
    return specs


# ---------------------------------------------------------------- patching


def patch(unet, layouts: dict[int, _Layout], global_names: set[str]) -> list[_Spec]:
    unpatch()
    if not layouts:
        return []
    try:
        specs = _build_specs(layouts, global_names, unet.model)
        if not specs:
            return []
        dit = unet.model.diffusion_model

        entries: dict[str, list[tuple[int, _lora.LowRank]]] = {}
        for i, spec in enumerate(specs):
            for path, lr in spec.layers.items():
                entries.setdefault(path, []).append((i, lr))
        missing = 0
        for path in list(entries):
            try:
                m = dit.get_submodule(path)
            except AttributeError:
                missing += 1
                del entries[path]
                continue
            m._mrl_path = path
            m.forward = types.MethodType(_linear_forward, m)
            state.wrapped.append(m)
        if missing:
            logger.warning(f"{missing} LoRA layer path(s) not found in the model; those stay global")

        # Move the matrices now, before Forge plans the model load (the Couple Krea lesson:
        # placing them lazily inside the forward over-filled VRAM and Windows paged).
        device = memory_management.get_torch_device()
        dtype = unet.model.computation_dtype
        for spec in specs:
            for lr in spec.layers.values():
                moved = lr.to(device, dtype)
                lr.up, lr.down = moved.up, moved.down

        state.specs = specs
        state.layouts = layouts
        state.module_entries = entries
        _originals["_forward"] = _moss.MOSSImage._forward
        _originals["linear_input_act"] = _moss.linear_input_act
        _moss.MOSSImage._forward = _dit_forward
        _moss.linear_input_act = _linear_input_act

        for spec in specs:
            logger.info(f"LoRA '{spec.name}' -> item(s) {[i + 1 for i in spec.items]} ({len(spec.layers)} layers)")
        return specs
    except Exception:
        logger.exception("patch failed; LoRAs stay global")
        unpatch()
        return []


def unpatch():
    for m in state.wrapped:
        m.__dict__.pop("forward", None)
        if hasattr(m, "_mrl_path"):
            delattr(m, "_mrl_path")
    if "_forward" in _originals:
        _moss.MOSSImage._forward = _originals.pop("_forward")
    if "linear_input_act" in _originals:
        _moss.linear_input_act = _originals.pop("linear_input_act")
    state.reset()


# ---------------------------------------------------------------- token weights


def _box_mask(box, h: int, w: int, device) -> torch.Tensor:
    top, left, bottom, right = box
    m = torch.zeros(h, w, dtype=torch.float32, device=device)
    r0, r1 = math.floor(top * h), max(math.ceil(bottom * h), math.floor(top * h) + 1)
    c0, c1 = math.floor(left * w), max(math.ceil(right * w), math.floor(left * w) + 1)
    m[r0:r1, c0:c1] = 1.0
    return m.flatten()


def _token_weights(rows_cond: list[bool], h: int, w: int, text_len: int, device) -> torch.Tensor:
    lay = state.layouts.get(text_len) if any(rows_cond) else None
    if any(rows_cond) and lay is None:
        _warn_once(f"len{text_len}", f"no layout matches a {text_len}-token prompt; LoRAs act only inside their boxes, not on their text")
    boxes = (lay or next(iter(state.layouts.values()))).boxes

    out = torch.zeros(len(state.specs), len(rows_cond), h * w + text_len, dtype=torch.float32, device=device)
    for s, spec in enumerate(state.specs):
        img = torch.zeros(h * w, dtype=torch.float32, device=device)
        for i in spec.items:
            img = torch.maximum(img, _box_mask(boxes[i], h, w, device))
        out[s, :, : h * w] = img
        if lay is None:
            continue
        txt = torch.zeros(text_len, dtype=torch.float32, device=device)
        for i in spec.items:
            txt[lay.item_tokens[i]] = 1.0
        for r, cond in enumerate(rows_cond):
            if cond:
                out[s, r, h * w :] = txt
    return out


def _rows_cond(transformer_options: dict, rows: int) -> list[bool]:
    chunks = transformer_options.get("cond_or_uncond") or []
    if not chunks or rows % len(chunks):
        return [True] * rows
    per = rows // len(chunks)
    return [chunks[r // per] == 0 for r in range(rows)]


def _dit_forward(self, x, timestep, context, transformer_options={}):
    orig = _originals["_forward"]
    B, _, H, W = x.shape
    text_len = context.shape[1]
    if dynamic_args.ref_latents and dynamic_args.moss_reference_method in ("index", "index_timestep_zero", None):
        _warn_once("refs", "reference images are in the sequence; regional LoRA is off for this generation")
        return orig(self, x, timestep, context, transformer_options)
    try:
        state.img_len = H * W
        state.tok_w = _token_weights(_rows_cond(transformer_options, B), H, W, text_len, x.device).to(x.dtype)
        return orig(self, x, timestep, context, transformer_options)
    finally:
        state.tok_w = None


def _weights_for(x: torch.Tensor) -> torch.Tensor | None:
    tw = state.tok_w
    if tw is None or x.dim() != 3 or x.shape[0] != tw.shape[1]:
        return None
    if x.shape[1] == tw.shape[-1]:
        return tw
    if x.shape[1] == tw.shape[-1] - state.img_len:  # text embedder: text tokens only
        return tw[..., state.img_len :]
    return None


def _apply(path, out, x):
    entries = state.module_entries.get(path)
    if not entries:
        return out
    tw = _weights_for(x)
    if tw is None:
        return out
    pairs = []
    for i, lr in entries:
        if lr.up.device != x.device or lr.up.dtype != x.dtype:
            moved = lr.to(x.device, x.dtype)
            lr.up, lr.down = moved.up, moved.down  # spec-local copies, safe to cast in place
        pairs.append((lr, tw[i]))
    return _lora.subtract_outside(out, x, pairs)


def _linear_forward(self, x):
    out = type(self).forward(self, x)
    if state.in_lia:
        return out
    return _apply(getattr(self, "_mrl_path", None), out, x)


def _linear_input_act(linear, x, input_act, act_weight=None, act_eps=0.0, residual=None, residual_scale=None):
    """Block's ffn_down goes through linear_input_act, whose int8 path never calls the module's forward."""
    orig = _originals["linear_input_act"]
    path = getattr(linear, "_mrl_path", None)
    state.in_lia = True
    try:
        out = orig(linear, x, input_act, act_weight, act_eps, residual, residual_scale)
    finally:
        state.in_lia = False
    if path is None or path not in state.module_entries or _weights_for(x) is None:
        return out
    return _apply(path, out, _eager_input_act(x, input_act, act_weight, act_eps))
