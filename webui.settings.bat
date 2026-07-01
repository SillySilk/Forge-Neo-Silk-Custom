@echo off
:: ACTIVE LAUNCHER (not webui-user.bat, which is gitignored/unused). Edit args here.
::
:: These args match the June-14 known-good config (crisp Chroma) + LoRA/preview paths:
::  --pin-shared-memory : REQUIRED for matching last-night output. Removing it (with reserve-vram
::      lowered) changed the async weight-offload path and made Chroma produce different/softer images
::      for the SAME seed. Trade-off: page-locks ~45%% of RAM; manage browser video via Edge or
::      Chrome's Memory Saver + hardware-accel off.
::  --bf16-unet : Flux-family (Chroma) compute in bf16. Does NOT bloat GGUF/fp8 (storage stays native).
::  --reserve-vram 2 : last-night value; lowering to 1.5 was part of the regression.
::  --cuda-stream : async offload (needed on 16GB). --cuda-malloc : allocator.
::  --lora-dirs "G:\LORAS" : LoRAs live on G: (off the SSD). Puts G:\LORAS in
::      allowed_directories_for_previews() so /sd_extra_networks/thumb serves previews. NOT a junction.
::  --gradio-allowed-path "G:\LORAS" : allow gradio /file= serving from G:.
::
:: DO NOT remove --pin-shared-memory or --bf16-unet to fix an OOM — that breaks Chroma. For OOM:
::   reboot (clears VRAM fragmentation), use a smaller Chroma quant (Q5_K_M), or raise --reserve-vram.
:: AVOID --tiled-conv2d (it softens the VAE decode; decode only needs ~160MB anyway).
::  --ckpt-dirs "G:\Wan\checkpoints" : Wan 2.2 video checkpoints (GGUF) live on G:.
::  --text-encoder-dirs "G:\Wan\text_encoders" : UMT5-XXL encoder for Wan (separate from the Flux T5).
::      Wan VAE (wan2.2_vae.safetensors) stays in models/VAE/. Select via the "wan" UI preset.
set COMMANDLINE_ARGS=--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --bnb --lora-dirs "G:\LORAS" --gradio-allowed-path "G:\LORAS" --ckpt-dirs "G:\Wan\checkpoints" --text-encoder-dirs "G:\Wan\text_encoders"
