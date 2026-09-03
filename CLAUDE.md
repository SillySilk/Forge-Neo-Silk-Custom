# Forge Neo — Silk Custom — Project Instructions

A customized fork of Forge Neo: extra ForgeCanvas tools, ControlNet features, region
randomization, model support, and 16 GB-tuned defaults. When merging upstream, preserve
everything under **"Custom work to preserve."**

- **origin** — https://github.com/SillySilk/Forge-Neo-Silk-Custom (branch `neo`)
- **upstream** — https://github.com/Haoming02/sd-webui-forge-classic (branch `neo`)

> Pre-rewrite verbose notes are archived in `CLAUDE.archive-pre-2026-06-rewrite.md`
> (kept as a safety net; deletable once this file is trusted). That file is still present
> as of this writing, and no decision to delete it has been recorded anywhere — treat it
> as still pending, not resolved.

> This repo lives one level deeper than sibling AI projects, at `Forge_neo\forge-neo\`.
> The parent `Forge_neo\` folder also holds `forge-openai-proxy.py`, an `orphan/` dir of
> stray checkpoint files, and `_dotgit-backups/` (archived `.git` dirs from other
> extensions) — none of that is part of this repo.

---

## ⚠️ Launcher — read this first

The **active launcher is `webui.settings.bat`** (it sets `COMMANDLINE_ARGS`). It only *sets*
the args: **run `webui.bat`** (which `call`s `webui.settings.bat` first). Starting
`webui.settings.bat` on its own does nothing visible (cost 15 min on 2026-09-03).
**`webui-user.bat` is gitignored and NOT used** — editing it changes nothing. This cost
real debugging time once; always edit args in `webui.settings.bat`.

- Verify args took effect via the console line: `Launching Web UI with arguments:`.
- Arg changes need a **full process restart** — the in-app "Reload UI" does **not** re-read them.
- **Pre-launch cleanup (2026-09-03):** `webui.settings.bat` first kills any python running this
  repo's `launch.py` and waits until nothing listens on 7860, so a relaunch always lands on 7860
  instead of drifting to 7861. Verified against a live instance. Leaves the forge-neo MCP server alone.

Current confirmed-good args — **treat as the default set** (Anima-primary workflow,
re-confirmed working wonderfully 2026-07-01; heavily A/B-adjusted, so only change one
arg at a time with comparison testing):
```
--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --nunchaku --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS" --ckpt-dirs "G:\Wan\checkpoints" --text-encoder-dirs "G:\Wan\text_encoders" --reserve-vram 2
```
- **`--bf16-unet` is fine for Anima/Z-Image** — they are already native bf16, so it does
  *not* dequantize them. It is also **safe for GGUF checkpoints** (Klein/ERNIE/Krea/Wan/Qwen):
  `loader.py:448` catches `state_dict_dtype == "gguf"` *before* `override_dtype` is ever read at
  `:455`, so `--bf16-unet` cannot dequantize a GGUF UNet. Avoid it only for **fp8** models.
- **`--pin-shared-memory`** — back in the preferred set. If other apps get starved of RAM, drop it.
- **`--lora-dirs "G:\LORAS"`** — LoRAs live on the G: drive; **`--gradio-allowed-path "G:\LORAS"`** lets the UI read them.
- **`--reserve-vram 2` is load-bearing — do NOT drop it.** Measured 2026-07-27 on Klein 4B
  (1024², 20 steps): with it, text-encode cost 3.55 s; **without it, 28.34 s** and total gen
  24.09 s → 51.68 s (**2.1× slower**). Removing the reserve lets the allocator over-commit, so
  pulling the text encoder in evicts far more. The old note claiming this arg was "dropped" was
  wrong — it is in `webui.settings.bat` and must stay.
- **`--bnb` was REMOVED 2026-08-20** — upstream commit `4e94f1fd` deleted bitsandbytes support
  entirely (`backend/operations_bnb.py` gone, zero `bnb` references left). `modules/shared_cmd_options.py:13`
  uses **strict `parse_args()`**, so leaving `--bnb` in `webui.settings.bat` is a **hard launch crash**
  ("unrecognized arguments"), not a warning. No impact here: none of our models are nf4/fp4.
- **`--tiled-conv2d 512`** (→256/128) is still the knob to re-add if VAE-decode OOM resurfaces.

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
   **Gotcha (cost real time during the LoRA Tidy project):** Gradio prints that line to
   **stderr**, not stdout. A single `> tmp/run.log 2>&1` redirect still catches it, but if you
   split stdout/stderr into separate files (e.g. `-RedirectStandardOutput` /
   `-RedirectStandardError` in PowerShell), you must poll **both** files, or the ready-check
   never fires even though the server is up.
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

### sd-forge-couple — NO LONGER CUSTOM (reverted to stock upstream 2026-08-29)
The local fork was **dropped** on 2026-08-29 at the user's direction and the extension
reset clean to upstream `c7884e8`. Do **not** reintroduce any of it:
- `lib_couple/regional_anima.py` / `regional_qwen.py` / `regional_flux.py` / `lib_flux/`
  (≈1250 lines of custom regional cross-attention masking) — upstream now ships its own
  `lib_couple/anima.py`, which supersedes them.
- the "Region Blend" slider (`region_blend.py`) and mask-preset save/load
  (`mask_presets.py`, `mask_presets/`).
- "Randomize Regions" / "Lock Full-Frame Layers" / "Randomize Preset", and with them the
  **+3 `tile_funcs.py:calculate_tiles()` positional-index shift** — indices are now
  upstream's again, so the old `use_tile=15, tile_h=16, ...` note no longer applies.

The old fork is recoverable from the extensions repo tag `pre-update-2026-08-29`; the
3 saved mask presets were copied to `../_extension-backups/sd-forge-couple-customs-20260829/`.

### LoRA folder picker ⚠ (added 2026-08-25) — 5 files, 3 of them upstream's
An **"Active Lora folder"** `<select>` in the LoRA tab's control row, right next to Search.
Auto-populated with the immediate subfolders of the LoRA roots; picking one scopes the tab
(and what can be loaded) to that folder, with no restart. Every LoRA is model-specific, so a
flat list mixes Krea 2 / Anima / Klein together — `G:\LORAS` is now organised by model
(`Anima`, `krea2`, `Klein`, `controlnet`).

All edits are marked `# CUSTOM (Forge Neo)`:
- `extensions-builtin/sd_forge_lora/networks.py` — `ALL_LORA_FOLDERS`, `lora_root_dirs()`,
  `available_lora_folders()`, `active_lora_dirs()`; `process_network_files()` iterates
  `active_lora_dirs()` instead of `[shared.cmd_opts.lora_dir, *shared.cmd_opts.lora_dirs]`.
  A renamed/deleted folder falls back to all roots **with a warning**, never an empty tab.
- `extensions-builtin/sd_forge_lora/scripts/lora_script.py` — the `lora_active_dir` option.
  Upstream edits this options block; expect conflicts.
- `extensions-builtin/sd_forge_lora/ui_extra_networks_lora.py` — `create_folder_selector_html()`
  builds the `<select>`; `set_active_dir()` applies it (`run_callbacks=False`, since the
  refresh that follows re-scans anyway) and saves `config.json`.
- ⚠ `modules/ui_extra_networks.py` — base no-op `create_folder_selector_html()` /
  `set_active_dir()`, the `folder_selector` page param, and the hidden
  `{tabname}_{page}_active_dir` textbox + `_set_active_dir` button in `create_ui()`
  (mirrors the existing `_extra_refresh_internal` bridge pattern).
- ⚠ `modules/ui_extra_networks.py` — `directories_for_browsing()`, used by
  `create_tree_view_html()` and `create_dirs_view_html()` in place of
  `allowed_directories_for_previews()`. **Keep these two separate.** The latter is a
  *permission* list (gradio allowed paths at `:88`, save-preview safety at `:837`) and must
  stay wide, or previews break when the active folder changes; the former is what the folder
  chips and tree enumerate. Without this split the chip row still listed every `Anima\...`
  folder while `krea2` was selected, which defeats the whole feature.
- ⚠ `html/extra-networks-pane.html` — the `{folder_selector}` slot after the search div.
  **Any page param added here must also be added to `create_html()`'s `page_params`** or
  `.format()` raises `KeyError`.
- ⚠ `javascript/extraNetworks.js` — `extraNetworksControlFolderOnChange()`; `style.css` —
  `.extra-network-control--folder`.

Gotchas:
- **Turn `lora_preset_filter` OFF.** It compounds with the folder picker: with folder=`Anima`
  and UI Preset `krea` it hid 121 of 129 cards. The picker replaces it and needs no tagging.
  Set to `false` 2026-08-25.
- The control row is **duplicated in the DOM** (the pane copy plus the one the JS moves into
  the tab nav), so `#{tabname}_lora_folder_select` matches two elements — pre-existing for
  Search/Sort too. Use `querySelector`, not a strict single-element locator.
- Options registered by this extension never appear in the `/sdapi/v1/options` **GET** (the
  response model is built before extension options register) — pre-existing for
  `lora_preset_filter`/`sd_lora`. `POST` works, which is how this is testable headlessly.
- `config.json` is **gitignored** and is rewritten by a running Forge — never hand-edit it
  while the app is up, the edit will be silently clobbered.

Verified live 2026-08-25: picker renders in txt2img **and** img2img next to Search; switching
to `Anima` gives 129 cards, `krea2` gives 167, matching disk exactly; selection survives a
refresh; 0 tracebacks.

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
- **LTX-Video** was discarded June 2026 (never worked) — all wiring removed. Verify with a **precise**
  pattern (plain `git grep -i ltx` is NOT clean — it matches token-vocab JSON under
  `backend/huggingface/`, a `Ltxt` variable in `backend/nn/pixeldit/model.py`, and these docs):
  `git grep -iE 'ltx[-_]?video|ltxv|LTXVideo|ltx_pipeline' -- '*.py' '*.js' ':!backend/huggingface/*' ':!CLAUDE*.md'`
  should be empty.
- **Z-Image ControlNet** was removed July 2026 (no longer using Z-Image; the misto-line default
  model was gone and the port had an inert start/end-percent bug). Deleted:
  `modules_forge/supported_controlnet_zit.py`, `backend/nn/lumina_controlnet.py`, the registration
  import in `supported_controlnet.py`, the patch hooks in `backend/nn/lumina.py`, and
  `javascript/controlnet_defaults.js` (hardcoded the removed `mistoline_v10`). Z-Image *model*
  support (`backend/diffusion_engine/zimage.py`, `zit` preset) is upstream and stays.
- **ForgeCanvas modular refactor** was abandoned and deleted July 2026 (`forge_canvas/modules/`,
  `build-canvas.sh`, `REFACTORING_*.md`, `.backup` files). The live files are the monolithic
  `canvas.js` + `shapes.js` only — never run a "build" step; edit `canvas.js` directly.

### Extensions inventory — upstreams & update status (audited 2026-08-29)
`extensions/` is its own repo (`SillySilk/forge-neo-silk-extensions`), **not** part of this
one. All were brought to their upstream HEAD on **2026-08-29** (restore point: extensions-repo
tag `pre-update-2026-08-29`).

**Nested `.git` restored 2026-08-30** — every extension with an upstream now carries its own
repo, so **Forge's Extensions tab checks and applies updates itself**. Just use the tab; the
old `--git-dir=_dotgit-backups/...` dance is obsolete. (`_dotgit-backups/` is kept as a cold
archive only.)

⚠ **The updater is destructive, and four extensions are deliberately shielded from it.**
`Extension.fetch_and_reset_hard()` runs `git reset --hard origin/<branch>`
(`modules/extensions.py:219`), which erases local changes. So **ADetailer-Neo**,
**ForgeUI-MaskEraser-Extension**, **sd-civitai-browser-neo** and **sd-dynamic-prompts** sit on
a local **`silk-custom`** branch. `origin/silk-custom` does not exist → `check_updates()` hits
its `except` and reports *"unknown (remote error)"* → `can_update` stays False →
`ui_extensions.py:167` never renders the update checkbox → the reset can never fire.
**Do not move these four back onto `main`/`revamp`** — that re-arms the wipe. Take upstream
changes by rebasing `silk-custom` by hand.

Because git cannot track files inside a nested repo, those 12 directories are **gitignored**
in the extensions repo (history up to `f624332` is still there). Their local modifications are
exported to **`extensions/silk-custom-*.patch`** — the only off-machine copy, since the
`silk-custom` branches have no remote. Re-export them after changing any custom.

Verify the whole arrangement by replaying Forge's own logic — 8 should say `latest`, the 4
custom ones `unknown (remote error)`:
```python
from modules.gitpython_hack import Repo   # run from the forge-neo root with the venv python
```
First-run gotcha: GitPython's `fetch(dry_run=True)` reads `.git/FETCH_HEAD`, which `--dry-run`
never writes, so a repo that has never fetched raises `FileNotFoundError` and shows a bogus
error. One real `git fetch` in that extension fixes it permanently.

| Extension | Upstream |
|---|---|
| `--sd-webui-ar-plusplus` | altoiddealer/--sd-webui-ar-plusplus |
| `ADetailer-Neo` | Haoming02/ADetailer-Neo |
| `composer_forge_neo` | abzaloff/composer_forge_neo |
| `forge2_cleaner` | DenOfEquity/forge2_cleaner |
| `ForgeUI-MaskEraser-Extension` | MrLawli3t/ForgeUI-MaskEraser-Extension |
| `ScribeNEO` | **hirorohi03**/ScribeNEO — account renamed; the old `SiliconeShojo/ScribeNEO` URL 404s |
| `sd-dynamic-prompts` | adieyal/sd-dynamic-prompts (upstream dormant since 2024-07) |
| `sd-forge-couple` | Haoming02/sd-forge-couple |
| `sd-forge-ic-light` | Haoming02/sd-forge-ic-light |
| `sd-webui-mosaic-outpaint` | Haoming02/sd-webui-mosaic-outpaint |
| `smart-outpaint` | ruboard/smart-outpaint |
| `sd-civitai-browser-neo` | eduardoabreu81, branch `revamp` — see its own section below |

**No upstream exists** for these — don't go looking:
- `sd_forge_freeu_neo`, `sd_forge_sag_neo`, `sd_forge_perturbed_attention_neo` — local
  revivals of Forge Neo's own built-ins, deleted upstream 2025-07-28 (`05285774 "yeet"`).
  PAG is byte-identical to the deleted original; FreeU and SAG carry local edits.
- `sd-forge-emotions`, `PussyWagon` — self-authored.
- `sd-forge-cleaner` — empty leftover folder, safe to delete.
- `sd-forge-lora-tidy` — self-authored (2026-09-02). Replaces `sd-civitai-browser-neo` for
  preview fetch, trigger words and rename + in-file alias. Spec + plan in its `docs/`.
- `sd-forge-krea-regional` — self-authored (2026-09-03). Regional prompting for **Krea 2**
  (joint-attention bias over per-line prompt segments; Forge Couple can't drive Krea's
  single-stream DiT). Standalone: leave Forge Couple unchecked on Krea. Verified live: region
  swap via Boxes, 3-region Basic, CFG 3 + negative, hires pass; ~27% slower than plain (SDPA
  instead of flash while active). Region Blend > 0.4 duplicates/seams. **Regional LoRAs** (same
  day): a `<lora>` tag on a region line applies only there (subtract-outside-region on the LoRA's
  low-rank delta; Forge's merge untouched). **Painted masks** (same day): Forge Couple's mask editor
  ported (GPL-3, private) onto ForgeCanvas, plus "Use last result as background". Gotcha for any
  script holding UI state: Forge's API init calls `Script.ui()` again (`api.py init_default_script_args`),
  so cache the built components per tab or the generation reads a fresh, empty object. Spec + plans in its `docs/`.

**Local customs still carried on top of upstream** (re-apply after any update):
- **sd-dynamic-prompts**: wildcard delimiter changed `__` → `@@` (avoids LoRA-tag conflicts).
  Deliberately **kept** on 2026-08-29; upstream is dormant so there is nothing to take.
- **ADetailer-Neo**: adds a `"None"` entry to the ADetailer-checkpoint dropdown
  (`lib_adetailer/ui.py`) and treats it as unset (`scripts/adetailer.py`), so enabling
  "Use separate Checkpoint" no longer force-overrides the model. Upstream still lacks this.
- **ForgeUI-MaskEraser-Extension**: `eraserBtn.className` (upstream sets `.class`, which is
  not a DOM property — the button renders unstyled without this) plus button sizing and the
  `ERASER_IDLE_BORDER` idle outline. The ForgeCanvas shape-deselect integration that used
  `window.forgeCanvasInstances` was **removed 2026-08-29 at the user's direction** — do not
  reintroduce it. (`canvas.js` still exports the registry; other things may use it.)

### sd-civitai-browser-neo ⚠ — tracked in `SillySilk/forge-neo-silk-extensions`, NOT here
> **DISABLED 2026-09-02** in `config.json` (`disabled_extensions`), superseded by
> `sd-forge-lora-tidy`. Kept on disk with its `silk-custom` branch and patch; do not delete.

Upstream is **[eduardoabreu81/sd-civitai-browser-neo](https://github.com/eduardoabreu81/sd-civitai-browser-neo)**
(fork of BlafKing's archived `sd-civitai-browser-plus`). Its `main` is frozen at v0.9.0;
**all development happens on the `revamp` branch** — that's what we track. Remote `ext-upstream`
is already configured. The extension lives in a *subdirectory* of the extensions repo, so
updating is a snapshot sync (`git rm -r` + `git read-tree --prefix=`), **not** `git pull`.

Synced **2026-08-29** to `revamp` @ `f9ef12b` (24 commits past the previous `04996798`).
Re-apply the item below on every upstream sync — a plain re-sync silently reverts it:

1. ~~**`--lora-dirs` support**~~ — **NOW UPSTREAM, do not re-apply.**
   **[PR #3](https://github.com/eduardoabreu81/sd-civitai-browser-neo/pull/3)** was merged
   upstream at `634a77b` (2026-08-19), and `8ee7019` extended the same fix to `--vae-dirs`.
   On the 2026-08-29 sync the old local hunk conflicted with the merged version in
   `resolve_path`; **upstream's was kept** (it is strictly better — it also covers VAE).
   If a future sync ever loses it, the symptom is downloads ignoring `G:\LORAS` and landing
   in `models/Lora`, because Forge Neo's `--ckpt-dirs`/`--lora-dirs`/`--text-encoder-dirs`
   are argparse `action="append"` **lists** and `Path(list)` raises `TypeError`.
2. **Security hardening** (commit `bb6b76b`, in the **private** `forge-neo-silk-extensions`
   repo) — from a 2026-07-26 audit, all verified against a running install. Touches: aria2
   RPC binding/secret, third-party request headers, archive extraction, HTML escaping, TLS
   verification, URL host matching, and delete safety.

   > **Details are deliberately omitted from this public file** pending upstream disclosure
   > (emailed to the maintainer 2026-07-26). Do not open a public issue/PR or expand this
   > section until the maintainer ships a fix. Full write-up lives in commit `bb6b76b` and
   > the private repo.

> Verify after any sync: `grep -c "rpc-listen-all=false" scripts/civitai_download.py` (→1),
> `grep -c "no_api=True" scripts/browser_sources/*.py` (→6 across 4 files),
> `grep -c "lora_dirs" scripts/civitai_api.py` (→**7** since the upstream merge; was 3), and
> `grep -rE '^\s*except:\s*$' scripts/` should be empty. Ships its own suite: run each
> `tests/*.py` directly with the venv python (stdlib `unittest`, no pytest, no
> `tests/__init__.py`) — **220 tests** should pass (158 before the 2026-08-29 sync).

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
  | Flux.2-Klein 4B (Q8 GGUF) | `klein` | `VAE Flux2 (Klein + ERNIE)` | **`TE Qwen3-4B heretic Q8 (Z-Image + Klein).gguf`** — see "GGUF text encoders" below |
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
- **GGUF text encoders are supported — and are a big win for Klein** (verified 2026-07-27).
  A `.gguf` TE dropped in `models/text_encoder/` appears in the additional-modules dropdown
  (`main_entry.py:98`), gets llama.cpp→HF key remapping (`loader_gguf.py:46-72`, the `blk.*`
  branch), and routes on hidden size to `qwen3_06b/4b/8b` (`loader.py:742-746`).
  **Klein 4B now uses `TE Qwen3-4B heretic Q8 (Z-Image + Klein).gguf`** (4.28 GB, from
  [LuffyTheFox/Qwen3-Uncensored-TextEncoders-Klein-Z-Image-Anima-GGUF](https://huggingface.co/LuffyTheFox/Qwen3-Uncensored-TextEncoders-Klein-Z-Image-Anima-GGUF),
  Heretic-abliterated) instead of the 7.49 GB bf16 safetensors. Measured, 1024², same session:

  | Klein 4B Q8 | 8 steps (native) | 20 steps | text-encode cost |
  |---|---|---|---|
  | bf16 TE 7.49 GB | 13.78 s | 24.09 s | 3.55–5.25 s (14.7–38.1%) |
  | **Q8 GGUF TE 4.28 GB** | **8.70 s** | **20.66 s** | **0.15–0.18 s (0.7–2.0%)** |

  **~37% faster at Klein's native 8 steps.** The mechanism is a *threshold*, not linear byte
  scaling: at 7.49 GB the TE cannot stay resident beside the UNet, so every prompt change
  triggers `Unloaded partially` / `Moving model(s)` thrash cycles; at 4.28 GB both fit and the
  thrash lines vanish from the log entirely (`grep -c "Unloaded partially"` → **0**). Sampling
  speed is unchanged (cached-prompt runs 20.54 s vs 20.51 s), confirming the per-forward
  dequant in `ForgeOperationsGGUF.Linear.forward` (`operations.py:441`) costs nothing here —
  the TE runs **once** per generation (`processing.py:977`, outside the sampling loop), and a
  repeated prompt hits the class-level conditioning cache and skips it entirely.
  - Text-encode cost is **weight movement, not compute** — a 400-token prompt and `"a cat"`
    timed identically (5.36 s vs 5.34 s). So the fix is always *fit it in VRAM*, not *shrink the prompt*.
  - **Anima has nothing to gain** — its 1.11 GB TE is already only ~1.1% of a generation.
  - The repo's **`Qwen3-VL-4B` file will NOT work for Krea 2**: 398 tensors, zero `v.*`/`mm.*`
    vision tensors (llama.cpp splits vision into a separate `mmproj` that repo lacks). Krea is
    detected via `model.visual.deepstack_merger_list.0.norm.weight` (`loader.py:731`); without
    it the file misroutes to the plain `qwen3_4b` slot. Its README also admits it is vanilla, not
    uncensored. The `Qwen3-8B` file targets **Klein 9B**, which we do not have.
  - `zit` (Z-Image) still points at the old bf16 safetensors — deliberately left alone since
    Z-Image is not in use; that file is also the fallback, so **do not delete it**.
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
   no LTX-Video wiring (use the **precise** grep from the LTX-Video note
   above — not plain `git grep -i ltx`), ERNIE = upstream only,
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

9. Latest merge: **2026-08-20** — upstream/neo, **39 commits**, `2.27-70` → **`2.28.1-10-ge782dc3f`**
   (crosses new tags **2.28** and **2.28.1**). Only **2 conflicts**: README (kept ours) and
   `modules/processing.py` (see below). `canvas.js`, forge-couple, and the ControlNet UI were
   **untouched by upstream** in this range — no hand-merge needed. All 8 canvas markers verified
   (1988 lines vs upstream 857); 62 changed .py files compile clean; LTX/ERNIE greps empty.
   - **`modules/processing.py` conflict — recurring, now resolved in upstream's idiom.** Upstream
     rewrote the hires-modules guard as `"Use same choices" not in (getattr(self, "hr_additional_modules", []) or [])`.
     That **enters** the branch when the attr is None (its dataclass default) and passes None to
     `main_entry.modules_change()` → `for v in None` → **TypeError**. Our guard skips instead. Kept ours,
     rewritten as a walrus + marked `# CUSTOM (Forge Neo)` so it stops conflicting every merge.
   - **4 backend modules DELETED** (folded into comfy-kitchen): `backend/float.py`,
     `operations_bnb.py`, `operations_triton.py`, `quant_rotation.py`. This makes the
     **comfy-kitchen bump mandatory**, not optional.
   - **Dependency bumps (10):** comfy-kitchen 0.2.22→**0.2.31**, opencv-python 4.11→**5.0.0.93** (major),
     httpx 0.24.1→0.28.1, GitPython 3.1.52→3.1.57, lark 1.2.2→1.3.1, omegaconf 2.2.3→2.3.1,
     psutil 6.1.1→7.2.2, pillow-heif 1.4.0→1.5.0, tqdm 4.67.3→4.70.0; `setuptools` dropped.
   - **Also fixed (not upstream):** `requests` 2.32.5 → **2.34.2** kills the boot-time
     `RequestsDependencyWarning`. Cause is **chardet, not urllib3**: requests 2.32 asserts
     `3.0.2 <= chardet < 6.0.0`, and `ZipUnicode` pulls **chardet 7.4.3**; since chardet is present,
     requests checks it and never looks at the valid `charset_normalizer`. `requests` is transitive
     (not in `requirements.txt`), so this won't fight future merges.
   - **Verified live:** Krea 2 GGUF txt2img 768×1024 via `/sdapi/v1/txt2img`; **0 tracebacks**.
   - Upstream also notes our **PyTorch 2.10.0+cu130 is now flagged "outdated"** at boot. Not acted on.

## Krea 2 — Reference / Edit / "ControlNet" (tested 2026-08-20)

Krea 2 has **no classic ControlNet** and never will via the ControlNet tab. All Krea 2 "control"
is **LoRA + reference-image conditioning**, which upstream added 2026-07-31 (`7c866142 Krea 2 Edit`,
`0dc18e4f vision`, `c80bb048 ref_latents`).

**The switch you will forget:** Settings → **`krea2_do_reference`** ("[Krea2] Enable Reference"),
**default OFF**. With it off, ImageStitch encodes nothing and reference images are silently ignored
— generations come out byte-identical to no-reference runs. Gated in **two** places:
`backend/diffusion_engine/krea.py:55` and `:103`. Its tooltip warns *"enable Edit ; disable img2img"*
— while ON, `encode_first_stage` diverts the img2img init image into `ref_latents`, so **img2img
breaks**. Pin it to Quicksettings if toggling often. Left **OFF** after testing.

**How to actually use it** (txt2img): set `krea2_do_reference` ON → put the control/reference image
in the **ImageStitch Integrated** accordion (*not* the ControlNet tab) → load the matching edit LoRA.
API: `alwayson_scripts: {"ImageStitch Integrated": {"args": [true, [<b64>], 1024]}}`.

**The base checkpoint cannot edit or pose on its own** — an edit-trained LoRA is mandatory. Verified:
with a DWPose skeleton as reference and no LoRA, Krea 2 just *reproduced the skeleton* as glowing
neon lines over the figure (it preserves the reference, as Edit models do).

| LoRA | What it is | Status here |
|---|---|---|
| [thedeoxen/Krea-2-pose-controlnet](https://huggingface.co/thedeoxen/Krea-2-pose-controlnet) | OpenPose, edit-arch LoRA, 228 MB | **Installed** → `G:\LORAS\controlnet\`. Pose control **confirmed working**. |
| [Patil/Krea-2-depth-controlnet](https://huggingface.co/Patil/Krea-2-depth-controlnet) | Depth, 862 MB, **channel-concat** (token 64→128 via expanded input projection) | **Will NOT work** — Forge feeds 64-dim tokens straight to `SingleStreamDiT.first`; nothing concatenates a control latent. `pad_weight` exists (`backend/patcher/lora.py:100`) but is never set, so it would log `SHAPE MISMATCH ... WEIGHT NOT MERGED`. Needs ~20 lines in `backend/nn/krea.py`. |
| [Krea 2 Identity Edit](https://civitai.com/models/2761113/krea-2-identity-edit) | Identity-preserving image edit | Not downloaded. This is what upstream's README means by "requires specific LoRA". |

No canny / lineart / tile weights are published yet (the training recipe is control-type agnostic,
so they are possible — nobody has released them).

⚠ **Open quality issue — reference path degrades output.** Pose *structure* transfers correctly, but
images generated **with** a reference show heavy dark mottling and skeleton colour bleed; the same
prompt + LoRA **without** a reference is pristine. So the LoRA is fine — the fault is in the reference
conditioning. Prime suspect: `qwen3vl_engine.py` prepends bare `<|vision_start|>` blocks into the
"Describe the image…" system template, whereas ostris's nodes use Krea's own template with
**`Picture N:`** labels *as the LoRAs were trained*. Untested hypothesis — do not treat as diagnosed.

---

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
