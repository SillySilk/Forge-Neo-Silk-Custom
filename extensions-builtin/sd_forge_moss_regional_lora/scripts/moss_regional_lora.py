"""MOSS-Image: a <lora:...> tag inside a JSON Builder item applies only inside that item's box.
Tags in the summary caption or Extra stay global. No UI: Settings -> MOSS Regional LoRA."""

from modules import scripts, shared
from modules.script_callbacks import on_ui_settings
from modules.shared import OptionInfo, opts

from lib_moss_regional import engine


def _settings():
    opts.add_option(
        "moss_regional_lora",
        OptionInfo(
            True,
            "Keep a LoRA tagged inside a JSON Builder item to that item's box",
            section=("moss_regional_lora", "MOSS Regional LoRA"),
            category_id="sd",
        ).info("MOSS-Image only; LoRAs in the summary caption or Extra stay global"),
    )


on_ui_settings(_settings)


def _is_moss(p) -> bool:
    from backend.diffusion_engine.moss_image import MOSSImage

    return isinstance(p.sd_model, MOSSImage)


class MossRegionalLora(scripts.Script):
    def title(self):
        return "MOSS Regional LoRA"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        return []

    def before_process_batch(self, p, *args, **kwargs):
        engine.unpatch()

    def postprocess(self, p, processed, *args):
        engine.unpatch()

    def process_before_every_sampling(self, p, *args, **kwargs):
        engine.unpatch()
        if not getattr(opts, "moss_regional_lora", True) or not _is_moss(p):
            return
        if getattr(p, "_ad_inner", False):  # ADetailer crops: the boxes no longer line up
            return

        is_hr = getattr(p, "is_hr_pass", False)
        source = p.all_hr_prompts if is_hr and getattr(p, "all_hr_prompts", None) else p.all_prompts
        start = p.iteration * p.batch_size
        prompts = source[start : start + p.batch_size] or source

        # the boxes are written against the first-pass size; hires keeps the aspect, so the fractions hold
        layouts, global_names = engine.collect_layouts(prompts, p.width, p.height, p.sd_model.text_processing_engine_qwen)
        specs = engine.patch(p.sd_model.forge_objects.unet, layouts, global_names)
        if specs:
            p.extra_generation_params["MOSS regional LoRA"] = "; ".join(f"{s.name}: item {'+'.join(str(i + 1) for i in s.items)}" for s in specs)
