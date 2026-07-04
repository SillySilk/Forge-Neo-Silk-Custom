"""Auto-tag LoRA files with the Forge preset they belong to.

Reads each .safetensors header (metadata + tensor key names, no weights) to
detect the base-model architecture, then writes the result into the
"sd version" field of the per-LoRA user-metadata sidecar (<name>.json) --
the same field the card editor's "Preset" dropdown writes. With the
"Filter Lora based on selected Preset" setting enabled, the LoRA tab then
only shows LoRAs matching the active UI preset (unknown ones stay visible).

Usage:
    python tools/lora_autotag.py [DIR ...]          # dry run (default: G:\\LORAS)
    python tools/lora_autotag.py --apply [DIR ...]  # write sidecar files

Existing sidecar fields are preserved; an existing valid "sd version" is
never overwritten. Files that cannot be identified are left untagged
(= always visible in the UI).
"""

import argparse
import json
import os
import re
import struct
import sys
from collections import Counter

# Valid preset names: modules_forge/presets.py PresetArch
PRESETS = ["sd", "xl", "flux", "klein", "qwen", "lumina", "zit", "wan", "anima", "ernie", "pid", "krea"]

# kohya/OneTrainer ss_base_model_version -> preset (checked first, most reliable)
BASE_VERSION_MAP = {
    "anima": "anima",
    "ernie_image": "ernie",
    "flux2_klein_9b": "klein",
    "flux1": "flux",
    "sd_v1": "sd",
    "sd_v2": "sd",
    "sdxl_base_v1-0": "xl",
    "qwen_image": "qwen",
    "wan2_2": "wan",
}

# modelspec.architecture prefix -> preset (fallback; some trainers write wrong values,
# e.g. Anima LoRAs stamped "stable-diffusion-v1/lora", so base version wins)
MODELSPEC_MAP = [
    ("anima", "anima"),
    ("ernie", "ernie"),
    ("flux-2", "klein"),
    ("flux-1", "flux"),
    ("stable-diffusion-xl", "xl"),
    ("stable-diffusion-v1", "sd"),
    ("qwen-image", "qwen"),
    ("wan", "wan"),
]

RE_ANIMA_KEY = re.compile(r"lora_unet_blocks_\d+_(cross|self)_attn_.*_proj")
RE_ANIMA_KEY2 = re.compile(r"diffusion_model\.(llm_adapter\.|blocks\.\d+\.adaln_modulation)")
RE_ERNIE_KEY = re.compile(r"diffusion_model\.layers\.\d+\.self_attention\.")


def read_header(path: str) -> dict:
    with open(path, "rb") as f:
        length = struct.unpack("<Q", f.read(8))[0]
        if length > 128 * 1024 * 1024:
            raise ValueError(f"implausible header size {length}")
        return json.loads(f.read(length))


def classify(header: dict) -> tuple[str, str]:
    """Return (preset, reason); preset == "" when unidentified."""
    meta = header.get("__metadata__") or {}

    base = meta.get("ss_base_model_version", "")
    if base in BASE_VERSION_MAP:
        return BASE_VERSION_MAP[base], f"ss_base_model_version={base!r}"

    arch = meta.get("modelspec.architecture", "")
    for prefix, preset in MODELSPEC_MAP:
        if arch.startswith(prefix):
            return preset, f"modelspec.architecture={arch!r}"

    keys = [k for k in header if k != "__metadata__"]
    if any(RE_ANIMA_KEY.match(k) for k in keys):
        return "anima", "key pattern lora_unet_blocks_*_attn_*_proj"
    if any(RE_ANIMA_KEY2.match(k) for k in keys):
        return "anima", "key pattern diffusion_model.llm_adapter/adaln_modulation"
    if any(RE_ERNIE_KEY.match(k) for k in keys):
        return "ernie", "key pattern diffusion_model.layers.*.self_attention"

    return "", f"unrecognized (base={base!r}, arch={arch!r})"


def tag_file(path: str, preset: str, apply: bool) -> str:
    """Merge "sd version" into the sidecar json. Returns action taken."""
    sidecar = os.path.splitext(path)[0] + ".json"
    data = {}
    if os.path.exists(sidecar):
        with open(sidecar, encoding="utf8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return f"SKIP (sidecar not a dict): {sidecar}"

    current = data.get("sd version")
    if current in PRESETS:
        return f"keep existing tag {current!r}"

    data["sd version"] = preset
    if apply:
        with open(sidecar, "w", encoding="utf8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return f"tagged {preset!r}"
    return f"would tag {preset!r}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("dirs", nargs="*", default=[r"G:\LORAS"], help="LoRA directories to scan")
    parser.add_argument("--apply", action="store_true", help="write sidecar files (default: dry run)")
    args = parser.parse_args()

    stats = Counter()
    for root in args.dirs:
        if not os.path.isdir(root):
            print(f"not a directory: {root}", file=sys.stderr)
            return 1
        for dirpath, _dirs, files in os.walk(root):
            for fn in sorted(files):
                if not fn.lower().endswith(".safetensors"):
                    continue
                path = os.path.join(dirpath, fn)
                rel = os.path.relpath(path, root)
                try:
                    header = read_header(path)
                except Exception as e:
                    print(f"  ERROR   {rel}: {e}")
                    stats["error"] += 1
                    continue
                preset, reason = classify(header)
                if not preset:
                    print(f"  UNKNOWN {rel}: {reason}")
                    stats["unknown"] += 1
                    continue
                action = tag_file(path, preset, args.apply)
                print(f"  {preset:6s} {rel}  [{reason}] -> {action}")
                stats[preset if "tag" in action else "kept"] += 1

    mode = "APPLIED" if args.apply else "DRY RUN (use --apply to write)"
    print(f"\n{mode}: {dict(stats)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
