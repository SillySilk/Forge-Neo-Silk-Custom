<!--
============================================================================
ARCHIVE — LIKELY JUNK, KEPT FOR SAFETY
============================================================================
This is the FULL verbatim contents of CLAUDE.md as it existed before the
June 2026 rewrite/de-bloat. The active CLAUDE.md was rewritten to be leaner
and to cover more (launcher path, canvas/controlnet customs, VRAM args, etc.).

Everything important here was carried forward into the new CLAUDE.md in
condensed form. This file exists only in case something trimmed as "bloat"
turns out to matter. Once you're confident the new CLAUDE.md is complete,
this file can be deleted.
============================================================================
-->

# Forge Neo — Project Instructions

## Custom Modifications

This project contains custom code layered on top of upstream extension sources.
When merging upstream updates, check each section below before overwriting any file.

---

### sd-forge-couple — Region Randomization Feature

**Status:** Custom feature, not present in upstream sd-forge-couple.

**What it does:** Adds a "Randomize Regions" checkbox to the Forge Couple UI that
randomly repositions attention regions for each image in a batch. A "Lock Full-Frame
Layers" checkbox (Advanced mode only) pins full-canvas regions so only partial
regions are randomized.

**Files modified:**

| File | What was added |
|------|---------------|
| `extensions/sd-forge-couple/scripts/forge_couple.py` | `randomize_regions` and `lock_fullframe` params in `after_extra_networks_activate` and `process_before_every_sampling`; randomization state vars in `__init__`; iteration counter reset in `setup()`; randomization logic block before tile mapping calls |
| `extensions/sd-forge-couple/lib_couple/mapping.py` | `import random`; three functions at bottom: `randomize_advanced_mapping()`, `randomize_basic_positions()`, `randomize_mask_position()` |
| `extensions/sd-forge-couple/lib_couple/ui.py` | `randomize_regions` checkbox in the main checkbox column; `lock_fullframe` checkbox inside the Advanced settings group; both in `infotext_fields` and the component return list |

**Parameter order in `ui.py` return list (must match function signatures):**
```
enable, disable_hr, randomize_regions, lock_fullframe, randomize_preset,
mode, separator, direction, background, background_weight, mapping,
common_parser, common_debug, def_in_prompt,
use_tile, tile_h, tile_v, tile_threshold, tile_replace, debug
```

**CRITICAL — `tile_funcs.py` hardcoded indices:** `calculate_tiles()` reads args by
positional index. Our 3 extra params (randomize_regions at 3, lock_fullframe at 4,
randomize_preset at 5) shift all upstream indices ≥ 3 by +3. The corrected values are:

| Variable | Old index | Current index |
|----------|-----------|---------------|
| use_tile | 12 | 15 |
| tile_h | 13 | 16 |
| tile_v | 14 | 17 |
| mode | 3 | 6 |
| direction | 5 | 8 |
| background | 6 | 9 |
| mapping | 8 | 11 |
| tile_threshold | 15 | 18 |
| tile_replace | 16 | 19 |

If you add more custom params before `mode` in the return list, increment all
indices ≥ the insertion point in `tile_funcs.py:calculate_tiles()` accordingly.

**History:** Originally added in commit `fe81e854`. Lost when upstream 6.0.1 files
were copied into the working tree (Dec 2025). Re-ported in March 2026 on top of
the 6.0.1 base. `randomize_preset` added April 2026; `tile_funcs.py` index fix
applied at same time (was causing "Invalid Tile Count: 0" in img2img mode).

**When merging upstream updates to sd-forge-couple:**
1. Do not blindly overwrite `forge_couple.py`, `mapping.py`, `ui.py`, or `tile_funcs.py`.
2. Diff each file against the upstream version and re-apply the changes listed above.
3. Verify the `randomize_regions` / `lock_fullframe` / `randomize_preset` params
   appear in the correct position in both the `ui.py` return list and the two hook
   method signatures.
4. Re-check the index table above against the updated `tile_funcs.py`.

---

### ERNIE-Image — now UPSTREAM (custom version removed June 2026)

**Status:** No longer custom. Our May 2026 custom ERNIE implementation was **removed**
in the June 2026 upstream merge because upstream now ships official ERNIE-Image support
(same Ministral3 architecture). Do not re-add the custom files.

**What upstream provides (use these):**
- `backend/diffusion_engine/ernie.py` — `ErnieImage(ForgeDiffusionEngine)` engine
- `backend/nn/ernie.py` — `ErnieImageModel` transformer
- `backend/text_processing/ministral3_engine.py` — `Ministral3TextProcessingEngine`
- `backend/nn/llm/llama.py` — `Ministral3_3B`
- `backend/huggingface/baidu/ERNIE-Image/` configs + `backend/huggingface/ernie.tokenizer.json.xz`
- loader.py `Mistral3Model` handler + `ErnieImageTransformer2DModel` branch

**Removed (our old custom duplicate, do NOT recreate):**
`backend/nn/ernie_image.py`, `backend/text_processing/ernie_engine.py`,
`backend/diffusion_engine/ernie_image.py`, and the custom `Ministral3`/`Ministral3Config`
in `llama.py`. Our version was never confirmed working; upstream's is the maintained path.

---

### LTX-Video — DISCARDED (June 2026)

Unfinished LTX-Video support (never confirmed working) was fully removed before the
June 2026 merge: deleted `backend/nn/ltx.py`, `backend/nn/ltx_vae.py`,
`backend/diffusion_engine/ltx.py`; stripped all LTX wiring from `loader.py`,
`presets.py`, `latent.py`, `model_list.py`. Do not re-add unless intentionally
re-implementing.

---

### Qwen3 fp8 upcast — permanent custom in loader.py

**Status:** Custom fix. Watch on every merge.

`backend/loader.py` Qwen3 handler upcasts fp8 (`float8_e4m3fn`/`float8_e5m2`) text
encoder weights to the storage dtype (float16) instead of keeping them fp8 — fp8 loses
too much precision for text comprehension (matters for Z-Image). Upstream lumps fp8 in
with nf4/fp4/gguf; keep our separate `elif state_dict_dtype in [torch.float8_e4m3fn,
torch.float8_e5m2]:` branch that loops the state dict and casts up. Marked
`# CUSTOM (Forge Neo)` in the file.
