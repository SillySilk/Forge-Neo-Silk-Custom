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
::  --bnb                : bitsandbytes (nf4/fp4 quant support).
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
set COMMANDLINE_ARGS=--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --bnb --nunchaku --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS" --ckpt-dirs "G:\Wan\checkpoints" --text-encoder-dirs "G:\Wan\text_encoders" --reserve-vram 2
