"""Regional LoRA math: subtract a LoRA's low-rank contribution from the tokens outside its region.
No Forge imports. Ported from the Forge Couple fork's Krea 2 engine (lib_couple/krea_lora.py),
extended to per-row weights because MOSS can run cond and uncond rows in one batch.

Forge merges every LoRA into the weights. For a Linear layer the merged output is
    full(x) = base(x) + sum_r delta_r(x),   delta_r(x) = ((x @ down_r^T) @ up_r^T) * scale_r
so removing LoRA r from the tokens outside its region is
    out = full(x) - (1 - w_r[token]) * delta_r(x)
"""

from dataclasses import dataclass

import torch


@dataclass
class LowRank:
    up: torch.Tensor  # (out, rank)
    down: torch.Tensor  # (rank, in)
    scale: float  # strength * alpha / rank

    def to(self, device, dtype) -> "LowRank":
        return LowRank(self.up.to(device=device, dtype=dtype), self.down.to(device=device, dtype=dtype), self.scale)


def extract_lowrank(weights, strength: float):
    """weights = (up, down, alpha, mid, dora_scale, reshape) as stored by Forge's LoRAAdapter.
    Returns None for anything that is not a plain 2-D LoRA."""
    up, down, alpha, mid, dora_scale, reshape = weights
    if mid is not None or dora_scale is not None or reshape is not None:
        return None
    if up.dim() != 2 or down.dim() != 2:
        return None
    rank = down.shape[0]
    a = (float(alpha) / rank) if alpha is not None else 1.0
    return LowRank(up, down, float(strength) * a)


def lowrank_delta(x: torch.Tensor, lr: LowRank) -> torch.Tensor:
    return ((x @ lr.down.t()) @ lr.up.t()) * lr.scale


def subtract_outside(full_out: torch.Tensor, x: torch.Tensor, pairs) -> torch.Tensor:
    """In place: full_out -= sum_r (1 - w_r) * delta_r(x).
    pairs: [(LowRank, w)] with w of shape (B, L) matching x's first and second-to-last dims.
    The (1 - w) factor and the scale are folded into the small (..., rank) intermediate and
    accumulated with addmm_, so no full-size (..., out) temporary is allocated."""
    out_dim = full_out.shape[-1]
    flat_out = full_out.view(-1, out_dim)
    for lr, w in pairs:
        keep = ((1.0 - w) * lr.scale).to(x.dtype)
        h = (x @ lr.down.t()) * keep.unsqueeze(-1)
        flat_out.addmm_(h.reshape(-1, h.shape[-1]), lr.up.t(), alpha=-1.0)
    return full_out
