"""Regional LoRA math: add a LoRA's low-rank contribution only on the tokens inside its region.
No Forge imports. Add-only: the base layer runs without the LoRA and each box LoRA is added on top,
weighted per token. Copied from the Original engine's lowrank.py (which subtracts outside the region).

For a Linear layer the LoRA delta is
    delta_r(x) = ((x @ down_r^T) @ up_r^T) * scale_r
so adding LoRA r inside its region is
    out = base(x) + sum_r w_r[token] * delta_r(x)
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


def add_weighted(out: torch.Tensor, x: torch.Tensor, pairs) -> torch.Tensor:
    """In place: out += sum_r w_r * delta_r(x).
    pairs: [(LowRank, w)] with w of shape (B, L) matching x's first and second-to-last dims.
    The weight and the scale are folded into the small (..., rank) intermediate and
    accumulated with addmm_, so no full-size (..., out) temporary is allocated."""
    out_dim = out.shape[-1]
    flat_out = out.view(-1, out_dim)
    for lr, w in pairs:
        keep = (w * lr.scale).to(x.dtype)
        h = (x @ lr.down.t()) * keep.unsqueeze(-1)
        flat_out.addmm_(h.reshape(-1, h.shape[-1]), lr.up.t(), alpha=1.0)
    return out
