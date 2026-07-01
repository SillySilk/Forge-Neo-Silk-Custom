# Z-Image ControlNet: Research, Findings & Working Solution

**Date:** 2026-03-21
**Branch:** neo
**Status:** SOLVED — working configuration found empirically

---

## Working Configuration (Use This)

| Setting | Value |
|---|---|
| Checkpoint | `z-image-turbo_fp8_scaled.safetensors` |
| VAE | `zImageTurboVAE_v10.safetensors` |
| Text encoder | `qwen_3_4b.safetensors` |
| ControlNet model | `mistoline_v10.safetensors` |
| Preprocessor | lineart_standard (or any lineart/edge preprocessor) |
| **Required package** | `comfy-kitchen` installed in the **Forge venv** (not system Python) |

**How to verify comfy-kitchen is in the right place:**
```
C:\AI\Forge\venv\Scripts\python.exe -c "import comfy_kitchen; print('OK')"
```
If it prints `OK`, you're good. If `ModuleNotFoundError`, install it:
```
C:\AI\Forge\venv\Scripts\pip.exe install comfy-kitchen
```

---

## How We Got Here

### Original Error
```
File "backend/patcher/controlnet.py", line 409, in pre_run
    controlnet_config.pop("out_channels")
KeyError: 'out_channels'
```

**Initial diagnosis:** Z-Image uses a `ZImageTransformer2DModel` (DiT/NextDiT architecture), not a UNet. The `ControlLora.pre_run()` method expects `out_channels` in the model config, which UNets have but transformers don't. Conclusion at the time: architecturally incompatible.

### What Actually Fixed It
Two things were wrong simultaneously:

1. **`comfy-kitchen` was not installed in the Forge venv.** This is required for the fp8-scaled Z-Image model to load. Without it, `using_forge_operations` with a dict-based quantization config throws `AssertionError: memory_management.ck_enabled()` before any ControlNet code even runs.

2. **`comfy-kitchen` was installed in the wrong Python environment** (system Python instead of the Forge venv). Even after the user installed it, the error persisted until it was installed directly via `venv/Scripts/pip.exe`.

Once comfy-kitchen was correctly installed, Z-Image loads via the `MixedPrecision`/`ForgeOperationsInt8` path (visible in the log as `Using MixedPrecision for Model`). This changes how `model.diffusion_model.config` is structured at the point `ControlLora.pre_run` executes — either the `out_channels` key becomes available, or the code routes through a different branch entirely.

### The Accidental Discovery
While troubleshooting, the user accidentally left `mistoline_v10.safetensors` loaded (an SDXL ControlNet, their default) when switching to Z-Image. Despite our architectural analysis saying it shouldn't work, it produced **genuine, high-quality controlled output** — the generation clearly followed the control image. The control was not a no-op.

This empirical result supersedes the architectural analysis. The ControlNet port from Forge-Nunchaku is **not needed**.

---

## Research That Was Done (For Reference)

### Compatible Z-Image ControlNet Models (Official)
These exist but turned out to be unnecessary:

| Model | HuggingFace Repo |
|---|---|
| Z-Image-Turbo-Fun-Controlnet-Union | `alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union` |
| Z-Image-Turbo-Fun-Controlnet-Union-2.1 | `alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1` |

Note: These still produced errors even after comfy-kitchen was installed. The working solution ended up being the existing mistoline model.

### Forge-Nunchaku Fork
The `ussoewwin/Stable-Diffusion-WebUI-Forge-Nunchaku` fork implements Z-Image ControlNet via a Diffsynth/model-patch approach. We investigated porting just the ControlNet code into our build. This is **no longer necessary** given the working mistoline solution.

Key reason we didn't migrate to that fork: requires Python 3.13, solo developer (3 stars), no upstream neo sync, and would require re-porting 105 commits of custom work.

---

## Deploying to Another Machine (Desktop)

1. Ensure `comfy-kitchen` is installed in that machine's Forge venv:
   ```
   <forge_path>\venv\Scripts\pip.exe install comfy-kitchen
   ```
2. Load `z-image-turbo_fp8_scaled.safetensors` as the checkpoint
3. Load `mistoline_v10.safetensors` as the ControlNet model
4. Use any lineart preprocessor
5. Generate — look for `Using MixedPrecision for Model` in the console to confirm correct load path
