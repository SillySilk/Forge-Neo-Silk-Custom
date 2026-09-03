@echo off
:: ACTIVE LAUNCHER (not webui-user.bat, which is gitignored/unused). Edit args here.
::
:: CONFIRMED-GOOD WORKING SET (2026-07-01) — Anima-primary workflow on RTX 4060 Ti 16 GB.
:: These args were arrived at by heavy trial and error; earlier theories that didn't
:: survive testing have been dropped from these notes. Treat this line as the default.
:: Only revisit via deliberate A/B testing — change one arg at a time and compare output.
::
::  --api                : enables /sdapi REST endpoints (used for headless test-driving).
::  --cuda-malloc        : CUDA async allocator.
::  --cuda-stream        : async weight offload (needed on 16 GB).
::  --pin-shared-memory  : page-locks RAM for faster offload. If other apps starve, drop it.
::  --flash              : FlashAttention.
::  --bf16-unet          : bf16 UNet compute. Fine for Anima/Z-Image (native bf16);
::                         avoid only if loading fp8/GGUF *diffusion* models it would dequantize.
::  --autotune           : cuDNN benchmark autotuning.
::  --lora-dirs "G:\LORAS"           : LoRAs live on G: (off the SSD).
::  --gradio-allowed-path "G:\LORAS" : lets the UI serve LoRA previews from G:.
::  --ckpt-dirs "G:\Wan\checkpoints"        : Wan 2.2 video checkpoints (GGUF) on G:.
::  --text-encoder-dirs "G:\Wan\text_encoders" : UMT5-XXL encoder for Wan (select via "wan" preset).
::  --nunchaku           : enables SVDQ (int4) models, e.g. Qwen-Image-Edit 2511. Auto-installs the
::                         nunchaku wheel on first boot (cu13.0/torch2.10/cp313 -> matches this venv).
::                         Additive only: it does not alter behaviour of non-SVDQ models.
::
::  --reserve-vram 2     : LOAD-BEARING, do not remove. Measured 2026-07-27 on Klein 4B
::                         (1024/20 steps): with it, text-encode 3.55s and total 24.09s;
::                         WITHOUT it, text-encode 28.34s and total 51.68s (2.1x slower).
::
:: If problems resurface, candidate knobs (re-test before trusting):
::   VAE-decode OOM       -> add --tiled-conv2d 512 (then 256/128).
:: --- Pre-launch cleanup (Silk custom, 2026-09-03) -------------------------------------
:: Stop any Forge instance already running from this install (stale, crashed, or forgotten
:: on 7861) and wait until nothing is listening on 7860, so a relaunch always lands on 7860.
:: Only python processes running this repo's launch.py are touched; the forge-neo MCP
:: server and unrelated python are left alone.
echo Closing any running Forge instance and freeing port 7860...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -like '*launch.py*' -and $_.CommandLine -like '*forge-neo*' } | ForEach-Object { Write-Host ('  stopping Forge PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; $i = 0; while (($i -lt 15) -and (netstat -ano | Select-String ':7860 .*LISTENING')) { Start-Sleep -Seconds 2; $i++ }; if ($i -ge 15) { Write-Host '  WARNING: something else still listens on 7860; Forge will pick 7861' } else { Write-Host '  port 7860 is free' }"
:: ---------------------------------------------------------------------------------------

set COMMANDLINE_ARGS=--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --nunchaku --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS" --ckpt-dirs "G:\Wan\checkpoints" --text-encoder-dirs "G:\Wan\text_encoders" --reserve-vram 2
