# CUSTOM (Forge Neo): detect which UI Preset a checkpoint belongs to, so the Checkpoint dropdown
# can list only the models of the selected preset. Detection reuses huggingface_guess on tensor
# shapes read from the file header (no weights are loaded), so a full scan takes about a second.

import json
import logging
import os
import struct

import torch

logger = logging.getLogger(__name__)

# huggingface_guess model class -> PresetArch name
_CLASS_TO_PRESET: dict[str, str] = {
    "SD15": "sd",
    "SDXL": "xl",
    "SDXLRefiner": "xl",
    "Mugen": "xl",
    "Flux": "flux",
    "FluxSchnell": "flux",
    "Chroma": "flux",
    "Flux2K4B": "klein",
    "Flux2K9B": "klein",
    "Lumina2": "lumina",
    "ZImage": "zit",
    "Anima": "anima",
    "WAN21_T2V": "wan",
    "WAN21_I2V": "wan",
    "QwenImage": "qwen",
    "QwenImage21": "qwen21",
    "MOSSImage": "moss",
    "Krea2": "krea",
    "ErnieImage": "ernie",
    "PiD": "pid",
}

_DTYPES = {
    "F64": torch.float64,
    "F32": torch.float32,
    "F16": torch.float16,
    "BF16": torch.bfloat16,
    "F8_E4M3": torch.float8_e4m3fn,
    "F8_E5M2": torch.float8_e5m2,
    "I64": torch.int64,
    "I32": torch.int32,
    "I16": torch.int16,
    "I8": torch.int8,
    "U8": torch.uint8,
    "BOOL": torch.bool,
}

# (path, size, mtime) -> preset name, or None when the file could not be recognized
_cache: dict[tuple[str, int, float], str | None] = {}


def _meta_state_dict(path: str) -> dict[str, torch.Tensor]:
    if path.lower().endswith(".gguf"):
        import gguf

        reader = gguf.GGUFReader(path)
        return {str(t.name): torch.empty(tuple(int(v) for v in reversed(t.shape)), device="meta") for t in reader.tensors}

    with open(path, "rb") as f:
        header = json.loads(f.read(struct.unpack("<Q", f.read(8))[0]))
    header.pop("__metadata__", None)
    return {k: torch.empty(v["shape"], dtype=_DTYPES.get(v["dtype"], torch.uint8), device="meta") for k, v in header.items()}


def _detect(path: str) -> str | None:
    import huggingface_guess

    from backend.loader import convert_diffusers_mmdit, preprocess_state_dict

    sd = _meta_state_dict(path)
    try:
        guess = huggingface_guess.guess(preprocess_state_dict(sd))
    except ModuleNotFoundError:
        if (sd := convert_diffusers_mmdit(sd, "")) is None:
            return None
        guess = huggingface_guess.guess(preprocess_state_dict(sd))
    return _CLASS_TO_PRESET.get(type(guess).__name__)


def preset_of(path: str) -> str | None:
    """the PresetArch name a checkpoint belongs to; `None` if it could not be recognized"""
    if not path.lower().endswith((".safetensors", ".sft", ".gguf")):
        return None
    try:
        stat = os.stat(path)
    except OSError:
        return None

    key = (path, stat.st_size, stat.st_mtime)
    if key not in _cache:
        try:
            _cache[key] = _detect(path)
        except Exception as e:
            logger.warning(f'Could not detect the model type of "{os.path.basename(path)}" ({type(e).__name__}: {e}); listing it under every preset')
            _cache[key] = None
    return _cache[key]
