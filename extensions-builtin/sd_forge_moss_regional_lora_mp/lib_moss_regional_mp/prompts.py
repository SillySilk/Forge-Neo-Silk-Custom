"""Decides which LoRA tags in a batch's prompts become box LoRAs and which stay with Forge.
No Forge imports."""

from dataclasses import dataclass, field

from . import layout

DIFFERENT_LAYOUTS = "prompts in the batch have different layouts"


@dataclass(frozen=True)
class BoxEntry:
    item: int  # 0-based item index
    name: str
    strength: float  # tag unet multiplier (panel multiplier applied later)


@dataclass
class BatchPlan:
    entries: list[BoxEntry]
    stripped: list[str]  # same length/order as the input prompts
    skip_reason: str | None = None  # set => nothing stripped, entries == []
    global_notes: list[str] = field(default_factory=list)  # e.g. "homer: also outside the boxes, stays global"


def _signature(prompt: str, items: list[layout.Item]):
    return [(it.bbox, layout.item_lora_tags(prompt[it.start : it.end])) for it in items]


def plan_batch(prompts: list[str]) -> BatchPlan:
    parsed = [layout.parse_items(p) for p in prompts]
    if all(items is None for items in parsed):
        return BatchPlan([], list(prompts), None, [])
    if any(items is None for items in parsed) or any(_signature(p, i) != _signature(prompts[0], parsed[0]) for p, i in zip(prompts, parsed)):
        return BatchPlan([], list(prompts), DIFFERENT_LAYOUTS, [])

    prompt, items = prompts[0], parsed[0]
    outside = layout.global_loras(prompt, items)
    tags = [layout.item_lora_tags(prompt[it.start : it.end]) for it in items]

    notes, stay = [], set()
    for name in sorted(outside):
        if any(name in dict(t) for t in tags):
            notes.append(f"{name}: also outside the boxes, stays global")
            stay.add(name)
    for it, t in zip(items, tags):
        if it.bbox is None:
            for name, _ in t:
                if name not in stay:
                    notes.append(f"{name}: in an item without a box, stays global")
                    stay.add(name)

    entries = [
        BoxEntry(i, name, strength)
        for i, (it, t) in enumerate(zip(items, tags))
        if it.bbox is not None
        for name, strength in t
        if name not in stay
    ]
    take = {e.name for e in entries}
    stripped = [layout.strip_loras(p, i, take) for p, i in zip(prompts, parsed)]
    return BatchPlan(entries, stripped, None, notes)
