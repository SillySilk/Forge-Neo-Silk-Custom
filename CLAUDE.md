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

Current confirmed-good args — **treat as the default set** (Anima-primary workflow,
re-confirmed working wonderfully 2026-07-01; heavily A/B-adjusted, so only change one
arg at a time with comparison testing):
```
--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --bnb --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS" --ckpt-dirs "G:\Wan\checkpoints" --text-encoder-dirs "G:\Wan\text_encoders"
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
and keep all of these (runnable check: every one of
`forgeCanvasInstances|drawWithStamps|_scatterJitterCache|no_shapes|scribbleRotation|scribbleHeight|MAX_HISTORY|_abort`
must grep in `canvas.js`, and the file should stay ~2.3× upstream's line count — ours ~1750+,
upstream ~750):
- constructor params `no_shapes`, `scribbleRotation`/`scribbleRotationFixed`, `scribbleHeight`/`scribbleHeightFixed`
- `window.forgeCanvasInstances` registry (the ForgeUI-MaskEraser extension depends on it)
  + `destroy()` / `AbortController` teardown of document-level listeners
- `drawWithStamps` stamp-shape drawing system (+ `shapes.js`, loaded via `canvas.py`)
- scatter brush with per-stroke jitter cache (`_scatterJitterCache`)
- built-in Shift-key eraser left **commented out** (it conflicts with ForgeUI-MaskEraser)
- 50-step undo (`MAX_HISTORY`) vs upstream's `HISTORY_LIMIT = 16`; history entries are PNG
  data URLs, not raw ImageData

### ControlNet — `sd_forge_controlnet` ⚠ `controlnet_ui_group.py`, `controlnet.py`
- Tabbed batch UI: **Single Image / Batch Folder / Batch Upload** (galleries). Keep the
  `gr.Tabs` structure and fold upstream's additions (canvas_editor, download-preview, etc.) *inside* it.
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
- **Z-Image ControlNet** was removed July 2026 (no longer using Z-Image; the misto-line default
  model was gone and the port had an inert start/end-percent bug). Deleted:
  `modules_forge/supported_controlnet_zit.py`, `backend/nn/lumina_controlnet.py`, the registration
  import in `supported_controlnet.py`, the patch hooks in `backend/nn/lumina.py`, and
  `javascript/controlnet_defaults.js` (hardcoded the removed `mistoline_v10`). Z-Image *model*
  support (`backend/diffusion_engine/zimage.py`, `zit` preset) is upstream and stays.
- **ForgeCanvas modular refactor** was abandoned and deleted July 2026 (`forge_canvas/modules/`,
  `build-canvas.sh`, `REFACTORING_*.md`, `.backup` files). The live files are the monolithic
  `canvas.js` + `shapes.js` only — never run a "build" step; edit `canvas.js` directly.

### Other custom extensions (untracked, under `extensions/`)
- **sd-dynamic-prompts**: wildcard delimiter changed `__` → `@@` (avoids LoRA-tag conflicts).

---

## Local environment & model setup

- **GPU** RTX 4060 Ti 16 GB · **RAM** 32 GB · **Python** 3.13 · main drive (C:) space freed up 2026-07-06, no longer near-full — still worth checking before large downloads.
- **LoRAs** live on `G:\LORAS` (685 files, moved off SSD; served via `--lora-dirs`).
- **Per-model modules** (selected as "additional modules" for each UI preset). All VAE /
  text-encoder files were **renamed 2026-07-02** to a self-describing scheme —
  `TE <arch> (<models it serves>)` / `VAE <arch> (<models it serves>)` — so the module
  dropdown groups TEs and VAEs and says what pairs with what. Renaming these files is safe:
  Forge detects module type from state-dict contents, not filename; only `config.json`
  (per-preset module lists), `ui-config.json` (PiD defaults), and this doc reference the names.
  | Model | Preset | VAE | Text encoder |
  |---|---|---|---|
  | Chroma1-HD | `flux` | `VAE Flux1 (Chroma)` | `TE T5-XXL fp8 (Chroma)` (T5 only, no CLIP-L) |
  | Z-Image / Moody Pro Mix | `zit` | `VAE Z-Image` | `TE Qwen3-4B (Z-Image + Klein)` |
  | Anima | `anima` | `VAE Qwen (Anima + PiD)` | `TE Qwen3-0.6B heretic (Anima)` (or `base` variant; + T5 tokenizer) |
  | Flux.2-Klein 4B (Q8 GGUF) | `klein` | `VAE Flux2 (Klein + ERNIE)` | `TE Qwen3-4B (Z-Image + Klein)` (same file as Z-Image) |
  | ERNIE-Image-Turbo (Q6 GGUF) | `ernie` | `VAE Flux2 (Klein + ERNIE)` | `TE Ministral3 (ERNIE)` |
  | Wan 2.2 14B T2V (Q4 GGUF ×2, G:) | `wan` | `VAE Wan 2.1 (Wan video)` | `TE UMT5-XXL (Wan)` (G:) |
  | Qwen-Image (Q4 GGUF; opt. `qwen-image-2512-Q4_K_M` upgrade) | `qwen` | `VAE Qwen (Anima + PiD)` | `qwen_2.5_vl_7b_fp8_scaled` (Qwen2.5-VL-7B) |
  | Krea 2 Turbo (Q6 GGUF, `krea2_turbo-Q6_K`) | `krea` | `VAE Qwen (Anima + PiD)` | `TE Qwen3-VL-4B (Krea 2)` (Qwen3-VL-4B multimodal — **not** the text-only `Qwen3-4B`) |
  > Chroma is *de-distilled* → use real **CFG 4–5** (not 1.0), ~30 steps. Klein/ERNIE/**Krea 2 Turbo** are
  > distilled → CFG 1, ~8 steps (**Krea 2 Raw** would need CFG 3–5, ~28 steps). Switching the **checkpoint**
  > dropdown does NOT change modules — switch the **UI Preset** dropdown, which auto-loads that preset's
  > `forge_additional_modules_<preset>` list from `config.json` via `on_preset_change` (main_entry.py). An
  > empty/incomplete list = the TE/VAE won't auto-populate (that was the 2026-07 `krea` empty / `qwen` missing-TE bug).
  > `TE Ministral3 (ERNIE).safetensors` (ex `ernie_ministral3_3b_textonly`) was converted
  > locally from baidu's official multimodal TE (stripped `language_model.` prefix, dropped
  > vision tower) — Forge rejects the raw baidu file ("You do not have Mistral3 state dict!").
  > Unused spares: `TE CLIP-L (spare)`, `VAE SDXL (standard)`.
- **PiD (NVIDIA pixel-diffusion decoder/upscaler)** — default-OFF (flipped 2026-07-01: the
  4× fixed upscale means 1280² → 5120² output every gen, too heavy as a default). Enable
  per-image via the "PiD Integrated" accordion checkbox in txt2img/img2img — the Anima
  model/VAE defaults are still preconfigured in `ui-config.json`. 4 steps, ~6 s at 512²,
  ~1 min extra at 1280² (5120² output, model-swap each gen). Variants are per-latent-family:
  `pid_qwenimage_*` + `VAE Qwen (Anima + PiD)` for **Anima** (the default), `pid_sdxl_*` + SDXL/Pony
  VAE for **Pony** — switch both dropdowns together. Incompatible with Hires Fix (skips itself).
  TE = `TE Gemma2 (PiD)` (ex `gemma_2_2b_it_elm_fp8_scaled`). New files went to `models/Stable-diffusion/` + `models/text_encoder/`.
- **Model research + Civitai vetted picks:** `docs/model-research.md`.
  **Civitai API helper:** `tools/civitai_search.py` (use `--insecure` on Windows; `--nsfw` needs a token).
- **LoRA preset filtering** — Settings → Extra Networks → "Filter Lora based on selected Preset"
  (`lora_preset_filter`, enabled 2026-07) hides LoRA cards whose `"sd version"` sidecar tag doesn't
  match the active UI preset. `tools/lora_autotag.py` bulk-tags `G:\LORAS` from safetensors headers
  (dry-run by default, `--apply` to write); run it again after downloading new LoRAs.

---

## Upstream merge workflow

1. `git branch neo-backup-YYYYMMDD`; commit any pending custom work.
2. `git merge upstream/neo`; resolve conflicts preserving everything above (the ⚠ files
   conflict almost every time). For `canvas.js`, hand-merge — never accept upstream's whole file.
3. Verify: canvas.js grep check (see ForgeCanvas section above) + `node --check` on changed `.js`,
   sd-forge-couple indices, `git grep -i ltx` empty, ERNIE = upstream only,
   `python -m py_compile` on changed `.py`.
4. Last big merge: **June 2026** — upstream/neo, 175 commits, tags 2.22–2.25 (16 conflicting files resolved).
5. Prior merge: **2026-07-01** — upstream/neo tag 2.26, 28 commits (Krea2, PiD, GGUF/LoRA fixes,
   Anima addcmul opt). Only 2 conflicts (README = ours; detection.py = dropped our stale
   `ernie_image` block — upstream's own ERNIE detection is the live one). canvas.js untouched.
6. Latest merge: **2026-07-13** — upstream/neo, 7 commits (k_predictor refactor, ModelMerger
   update, int8 moved into comfy-kitchen, emphasis-stripped token counter, empty-prompt qwen3vl
   fix, upscaler tweaks). Zero conflicts; no ⚠ files touched. **comfy-kitchen bumped
   0.2.10 → 0.2.16** (`pip install` needed after pulling this merge). Verified with a live
   Anima generation via API (k_predictor exercises every engine's sampling path).
7. Latest merge: **2026-07-16** — upstream/neo tag 2.27 (12 commits) **+ open PR #1316
   (PiD v1.5)**, taken before it landed upstream (it's Haoming02's own branch).
   Only conflict = README (ours). No ⚠ file needed hand-merging: the PR edits loader.py's
   **UNet** loader (~line 446) while our fp8 upcast is in the **Qwen3 TE** loader (~line 281),
   so git auto-merged. **comfy-kitchen 0.2.16 → 0.2.20** (launcher auto-installs on boot).
   Verified live: PiD 512→2048, Anima txt2img, LoRA gen; 0 tracebacks.
   - **PiD v1.5 is inert for us today** — it's gated on `lq_proj.pit_head.weight`, which our
     v1.0 weights lack (they report `lq_hidden_dim=512`, the old default), so they take an
     unchanged legacy path. Benefits need published v1.5 weights; none found as of this merge.
   - **Triton flag flip is a NO-OP for us** — upstream flipped `--enable-triton-backend` →
     `--disable-triton-backend` (opt-in → opt-out), but **triton is not installed** and is not
     in `requirements.txt`. Without the flag, `backend/quant_ops.py:31-35` falls into
     `try: import triton` → `ImportError` → `ck.registry.disable("triton")`. Verified live:
     `ck.registry` reports `triton: available=False, disabled=True,
     unavailable_reason="ImportError: No module named 'triton'"`. Nothing changed; no arg needed.
   - The PR's new `storage_dtype = torch.bfloat16` MixedPrecision branch never fires for our
     models (log shows only "MixedPrecision for **Gemma2**" — the TE branch at `loader.py:202`,
     which the PR does not touch). If you ever see "MixedPrecision for **Model**", that's the
     changed UNet branch and is worth re-testing.
8. Latest merge: **2026-07-23** — upstream/neo, **36 commits, UNTAGGED** (past tag 2.27;
   target `2.27-38-g97ff3a40`). First run of the new **`/updateforge` skill**
   (`.claude/skills/updateforge/`, local-only). **Clean merge — zero conflicts** (README did
   not conflict this time; `backend/loader.py` auto-merged and the fp8 TE-upcast branch survived —
   verified at loader.py:280-281). No ⚠ file needed hand-merging; `canvas.js`, forge-couple
   `tile_funcs.py`, `utils.py`, and the controlnet UI were untouched by upstream in this range.
   - **Dependency bumps (11):** comfy-kitchen 0.2.20→0.2.22, transformers 4.56.2→**4.57.6**,
     safetensors 0.7.0→**0.8.0**, accelerate 1.13→1.14, opencv 4.10→4.11, Pillow 12.2→12.3,
     GitPython, av, rich, pillow-heif, pillow-jxl. **Removed from requirements:** `peft`,
     `torchdiffeq` (still installed in venv, harmless). Synced via `pip install -r requirements.txt`.
     `pip check` conflicts (gradio/Pillow, litelama/kornia+omegaconf) are **pre-existing Forge
     version overrides**, not new.
   - **Notable upstream content:** several "speed" optimizations; refiner **cfg** + refiner
     **lora** support (`modules/processing_scripts/refiner.py` +77); img2img refactor;
     torch.compile tweaks (`sd_forge_compile/scripts/compile.py`); `backend/operations_triton.py`
     expanded (+197) and `quant_rotation`/`quant_ops` changes; a **PiD v1.5** commit; new
     `javascript/keepAlive.js` (replaces deleted `javascript/gradio.js`).
   - **Verified live:** Anima txt2img 512², 12 steps, seed 777 via `/sdapi/v1/txt2img` → valid
     298 KB PNG in 21.9 s; **0 tracebacks** in `tmp/run.log`; 29 JS + 32 PY changed files compile
     clean. PDF report at `docs/updates/forge-neo-update-2026-07-23-2.27-38-g97ff3a40.pdf`.

## Triton — TESTED AND REJECTED 2026-07-16 (do not reinstall without cause)

**Decision: NOT installed.** `triton-windows==3.7.1.post27` (139 MB) was installed, benchmarked,
and uninstalled the same day. Verified back to baseline afterwards (20.31s vs 20.34s
pre-experiment; compile accordion hidden again; txt2img script count back to 18). **Don't
re-litigate this** — the numbers below are measured, not theorized.

**Why rejected:** its only real benefit is unlocking torch.compile (Path C), and torch.compile's
**break-even is ~19 generations at a fixed resolution**. This workflow is **2–4 images at a
time**, where it's a net *loss*: 3 gens compiled = 20 s compile + 3×19.11 = 77.3 s vs 60.5 s
baseline → **~17 s slower**. Best case even with a persistent inductor cache is ~3 s saved per
session — not worth an unpinned out-of-band dep plus a UI footgun.

**Reinstall only if** the workflow changes to long runs (~19+) at one fixed resolution:
`venv/Scripts/python.exe -m pip install triton-windows` (keep it OUT of `requirements.txt` —
it's not upstream's dep and would become a merge-conflict point).

**Reference — it is *not* a general accelerator.** It gates three separate things; only the
third ever mattered:

| Path | Where | Gated by | Verdict on our hardware |
|---|---|---|---|
| A — ck.registry | `backend/quant_ops.py:29` | flag **and** `import triton` | **Useless.** CUDA is priority-first (`["cuda","triton","eager"]`) and triton's 13 caps are a strict **subset** of CUDA's 32 — measured "triton-only caps: none". |
| B — fused INT8 | `operations_mixed_precision.py:23-28,251,278` | **`import triton` only — flag has NO effect** | **Never fires.** Needs `quant_format == "int8_tensorwise"`; our only comfy_quant model (Gemma2 PiD TE) decodes to `{"format":"float8_e4m3fn"}`. |
| **C — torch.compile** | `extensions-builtin/sd_forge_compile/scripts/compile.py:18-23,48` | `import triton` only | **The only real benefit** — but too small here (see above). `show()` returns `AlwaysVisible if TRITON_AVAILABLE else None` → without triton the **"Torch Compile Integrated" accordion is hidden entirely**, which is why we never knew it existed. Works on **bf16** (i.e. Anima). |

**Measured** (Anima 1024², 20 steps, seed 777, our standard args incl. `--cuda-malloc`):

| config | first | warm avg | vs baseline |
|---|---|---|---|
| baseline, no triton | 40.89s | 20.34s | — |
| triton installed, compile OFF | 30.90s | 20.16s | ~0% — **install alone costs nothing** |
| **`guard_filter_fn`** | 40.30s | **19.11s** | **−5.2% faster** |
| `max-autotune-no-cudagraphs` | 176.81s | 24.66s | **+22% SLOWER — do not use** |

**If ever reinstalled:** the accordion is opt-in per generation; default `"Automatic"` = no
change. `guard_filter_fn` is the only preset that wins here, and it's **not a free default**:
- ~20 s one-time compile, repaid at ~1 s/gen → **break-even ≈ 19 generations** at a *fixed*
  resolution/batch. It recompiles when resolution or batch size changes, so a varied-resolution
  session can be net-negative. Worth it for long batches at one size; not otherwise.
- `max-autotune` / `reduce-overhead` are hard-refused with `--cuda-malloc` (`compile.py:93`).
  **Don't drop `--cuda-malloc` to chase them** — inductor logs *"Not enough SMs to use
  max_autotune_gemm mode"* on the 4060 Ti (34 SMs), so max-autotune can't pay off here anyway.

⚠ `--disable-triton-backend` is **not** a master switch — it only controls Path A. Path B
ignores it. To truly disable triton, uninstall the package.

## Video (Wan) — current status
- **Wan 2.2 5B TI2V is NOT supported** by Forge Neo (14B only, per upstream). The old
  5B GGUF and its `wan2.2_vae.safetensors` were **deleted 2026-07-01** (confirmed failing:
  "cannot reshape array..."). The old `umt5_xxl` on G: was also a **truncated download**
  (1.9 GB of 6.74 GB) and was replaced with the full Comfy-Org file.
- Current working set (installed 2026-07-01): `Wan2.2-T2V-A14B-{High,Low}Noise-Q4_K_M.gguf`
  on `G:\Wan\checkpoints` + `models/VAE/VAE Wan 2.1 (Wan video).safetensors` + fixed
  `G:\Wan\text_encoders\TE UMT5-XXL (Wan).safetensors` (ex `umt5_xxl_fp8_e4m3fn_scaled`).
  Select `wan` preset; HighNoise as checkpoint, LowNoise via the **Refiner** accordion
  (`refiner_checkpoint`, switch_at ≈ **0.875** for T2V / 0.9 for I2V — Forge's own UI
  tooltip gives these values; `show_refiner` must be `true` in config.json for the
  accordion to appear at all). **Frames = Batch size** (video when > 4;
  rounded to 4n+1). Heavy on 16 GB — expect minutes per clip, not a daily driver.
