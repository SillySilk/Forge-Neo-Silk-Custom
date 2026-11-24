# Ported from moonwhaler/comfyui-moonpack 0.4.0 (commit d4ce788), GPL-3.0. Changes for Forge Neo: a Forge script panel and prompt tags replace the ComfyUI node's widgets and LoRA stack.
"""MOSS-Image box LoRAs, moonpack style. A <lora:...> tag inside a layout item's caption is taken out of
the prompt Forge sees and added only inside that item's box (lib_moss_regional_mp.engine). The panel's
Engine switch picks this engine, the Original one (sd_forge_moss_regional_lora) or neither.

Forge-only imports (backend, networks, the engine) stay inside functions, so the pure helpers can be
tested with modules.* and gradio stubbed."""

import logging
import sys

import gradio as gr

from modules import scripts

from lib_moss_regional_mp.prompts import plan_batch

ENGINES = ["Original", "Moonpack-style", "Off"]
MOONPACK = "Moonpack-style"
TEXT_MODES = ["masked", "own caption", "global"]
OWNERSHIP = ["boxes", "attention"]
INFOTEXT_KEY = "MOSS regional LoRA"

logger = logging.getLogger("MOSS Regional LoRA mp")
if not logger.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("[MOSS Regional LoRA mp] %(levelname)s: %(message)s"))
    logger.addHandler(_h)
    logger.setLevel(logging.INFO)
    logger.propagate = False


# ---------------------------------------------------------------- pure helpers


def should_run(choice: str, is_moss: bool, ad_inner: bool) -> bool:
    """Only the Moonpack-style engine, only on MOSS-Image, never inside an ADetailer crop."""
    return choice == MOONPACK and is_moss and not ad_inner


def strip_hr(p, plan_fn, entries=None) -> list[str] | None:
    """Takes the box LoRA tags out of this batch's hires prompts; returns the originals, or None without hires.
    With `entries`, raises ValueError (and changes nothing) when the hires prompts plan other box LoRAs."""
    if not getattr(p, "enable_hr", False) or getattr(p, "all_hr_prompts", None) is None:
        return None
    b = p.batch_size
    lo, hi = p.iteration * b, (p.iteration + 1) * b
    originals = list(p.all_hr_prompts[lo:hi])
    plan = plan_fn(originals)
    if entries is not None and (plan.skip_reason or plan.entries != entries):
        raise ValueError(plan.skip_reason or "the hires prompt has other box LoRAs than the prompt")
    p.all_hr_prompts[lo:hi] = plan.stripped
    return originals


def restore_hr(p, saved) -> None:
    if saved is None:
        return
    b = p.batch_size
    p.all_hr_prompts[p.iteration * b : (p.iteration + 1) * b] = saved


def resolve(names: list[str], aliases: dict, by_name: dict) -> tuple[dict[str, object], list[str]]:
    """LoRA name -> NetworkOnDisk (alias first, as Forge's networks.load_networks), plus the names not found."""
    found, problems = {}, []
    for name in names:
        net = aliases.get(name) or by_name.get(name)
        if net is None:
            problems.append(f"'{name}' not found")
        else:
            found[name] = net
    return found, problems


def _num(v: float) -> str:
    return repr(round(float(v), 3))


def infotext(entries, settings, problems) -> str:
    s = settings
    parts = ["moonpack-style"]
    parts += [f"{e.name}: item {e.item + 1} x{_num(e.strength)}" for e in entries]
    parts.append(
        f"feather {_num(s.feather)}, skirt {_num(s.skirt)}, text {s.text_mode}, ownership {s.ownership}, "
        f"steps {_num(s.start)}-{_num(s.end)}, x{_num(s.multiplier)}"
    )
    parts += [f"skipped: {problem}" for problem in problems]
    return "; ".join(parts)


# ---------------------------------------------------------------- Forge glue


def _is_moss(p) -> bool:
    from backend.diffusion_engine.moss_image import MOSSImage

    return isinstance(p.sd_model, MOSSImage)


def _gate(p) -> bool:
    return should_run(getattr(p, "_moss_regional_engine", None), _is_moss(p), getattr(p, "_ad_inner", False))


def _problem(p, msg: str) -> None:
    logger.warning(msg)
    problems = p.__dict__.setdefault("_mrl_mp_problems", [])
    if msg not in problems:
        problems.append(msg)


def _networks():
    nets = sys.modules.get("networks")
    if nets is None:
        raise RuntimeError("Forge's LoRA module (networks) is not loaded")
    return nets


def _write_infotext(p, entries) -> None:
    """The value is a callable so notes the engine adds while sampling (warn_once) still reach the infotext."""
    settings = p._mrl_mp_settings
    problems = list(getattr(p, "_mrl_mp_problems", []))
    note_lists = list(getattr(p, "_mrl_mp_notes", []))
    entries = list(entries)

    def value(**_):
        merged = list(problems)
        for notes in note_lists:
            merged += [n for n in notes if n not in merged]
        return infotext(entries, settings, merged)

    p.extra_generation_params[INFOTEXT_KEY] = value


class MossRegionalLoraMP(scripts.Script):
    def title(self):
        return "MOSS Regional LoRA engine"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        with gr.Accordion("MOSS regional LoRA", open=False, elem_id=self.elem_id("moss_regional_mp_accordion")):
            engine_choice = gr.Radio(ENGINES, value="Original", label="Engine", elem_id=self.elem_id("moss_regional_mp_engine"))
            feather = gr.Slider(0.0, 0.3, value=0.1, step=0.01, label="Feather", elem_id=self.elem_id("moss_regional_mp_feather"),
                                info="Soft LoRA mask edge, as a fraction of the box's shorter side")
            skirt = gr.Slider(0.0, 0.25, value=0.0, step=0.01, label="Skirt", elem_id=self.elem_id("moss_regional_mp_skirt"),
                              info="Grows every LoRA mask by this fraction of the image's shorter side")
            text_mode = gr.Radio(TEXT_MODES, value="masked", label="Text tokens", elem_id=self.elem_id("moss_regional_mp_text"),
                                 info="masked: no box LoRA on text; own caption: on the box's caption; global: on all text")
            ownership = gr.Radio(OWNERSHIP, value="boxes", label="Ownership", elem_id=self.elem_id("moss_regional_mp_ownership"),
                                 info="boxes: the drawn boxes decide (item 1 in front); attention: measured from the first steps")
            measure_until = gr.Slider(0.05, 0.9, value=0.3, step=0.05, label="Measure until", elem_id=self.elem_id("moss_regional_mp_measure"),
                                      info="attention ownership: fraction of sampling used to measure")
            spill = gr.Slider(0.0, 0.3, value=0.1, step=0.01, label="Spill", elem_id=self.elem_id("moss_regional_mp_spill"),
                              info="attention ownership: how far beyond its box a LoRA may follow its subject")
            start = gr.Slider(0.0, 1.0, value=0.0, step=0.01, label="Start", elem_id=self.elem_id("moss_regional_mp_start"))
            end = gr.Slider(0.0, 1.0, value=1.0, step=0.01, label="End", elem_id=self.elem_id("moss_regional_mp_end"))
            multiplier = gr.Slider(0.5, 2.0, value=1.0, step=0.05, label="Strength multiplier", elem_id=self.elem_id("moss_regional_mp_multiplier"))
        return [engine_choice, feather, skirt, text_mode, ownership, measure_until, spill, start, end, multiplier]

    def process(self, p, engine_choice, *rest):
        from lib_moss_regional_mp.engine import Settings

        p._moss_regional_engine = engine_choice
        p._mrl_mp_settings = Settings(*rest)

    def before_process_batch(self, p, *args, **kwargs):
        from lib_moss_regional_mp import engine

        engine.unpatch()
        p._mrl_mp_plan = None
        p._mrl_mp_hr_saved = None
        p._mrl_mp_hr_ok = True
        p._mrl_mp_problems = []
        p._mrl_mp_notes = []
        if not _gate(p):
            return
        p.extra_generation_params.pop(INFOTEXT_KEY, None)  # the last batch's line; after the gate, so the Original's stays

        try:
            plan = plan_batch(p.prompts)
        except ValueError as e:
            _problem(p, f"box LoRA tags not read ({e}); nothing taken from the prompt")
            return
        if plan.skip_reason:
            _problem(p, plan.skip_reason)
            return
        for note in plan.global_notes:
            _problem(p, note)
        if not plan.entries:
            return

        p.prompts = plan.stripped
        p._mrl_mp_plan = plan
        try:
            p._mrl_mp_hr_saved = strip_hr(p, plan_batch, plan.entries)
        except ValueError as e:
            p._mrl_mp_hr_ok = False
            _problem(p, f"hires pass: {e}; no box LoRA there")

    def process_batch(self, p, *args, **kwargs):
        restore_hr(p, getattr(p, "_mrl_mp_hr_saved", None))
        p._mrl_mp_hr_saved = None

    def process_before_every_sampling(self, p, *args, **kwargs):
        from lib_moss_regional_mp import engine

        engine.unpatch()
        engine.state.notes = []  # unpatch keeps the last run's notes; this pass starts its own
        if not _gate(p):
            return
        plan = getattr(p, "_mrl_mp_plan", None)
        if plan is None or not plan.entries:
            if getattr(p, "_mrl_mp_problems", None):
                _write_infotext(p, [])
            return

        is_hr = getattr(p, "is_hr_pass", False)
        if is_hr and not getattr(p, "_mrl_mp_hr_ok", True):
            _write_infotext(p, [])
            return
        try:
            entries = self._patch(p, plan, is_hr)
        except Exception as e:  # never break the generation, never drop it silently
            engine.unpatch()
            logger.exception("box LoRAs not applied")
            _problem(p, f"box LoRAs not applied: {e}")
            entries = []
        _write_infotext(p, entries)

    def _patch(self, p, plan, is_hr):
        from backend import memory_management
        from lib_moss_regional_mp import engine

        settings = p._mrl_mp_settings
        prompt = p.hr_prompts[0] if is_hr else p.prompts[0]  # as Forge encodes it, after parsing extra networks
        info = engine.build_layout_info(prompt, p.width, p.height, p.sd_model.text_processing_engine_qwen)
        if info is None:
            p._mrl_mp_notes.append(engine.state.notes)
            return []

        nets = _networks()
        names = list(dict.fromkeys(e.name for e in plan.entries))
        found, missing = resolve(names, nets.available_network_aliases, nets.available_networks)
        if missing:
            nets.list_available_networks()
            found, missing = resolve(names, nets.available_network_aliases, nets.available_networks)
        for msg in missing:
            _problem(p, msg)

        unet = p.sd_model.forge_objects.unet
        layers_by_name = {}
        for name, net in found.items():
            layers, skipped = engine.load_lora_layers(net.filename, unet.model)
            if not layers:
                _problem(p, f"'{name}' matches no layer of this model")
                continue
            if skipped:
                _problem(p, f"'{name}': {skipped} unsupported layer(s) not applied")
            layers_by_name[name] = layers

        entries = [
            engine.Entry(e.item, e.name, e.strength * settings.multiplier, layers_by_name[e.name])
            for e in plan.entries
            if e.name in layers_by_name
        ]
        if not entries:
            return []

        predictor = unet.model.predictor
        start = None if settings.start <= 0.0 else float(predictor.percent_to_sigma(settings.start))
        end = None if settings.end >= 1.0 else float(predictor.percent_to_sigma(settings.end))
        measure = float(predictor.percent_to_sigma(settings.measure_until)) if settings.ownership == "attention" else None

        engine.patch(unet.model.diffusion_model, entries, info, settings, memory_management.get_torch_device(),
                     unet.model.computation_dtype, sigma_bounds=(start, end), measure_sigma=measure)
        p._mrl_mp_notes.append(engine.state.notes)  # the same list warn_once fills while sampling
        return [e for e in entries if e.item in info.boxes]

    def postprocess(self, p, processed, *args):
        from lib_moss_regional_mp import engine

        engine.unpatch()
