# Forge Neo (Silk Custom) — setup guide for Claude Code

**For the person:** open Claude Code in an empty folder where you want Forge installed
(for example `C:\AI`), paste this whole file into the chat (or give it this file's
GitHub link), and say *"Follow this guide and set everything up."* It takes a while,
mostly because of downloads (about **30 GB** in total).

Before starting, you need:
- an NVIDIA GPU with 16 GB (this setup is tuned for an RTX 4060 Ti 16 GB) and 32 GB RAM;
- a **GitHub account that has been added as a collaborator** on
  `SillySilk/forge-neo-silk-extensions` (it's private — accept the invite email first);
- a free **Civitai account** (some downloads need an API key from it, see step 5).

---

## Instructions for Claude Code

You are setting up a customized Stable Diffusion WebUI ("Forge Neo — Silk Custom") on a
Windows 11 PC. Work through the steps in order. Verify each step before moving on; if one
fails, fix the cause rather than skipping it. Use PowerShell for Windows commands
(`taskkill /PID` does not work from Git Bash). Explain progress to the user in short,
non-technical sentences.

Let `ROOT` = the folder Claude Code was opened in. Forge will live in `ROOT\forge-neo`.

### 1. Prerequisites

Check each, install what's missing (`winget` is fine), and confirm versions:

| Need | Check | Notes |
|---|---|---|
| Git | `git --version` | `winget install Git.Git` |
| GitHub CLI | `gh --version` | `winget install GitHub.cli`, then have the user run `! gh auth login` |
| Python **3.13** (64-bit) | `py -3.13 --version` | `winget install Python.Python.3.13`. Must be 3.13 — the GPU packages are built for it. |
| NVIDIA driver | `nvidia-smi` | Driver must support **CUDA 13** (the "CUDA Version" in `nvidia-smi` must read 13.0 or higher). If not, ask the user to update from nvidia.com. |
| Free disk | ~60 GB on the target drive | Models ~30 GB + Python environment ~15 GB. |

Turn on long file paths for git, or `sd-dynamic-prompts` fails to check out
("Filename too long"): `git config --global core.longpaths true`

Confirm the GitHub account can see the private repo:
`gh repo view SillySilk/forge-neo-silk-extensions` — if it says "not found", the
collaborator invite hasn't been accepted yet. Stop and tell the user.

### 2. Clone Forge

```powershell
cd ROOT
git clone https://github.com/SillySilk/Forge-Neo-Silk-Custom.git forge-neo
cd forge-neo
git checkout neo
```

### 3. Clone the extensions

The `extensions` folder is its own private repo. Clone it **into** `forge-neo\extensions`:

```powershell
cd ROOT\forge-neo
git clone https://github.com/SillySilk/forge-neo-silk-extensions.git extensions
```

That repo contains only the self-made extensions plus four `silk-custom-*.patch` files.
The third-party extensions are cloned separately, from inside `forge-neo\extensions`:

```powershell
cd ROOT\forge-neo\extensions
git clone https://github.com/altoiddealer/--sd-webui-ar-plusplus
git clone https://github.com/Haoming02/ADetailer-Neo
git clone https://github.com/MrLawli3t/ForgeUI-MaskEraser-Extension
git clone https://github.com/DenOfEquity/forge2_cleaner
git clone https://github.com/aoleg/neo-krea2-conditioning
git clone -b revamp https://github.com/eduardoabreu81/sd-civitai-browser-neo
git clone https://github.com/adieyal/sd-dynamic-prompts
git clone -b krea2-lora https://github.com/SillySilk/sd-forge-couple
git clone https://github.com/zeydsama/sd-forge-prompt-save
git clone https://github.com/eduardoabreu81/sd-webui-merge-studio
git clone https://github.com/kainatquaderee/sd-webui-reactor-Nsfw_freedom
git clone https://github.com/ruboard/smart-outpaint
```

(`--sd-webui-ar-plusplus` really starts with two dashes; quote it if the shell complains.)

**Apply the custom patches.** Four extensions carry local changes. Each patch was made
against a specific upstream commit, so start a local branch named `silk-custom` **at that
commit** and apply the patch there (upstream keeps moving, and a patch may stop applying to
its newest version). The branch name matters too: it stops Forge's Extensions
tab from wiping the changes on update.

```powershell
cd ROOT\forge-neo\extensions
$bases = @{
  'ADetailer-Neo'                = 'af228eba7a'
  'ForgeUI-MaskEraser-Extension' = '3f378b39f7'
  'sd-civitai-browser-neo'       = 'f9ef12b64c'
  'sd-dynamic-prompts'           = 'de056ff8d8'
}
foreach ($e in $bases.Keys) {
  git -C $e checkout -b silk-custom $bases[$e]
  git -C $e apply --ignore-whitespace "..\silk-custom-$e.patch"
  git -C $e -c user.name=setup -c user.email=setup@local commit -am "silk: local customs"
}
```

All four were tested to apply cleanly this way. Confirm each with
`git -C <ext> log --oneline -2` (top commit "silk: local customs").

What the patches do (so you can sanity-check the result):
- `sd-dynamic-prompts` — wildcard delimiter is `@@` instead of `__`.
- `ADetailer-Neo` — adds a "None" option to the ADetailer checkpoint dropdown.
- `ForgeUI-MaskEraser-Extension` — fixes the eraser button styling.
- `sd-civitai-browser-neo` — security hardening, and the preview downloader skips models
  that already have a preview.

**ReActor fix** (one line, not in a patch). In
`extensions\sd-webui-reactor-Nsfw_freedom\install.py`, find
`if not is_installed(ort,"1.17.1",True):` and change `True` to `False`. Without this,
ReActor uninstalls the GPU onnxruntime on every start (no 1.17.1 build exists for Python 3.13).

### 4. Folders and launch settings

Create the model folders the guide uses (Forge also creates them on first run):

```powershell
cd ROOT\forge-neo
New-Item -ItemType Directory -Force models\Stable-diffusion, models\text_encoder, models\VAE, models\Lora
```

Edit **`webui.settings.bat`** — this is the file that holds the launch settings
(`webui-user.bat` is NOT used). Replace the `set COMMANDLINE_ARGS=` line with:

```
set COMMANDLINE_ARGS=--api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --reserve-vram 2 --onnxruntime-gpu
```

The original line points at `G:\` drives that only exist on the owner's PC, so they are
removed. LoRAs go in `models\Lora`. Keep `--reserve-vram 2` — removing it made generation
about 2× slower in testing.

### 5. Download the models

All downloads go into `ROOT\forge-neo\models\...` with the **exact target filenames below**
(the names tell the user which file pairs with which model). Use `curl.exe -L --ssl-no-revoke`
(on some Windows setups, Python-based downloaders fail with certificate errors).

**Civitai needs an API key.** These models are age-restricted, so anonymous downloads get
an error page instead of the file. Ask the user to create one at
https://civitai.com/user/account → *API Keys*, and append `&token=<KEY>` to Civitai URLs
(or use `?token=` if the URL has no `?`). Do not save the key in any file in the repo.

After each download, **check the size** (and SHA-256 where given) — a few-KB file means
you got an error page, not the model.

#### Krea 2 (main model)

| Target file | Source | Size | SHA-256 |
|---|---|---|---|
| `models\Stable-diffusion\eventHorizon_krea2V10.safetensors` | https://civitai.com/api/download/models/3104333?fileId=2984443 | 14,034,377,942 B | `7CCEE362F539DF3F059A17FC558BC39606CCC4DD377D033E4879ACD29C37256F` |
| `models\text_encoder\TE Krea2-Engineer-V1 fp8_scaled (Krea 2).safetensors` | https://huggingface.co/AX1Y2JP/Krea-2-Engineer-V1-fp8/resolve/main/Krea2-Engineer-V1-fp8_scaled.safetensors | 5,242,458,644 B | `AC6BE5C901D05029DA1B30600413D64B76C21700E90EB1A89BC2D68CFB99B956` |
| `models\VAE\VAE Qwen (Anima + PiD).safetensors` | https://civitai.com/api/download/models/3104333?fileId=2984118 | 253,806,246 B | `A70580F0213E67967EE9C95F05BB400E8FB08307E017A924BF3441223E023D1F` |

Settings: **6–8 steps, CFG 1, sampler ER SDE, scheduler Simple**.

#### Anima (anime model)

| Target file | Source | Size | SHA-256 |
|---|---|---|---|
| `models\Stable-diffusion\perfectrsbmixAnimaAIO_lambda.safetensors` | https://civitai.com/api/download/models/3074519?fileId=2961980 | 4,182,232,496 B | `3C8CAFCD9B3722A4C7C1610E0A5BD8DF3F179DFFC511D9151FB66E4EFE6EB1D3` |
| `models\text_encoder\TE Qwen3-0.6B base (Anima).safetensors` | https://civitai.com/api/download/models/2698710 | 1,192,135,096 B | `CD2A512003E2F9F3CD3C32A9C3573F820BB28C940F73C57B1DDAA983D9223EBA` |
| VAE | *same `VAE Qwen (Anima + PiD).safetensors` as Krea 2 — don't download twice* | | |

Make sure the Anima checkpoint is the **4.18 GB** file (fileId 2961980), not the 5.5 GB
all-in-one on the same page.

Settings: **~32 steps, CFG 4, sampler ER SDE, scheduler Beta, 1280×1280**.

### 6. First launch

Launch for the user by double-clicking **`webui.bat`** in `forge-neo` (it reads
`webui.settings.bat` itself). The first run creates the Python environment and installs
PyTorch and everything else — it can take 15–30 minutes. It's ready when the console prints
`Startup time:` and the browser opens `http://127.0.0.1:7860`.

If you launch it yourself from Claude Code instead, **don't run `webui.bat` from your
shell** — Claude Code's shell environment makes its call to `webui.settings.bat` fail
silently, so Forge starts with no settings. Instead, after `webui.bat` has created `venv`
once, run headless with the args written out in full:

```powershell
cd ROOT\forge-neo
venv\Scripts\python.exe launch.py --api --cuda-malloc --cuda-stream --pin-shared-memory --flash --bf16-unet --autotune --reserve-vram 2 --onnxruntime-gpu *> tmp\run.log
```

Wait for `Startup time:` in `tmp\run.log` (not just "Running on local URL" — the API isn't
ready until then), and read the log for tracebacks.

### 7. Wire the model presets

Forge has a **UI preset** dropdown at the top-left (`krea`, `anima`, …). Each preset
remembers its checkpoint plus the text encoder and VAE ("additional modules") to load.
Fill those in once:

1. **Stop Forge first** (it rewrites `config.json` while running and would overwrite your
   edit).
2. In `ROOT\forge-neo\config.json`, set these keys, using **absolute paths** for this PC:

```json
"forge_preset": "krea",
"forge_checkpoint_krea": "eventHorizon_krea2V10.safetensors",
"forge_additional_modules_krea": [
  "ROOT\\forge-neo\\models\\VAE\\VAE Qwen (Anima + PiD).safetensors",
  "ROOT\\forge-neo\\models\\text_encoder\\TE Krea2-Engineer-V1 fp8_scaled (Krea 2).safetensors"
],
"forge_checkpoint_anima": "perfectrsbmixAnimaAIO_lambda.safetensors",
"forge_additional_modules_anima": [
  "ROOT\\forge-neo\\models\\VAE\\VAE Qwen (Anima + PiD).safetensors",
  "ROOT\\forge-neo\\models\\text_encoder\\TE Qwen3-0.6B base (Anima).safetensors"
],
"krea_t2i_step": 8, "krea_t2i_cfg": 1, "krea_t2i_sampler": "ER SDE", "krea_t2i_scheduler": "Simple",
"anima_t2i_step": 32, "anima_t2i_cfg": 4, "anima_t2i_sampler": "ER SDE", "anima_t2i_scheduler": "Beta",
"anima_t2i_width": 1280, "anima_t2i_height": 1280
```

(Replace `ROOT` with the real path, with doubled backslashes as JSON requires. Keep any
other keys already in the file.)

3. Start Forge again.

### 8. Verify

With Forge running, generate one test image through the API for each model. The API
doesn't use the UI preset, so name the checkpoint and its modules explicitly:

```powershell
$body = @{
  prompt = "a red fox sitting in a snowy forest, photo"; width = 512; height = 512
  steps = 8; cfg_scale = 1; sampler_name = "ER SDE"; scheduler = "Simple"; seed = 777
  save_images = $true
  override_settings = @{
    sd_model_checkpoint      = "eventHorizon_krea2V10.safetensors"
    forge_additional_modules = @("VAE Qwen (Anima + PiD).safetensors", "TE Krea2-Engineer-V1 fp8_scaled (Krea 2).safetensors")
  }
} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Uri http://127.0.0.1:7860/sdapi/v1/txt2img -Method Post -ContentType 'application/json' -Body $body | Out-Null
```

Then Anima: checkpoint `perfectrsbmixAnimaAIO_lambda.safetensors`, modules
`VAE Qwen (Anima + PiD).safetensors` + `TE Qwen3-0.6B base (Anima).safetensors`, `steps` 32,
`cfg_scale` 4, `scheduler` "Beta", and an anime-style prompt. Look at the images (saved under
`outputs\txt2img-images\`): they should be clean, not noise or a solid colour. Check `tmp\run.log` (or the console) for
`Traceback`. If a generation errors with something like *"You do not have … state dict"*,
the preset loaded the wrong text encoder — recheck step 7.

Finally, open `http://127.0.0.1:7860` in the browser, pick the **krea** preset from the
top-left dropdown, and confirm the checkpoint, VAE and text encoder fields fill in by themselves.

### 9. Hand-off to the user

Tell the user, briefly:
- start Forge by double-clicking **`webui.bat`**; close the console window to stop it;
- switch models with the **UI preset** dropdown (top-left), *not* the checkpoint dropdown —
  the preset also swaps in the matching text encoder and VAE;
- **Krea 2**: 6–8 steps, CFG 1. **Anima**: ~32 steps, CFG 4;
- LoRAs go in `forge-neo\models\Lora` (a LoRA only works with the model family it was made for);
- update extensions from the **Extensions** tab. The four `silk-custom` ones will show
  "unknown" for updates; that's intentional, so their custom changes don't get wiped.
