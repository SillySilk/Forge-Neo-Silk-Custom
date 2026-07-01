# Forge Neo — Silk Custom — Project Instructions

A customized fork of Forge Neo: extra ForgeCanvas tools, ControlNet features, region
randomization, model support, and 16 GB-tuned defaults. When merging upstream, preserve
everything under **"Custom work to preserve."**

- **origin** — https://github.com/SillySilk/Forge-Neo-Silk-Custom (branch `neo`)
- **upstream** — https://github.com/Haoming02/sd-webui-forge-classic (branch `neo`)

> Pre-rewrite verbose notes are archived in `CLAUDE.archive-pre-2026-06-rewrite.md`
> (kept as a safety net; deletable once this file is trusted).

---

## ⚠️ Launcher — read this first

The **active launcher is `webui.settings.bat`** (it sets `COMMANDLINE_ARGS`).
**`webui-user.bat` is gitignored and NOT used** — editing it changes nothing. This cost
real debugging time once; always edit args in `webui.settings.bat`.

- Verify args took effect via the console line: `Launching Web UI with arguments:`.
- Arg changes need a **full process restart** — the in-app "Reload UI" does **not** re-read them.

Current confirmed-good args (Anima-primary workflow, marked good 2026-06-16):
```
--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --bnb --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS"
```
- **`--bf16-unet` is fine for Anima/Z-Image** — they are already native bf16, so it does
  *not* dequantize them. (The earlier warning was about fp8/GGUF models; avoid `--bf16-unet`
  only if you load those.)
- **`--pin-shared-memory`** — back in the preferred set. If other apps get starved of RAM, drop it.
- **`--lora-dirs "G:\LORAS"`** — LoRAs live on the G: drive; **`--gradio-allowed-path "G:\LORAS"`** lets the UI read them.
- **dropped `--reserve-vram 2` / `--tiled-conv2d 512`** from this set — re-add `--tiled-conv2d 512`
  (→256/128) if VAE-decode OOM resurfaces; re-add `--reserve-vram 2` if the text encoder starves sampling.

---

## Test-driving & logs — you have full permission here

**Standing instruction:** whenever a change *can* be exercised by running the app, do it — start
the program, reproduce, read the log, fix, restart, confirm. Don't stop at "compiles" or a
unit-level repro. Most bugs here are visible directly in the runtime log, so reach for the log
before theorizing. **You may start and stop the program and run generations freely** without
asking each time — testing is expected, not exceptional.

**Why it's safe:** this repo is backed up on GitHub (`origin/neo`). Anything you change locally is
reversible (`git restore` / `git checkout origin/neo -- <file>` / reset). You cannot permanently
break it as long as that backup holds — so don't be timid about test runs.

**Where the logs are (important nuance):** `webui.bat` runs `launch.py` and prints to the
**console** — it does **not** auto-write a runtime log file. `tmp/stdout.txt` / `tmp/stderr.txt` are
only the env-probe logs (python/pip/venv checks), *not* the app output. So to "check logs," you
must capture the console yourself.

**How to test-drive headlessly** (the args already include `--api`):
1. Launch with output captured, in the background:
   `venv/Scripts/python.exe launch.py <args from webui.settings.bat> > tmp/run.log 2>&1` &
   (or run `webui.bat` redirected — but it ends in `pause`, so background + redirect is cleaner).
2. Poll `tmp/run.log` until `Running on local URL:  http://127.0.0.1:7860` appears.
3. Drive a generation via the API (`POST http://127.0.0.1:7860/sdapi/v1/txt2img` or `/img2img`),
   including the ControlNet / Forge-Couple payload needed to reproduce the case.
4. Read `tmp/run.log` for the error / success markers (e.g. `Loaded Control-LLLite (Anima) (N modules)`).
5. Stop the server (kill the launch.py process / free port 7860) before editing, then repeat.

Reproduce → log → fix → re-run is the loop. A fix isn't "verified" until the log shows it.

---

## Custom work to preserve on every upstream merge

Back up first (`git branch neo-backup-YYYYMMDD`), merge, then re-apply/verify these.
Files marked ⚠ conflict on essentially every merge.

### ForgeCanvas — `modules_forge/forge_canvas/canvas.js` ⚠
Never take upstream's `canvas.js` wholesale (it has **none** of our customs). Hand-merge
and keep ~83 custom markers:
- constructor params `no_shapes`, `scribbleRotation`/`scribbleRotationFixed`, `scribbleHeight`/`scribbleHeightFixed`
- `window.forgeCanvasInstances` registry (the ForgeUI-MaskEraser extension depends on it)
- `drawWithStamps` stamp-shape drawing system
- built-in Shift-key eraser left **commented out** (it conflicts with ForgeUI-MaskEraser)
- 50-step undo (`MAX_HISTORY`) vs upstream's `HISTORY_LIMIT = 16`

### ControlNet — `sd_forge_controlnet` ⚠ `controlnet_ui_group.py`, `controlnet.py`
- Tabbed batch UI: **Single Image / Batch Folder / Batch Upload** (galleries). Keep the
  `gr.Tabs` structure and fold upstream's additions (canvas_editor, download-preview, etc.) *inside* it.
- Z-Image ControlNet: `modules_forge/supported_controlnet_zit.py` + `backend/nn/lumina_controlnet.py`.
- `controlnet.py` uses upstream's `try_load_supported_control_model` — our old
  `cached_controlnet_loader` was undefined/broken; do not reintroduce it.

### sd-forge-couple — region randomization ⚠ `tile_funcs.py` indices
Custom "Randomize Regions" + "Lock Full-Frame Layers" + "Randomize Preset". 3 extra
params at return-list positions 3/4/5 shift `tile_funcs.py:calculate_tiles()` positional
indices by **+3**: `use_tile=15, tile_h=16, tile_v=17, mode=6, direction=8, background=9,
mapping=11, tile_threshold=18, tile_replace=19`. Wrong indices → "Invalid Tile Count: 0"
in img2img. (Full file-by-file edits in the archive file.)

### `backend/loader.py` — Qwen3 fp8 upcast ⚠
Keep the separate `elif state_dict_dtype in [torch.float8_e4m3fn, torch.float8_e5m2]:`
branch that upcasts fp8 text-encoder weights to float16 (fp8 loses text-comprehension
precision; matters for Z-Image). Upstream folds fp8 in with nf4/fp4/gguf. Marked `# CUSTOM (Forge Neo)`.

### `modules_forge/utils.py` — resolution guard ⚠
`resize_image_with_pad` has a custom `if resolution <= 0:` guard (avoids div-by-zero /
negative resize on odd ControlNet inputs). Upstream lacks it. Marked `# CUSTOM (Forge Neo)`.

### `modules/generation_parameters_copypaste.py` — compat shim
Upstream renamed this module to `modules.infotext_utils`. We added a shim re-exporting the
old name so legacy extensions (sd-dynamic-prompts, forge2_cleaner) still import successfully.

### Not custom anymore — do NOT recreate
- **ERNIE-Image** is now **official upstream**: use `backend/diffusion_engine/ernie.py`,
  `backend/nn/ernie.py`, `Ministral3_3B`, `backend/huggingface/baidu/ERNIE-Image/`. Our custom
  `ernie_image.py` / `ernie_engine.py` / custom `Ministral3` were deleted June 2026 (untested duplicate).
- **LTX-Video** was discarded June 2026 (never worked) — all wiring removed. `git grep -i ltx` should be empty.

### Other custom extensions (untracked, under `extensions/`)
- **sd-dynamic-prompts**: wildcard delimiter changed `__` → `@@` (avoids LoRA-tag conflicts).

---

## Local environment & model setup

- **GPU** RTX 4060 Ti 16 GB · **RAM** 32 GB · **Python** 3.13 · main drive ~94% full (keep an eye on it).
- **LoRAs** live on `G:\LORAS` (685 files, moved off SSD; served via `--lora-dirs`).
- **Per-model modules** (selected as "additional modules" for each UI preset):
  | Model | Preset | VAE | Text encoder |
  |---|---|---|---|
  | Chroma1-HD | `flux` | `ae.safetensors` | `fluxTextencoderT5XxlFp8` (T5 only, no CLIP-L) |
  | Z-Image / Moody Pro Mix | `zit` | `zImageTurboVAE_v10` | `qwen_3_4b` |
  | Anima | `anima` | `qwen_image_vae` | `qwen_3_06b` (+ T5 tokenizer) |
  > Chroma is *de-distilled* → use real **CFG 4–5** (not 1.0), ~30 steps. Switching the
  > **checkpoint** dropdown does NOT change modules — switch the **UI Preset** dropdown.
- **Model research + Civitai vetted picks:** `docs/model-research.md`.
  **Civitai API helper:** `tools/civitai_search.py` (use `--insecure` on Windows; `--nsfw` needs a token).

---

## Upstream merge workflow

1. `git branch neo-backup-YYYYMMDD`; commit any pending custom work.
2. `git merge upstream/neo`; resolve conflicts preserving everything above (the ⚠ files
   conflict almost every time). For `canvas.js`, hand-merge — never accept upstream's whole file.
3. Verify: ~83 canvas markers, sd-forge-couple indices, `git grep -i ltx` empty, ERNIE = upstream only,
   `python -m py_compile` on changed `.py`.
4. Last big merge: **June 2026** — upstream/neo, 175 commits, tags 2.22–2.25 (16 conflicting files resolved).
