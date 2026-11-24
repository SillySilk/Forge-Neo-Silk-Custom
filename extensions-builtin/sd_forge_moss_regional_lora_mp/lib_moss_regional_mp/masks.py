# Ported from moonwhaler/comfyui-moonpack 0.4.0 (commit d4ce788), GPL-3.0. Changes for Forge Neo: node-free functions that return (batch, length) weights; the Forge engine owns caching and context.
"""Token masks and per-call weights for regional LoRAs on MOSS-Image. Torch only, no Forge imports."""

import torch

from . import ops

TEXT_MASKED = "masked"
TEXT_OWN = "own caption"
TEXT_GLOBAL = "global"


def to_grid_box(frac):
    """(top, left, bottom, right) fractions -> [ymin, xmin, ymax, xmax] on moonpack's 0-1000 grid."""
    top, left, bottom, right = frac
    return [top * 1000.0, left * 1000.0, bottom * 1000.0, right * 1000.0]


def geometric_masks(boxes, gh, gw, feather, skirt):
    """{item: flat mask}. Painted back to front, so the lowest item index is front-most and takes any overlap."""
    order = sorted(boxes, reverse=True)
    raw = [ops.box_mask(to_grid_box(boxes[i]), gh, gw, feather, skirt) for i in order]
    owned, _background = ops.compose_masks(raw)
    return {i: m for i, m in zip(order, owned)}


def ownership_image_masks(boxes, scores, gh, gw, feather, skirt, spill):
    """Attention-owned masks (port of node _ownership_lists). Boxes without a score keep their
    geometric mask, painted under the background."""
    n = gh * gw
    scored = [b for b in boxes if b in scores]
    mboxes = {b: to_grid_box(boxes[b]) for b in boxes}
    geo = {b: ops.box_mask(mboxes[b], gh, gw, feather, skirt) for b in scored}
    reach = {b: [1.0 if v > 0 else 0.0 for v in ops.box_mask(mboxes[b], gh, gw, 0.0, skirt + spill)]
             for b in scored}
    owned, background = ops.ownership_masks(geo, reach, {b: list(scores[b]) for b in scored}, gh, gw)
    for b in boxes:
        if b not in owned:
            m = ops.box_mask(mboxes[b], gh, gw, feather, skirt)
            owned[b] = [m[i] * background[i] for i in range(n)]
            background = [background[i] - owned[b][i] for i in range(n)]
    return owned


def entry_weight(image_mask, kind, length, hw, text_len, text_mode, span, cond_rows, batch, spans_valid,
                 like=None):
    """(batch, length) weight of one box for one module call, or None when it is all zero.

    image_mask: (hw,) tensor or None. Output takes the mask's dtype/device, else `like`'s,
    else float32 on the CPU.
    """
    if kind == ops.VEC:
        return None
    ref = image_mask if image_mask is not None else like
    dev = ref.device if ref is not None else torch.device("cpu")
    dt = ref.dtype if ref is not None else torch.float32
    text_value = 1.0 if text_mode == TEXT_GLOBAL else 0.0
    if kind == ops.TEXT:
        if text_value == 0.0:
            return None
        return torch.ones(batch, length, device=dev, dtype=dt)
    if image_mask is None:
        return None
    if kind == ops.IMAGE:
        if length != hw:
            return None
        return image_mask.view(1, hw).expand(batch, hw).clone()
    # SEQ: [image | text | in-sequence refs]
    if length < hw:  # a refs-only pass
        return None
    text = min(text_len, length - hw)
    parts = [image_mask]
    if text > 0:
        parts.append(torch.full((text,), text_value, device=dev, dtype=dt))
    if length - hw - text > 0:
        parts.append(torch.zeros(length - hw - text, device=dev, dtype=dt))
    weight = torch.cat(parts).view(1, length).expand(batch, length).clone()
    if text_mode == TEXT_OWN and span is not None and spans_valid and cond_rows:
        t0, t1 = span
        rows = torch.tensor(list(cond_rows), device=dev)
        weight[rows, hw + t0:hw + min(t1, text)] = 1.0
    return weight
