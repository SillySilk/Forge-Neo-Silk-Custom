<h1 align="center">Forge-Neo-Silk-Custom</h1>

<p align="center">
A customized fork of <a href="https://github.com/Haoming02/sd-webui-forge-classic/tree/neo">Stable Diffusion WebUI Forge Neo</a> with enhanced canvas tools, ControlNet batch fixes, and workflow improvements.
</p>

---

## What is Forge Neo?

**Stable Diffusion WebUI Forge** is a platform built on top of [Automatic1111's WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) that optimizes resource management, speeds up inference, and supports the latest models. **Forge Neo** is a continuation fork by [Haoming02](https://github.com/Haoming02/sd-webui-forge-classic) focused on optimization and usability, supporting modern architectures like Flux, Wan, Qwen, and more.

> For the full feature list of Forge Neo itself, see the [upstream README](https://github.com/Haoming02/sd-webui-forge-classic/tree/neo).

This fork (**Forge-Neo-Silk-Custom**) sits on top of that — tracking the upstream `neo` branch while layering additional enhancements focused on inpainting workflow, ControlNet reliability, and daily usability.

---

## Custom Features in This Fork

### 1. Enhanced Inpaint Sketch Canvas

The built-in canvas has been significantly extended beyond upstream's improvements:

**Stamp Shape System**
- 40+ built-in shapes across categories: basic geometry, stars, arrows, comic effects (radial bursts, speed lines, concentration rings, dizzy stars), cartoon emotions, motion lines, and Western-style stamps
- Shape palette picker with fill / outline toggle
- Dual-color support: set independent fill color and stroke color for each shape
- Shapes render with an outer edge outline effect for clean visibility on any background

**Brush Enhancements**
- Brush shape toggle: circle or rectangle (`B` key)
- Brush rotation 0–360° via slider or `D` + scroll wheel
- Independent width/height controls with an aspect ratio link toggle
- Ctrl+Click straight-line drawing from the last stroke endpoint — chain multiple clicks for multi-segment lines

**Cursor & Rendering Fixes**
- Cursor preview accurately matches stamp size and rotation at all zoom levels
- Zoom-independent stamp sizing
- Fixed cursor drift and undo step accumulation

---

### 2. ControlNet Batch Processing Fix

Upstream ControlNet batch modes only processed the first image in a set. This fork fixes:

- **Folder batch mode** — all images are now processed, not just image 0
- **Upload batch (MERGE mode)** — fixed NoneType iteration error and batch freeze after first iteration
- **Memory-optimized sub-batching** — large batches are split to avoid VRAM exhaustion; configurable in `scripts/controlnet.py`:

```python
optimal_batch_size = 2  # 6-8 GB VRAM: 1-2 | 10-12 GB: 2-4 | 16+ GB: 4-6
```

---

### 3. Preprocessor Resize Fix

ControlNet preprocessors previously crashed on images with invalid or non-standard resolutions. This fork adds graceful handling for those edge cases.

---

### 4. Custom Generation Defaults

Adjusted defaults that work better for modern models out of the box:

| Setting | Upstream | This Fork |
|---|---|---|
| Denoising strength | 0.75 | 0.60 |
| Sampling steps | 20 | 30 |

---

### 5. sd-forge-couple Extension

Includes [sd-forge-couple](https://github.com/Haoming02/sd-forge-couple) with one additional feature:
- **Paste support for background images** — paste from clipboard directly into the background image input

---

## Installation

### Prerequisites

- [Git](https://git-scm.com/downloads)
- Python 3.13 (recommended) — or use [uv](https://github.com/astral-sh/uv) (see below)
- An NVIDIA GPU with CUDA support

### Steps

1. **Clone this repo**
   ```bash
   git clone --recurse-submodules https://github.com/SillySilk/Forge-Neo-Silk-Custom sd-forge-neo --branch neo
   cd sd-forge-neo
   ```
   > Extensions (adetailer, sd-forge-cleaner) are tracked as submodules. The `--recurse-submodules` flag pulls them in automatically. If you cloned without it, run `git submodule update --init` inside the folder. Note: ForgeUI-MaskEraser-Extension is bundled as regular files (not a submodule) and is included automatically.

2. **Set up Python environment**

   Recommended — using `uv` (much faster installs):
   ```bash
   uv venv venv --python 3.13 --seed
   ```
   Then add `--uv` to your launch arguments in `webui-user.bat`.

   Or standard Python:
   - Install [Python 3.13](https://www.python.org/downloads/) with "Add to PATH" checked

3. **Configure launch arguments**

   Copy `webui-user.bat` and edit the `COMMANDLINE_ARGS` line. Example for 16 GB VRAM:
   ```bat
   set COMMANDLINE_ARGS=--sage --cuda-malloc --cuda-stream --pin-shared-memory --fast-fp16 --highvram
   ```
   See the [upstream commandline docs](https://github.com/Haoming02/sd-webui-forge-classic/tree/neo#commandline) for all available flags.

4. **Launch**
   ```bash
   webui-user.bat
   ```
   The first launch installs all dependencies automatically. The browser will open when ready.

---

## AI-Assisted Installation (Recommended for Troubleshooting)

If you run into issues during installation — dependency conflicts, CUDA errors, VRAM configuration, missing packages — using an AI CLI tool to guide you through it is extremely effective. These tools can read your error output and fix problems iteratively.

**Tools that work well for this:**

- **[Claude Code](https://claude.ai/code)** (`claude` CLI) — run `claude` in the install directory and describe what you're trying to do
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — `gemini` in the terminal
- **[OpenAI Codex CLI](https://github.com/openai/codex)** — `codex` in the terminal

**Example prompt to get started:**

> "I'm trying to install a Stable Diffusion WebUI (Forge Neo) in this directory. Please help me set up a Python virtual environment, install the requirements, and get it running. My GPU is an [RTX XXXX] with [X] GB VRAM."

The AI can read files in the directory, run commands, and troubleshoot errors as they come up — far faster than searching forums manually.

---

## Documentation

- [Canvas Enhancements](docs/canvas-enhancements.md) — brush shape, rotation, straight-line drawing
- [Custom Stamp Shapes](docs/canvas-custom-shapes.md) — full shape library reference
- [Z-Image + ControlNet Guide](docs/zimage-controlnet-port.md) — working configuration for Z-Image with ControlNet

---

## Repository History

| Date | Event |
|---|---|
| 2026-03-30 | Moved to public repo: **[SillySilk/Forge-Neo-Silk-Custom](https://github.com/SillySilk/Forge-Neo-Silk-Custom)** |
| Prior | Developed under private repo: `SillySilk/sd-webui-forge-private` |

---

## Version & Sync Status

This fork may not always be on the latest upstream Forge Neo release. Merging upstream changes requires carefully resolving conflicts between our custom modifications and upstream rewrites — particularly in the canvas and ControlNet code.

**Recommended approach for updating:** Use an AI CLI tool (Claude Code, Gemini CLI, OpenAI Codex) to guide the merge process. These tools can read the conflict diffs, understand the intent of both sides, and resolve them correctly without losing custom changes. Attempting a blind merge without this assistance risks overwriting the custom features.

---

## Updating from Upstream

This fork tracks `upstream/neo` (Haoming02's repo). To pull in new upstream changes:

```bash
git fetch upstream
git log --oneline neo..upstream/neo   # preview incoming commits
git merge upstream/neo
```

The key custom files to watch for conflicts:

| File | Why |
|---|---|
| `modules_forge/forge_canvas/canvas.js` | Custom stamp/brush system |
| `modules_forge/forge_canvas/shapes.js` | Shape library |
| `extensions-builtin/sd_forge_controlnet/scripts/controlnet.py` | Batch processing fix |
| `modules/processing.py` | Custom denoising default |

When in doubt, keep the local version for canvas and ControlNet files — those are the most heavily modified.

---

## Credits

- **[lllyasviel](https://github.com/lllyasviel)** — original Stable Diffusion WebUI Forge
- **[AUTOMATIC1111](https://github.com/AUTOMATIC1111)** — original Stable Diffusion WebUI
- **[Haoming02](https://github.com/Haoming02/sd-webui-forge-classic)** — Forge Neo fork (upstream of this repo)
- **[comfyanonymous](https://github.com/comfyanonymous)**, **kijai**, **city96** — backend contributions
