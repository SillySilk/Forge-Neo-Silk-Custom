"""Reads a JSON Builder layout prompt: each item's box, its LoRA tags and its exact characters.
No Forge imports.

The compiled prompt is not strict JSON (parentheses are escaped as \\( for Forge's emphasis
parser, and Extra is appended after a newline), so this is a small tolerant scanner that
records where every value starts and ends instead of calling json.loads.
"""

import re
from dataclasses import dataclass, field

# Forge's extra-network syntax (modules/extra_networks.py): <type:name[:args...]>
_NET_RE = re.compile(r"<(\w+):([^>]+)>")


@dataclass
class Item:
    start: int  # char span of the item's {...} in the prompt
    end: int
    caption: str  # raw, escapes kept
    bbox: tuple[float, float, float, float] | None  # (y1, x1, y2, x2) as written: centred pixels
    loras: list[str] = field(default_factory=list)


class _Scanner:
    def __init__(self, text: str):
        self.s = text
        self.i = 0

    def ws(self):
        while self.i < len(self.s) and self.s[self.i] in " \t\r\n":
            self.i += 1

    def value(self):
        """Returns (value, start, end). Objects are dicts of key -> (value, start, end)."""
        self.ws()
        start = self.i
        c = self.s[self.i]
        if c == "{":
            v = self.obj()
        elif c == "[":
            v = self.arr()
        elif c == '"':
            v = self.string()
        else:
            v = self.scalar()
        return v, start, self.i

    def obj(self):
        out = {}
        self.i += 1
        self.ws()
        if self.s[self.i] == "}":
            self.i += 1
            return out
        while True:
            self.ws()
            key = self.string()
            self.ws()
            if self.s[self.i] != ":":
                raise ValueError(f"expected ':' at {self.i}")
            self.i += 1
            out[key] = self.value()
            self.ws()
            c = self.s[self.i]
            self.i += 1
            if c == "}":
                return out
            if c != ",":
                raise ValueError(f"expected ',' or '}}' at {self.i - 1}")

    def arr(self):
        out = []
        self.i += 1
        self.ws()
        if self.s[self.i] == "]":
            self.i += 1
            return out
        while True:
            out.append(self.value())
            self.ws()
            c = self.s[self.i]
            self.i += 1
            if c == "]":
                return out
            if c != ",":
                raise ValueError(f"expected ',' or ']' at {self.i - 1}")

    def string(self):
        if self.s[self.i] != '"':
            raise ValueError(f"expected string at {self.i}")
        self.i += 1
        start = self.i
        while self.s[self.i] != '"':
            self.i += 2 if self.s[self.i] == "\\" else 1
        raw = self.s[start : self.i]
        self.i += 1
        return raw

    def scalar(self):
        m = re.compile(r"-?\d+(\.\d+)?([eE][-+]?\d+)?|true|false|null").match(self.s, self.i)
        if not m:
            raise ValueError(f"unexpected character at {self.i}")
        self.i = m.end()
        tok = m.group(0)
        return {"true": True, "false": False, "null": None}.get(tok, float(tok) if tok[0] in "-0123456789" else tok)


def lora_names(text: str) -> list[str]:
    names = []
    for kind, args in _NET_RE.findall(text):
        if kind == "lora":
            name = args.split(":")[0]
            if name not in names:
                names.append(name)
    return names


def parse_items(prompt: str) -> list[Item] | None:
    """The layout's items, or None when the prompt is not a JSON Builder layout."""
    start = prompt.find("{")
    if start < 0:
        return None
    sc = _Scanner(prompt)
    sc.i = start
    try:
        root, _, _ = sc.value()
    except (ValueError, IndexError):
        return None
    if not isinstance(root, dict) or "items" not in root or not isinstance(root["items"][0], list):
        return None

    items = []
    for value, s, e in root["items"][0]:
        if not isinstance(value, dict):
            return None
        caption = value["caption"][0] if "caption" in value and isinstance(value["caption"][0], str) else ""
        bbox = None
        if "bbox" in value and isinstance(value["bbox"][0], list) and len(value["bbox"][0]) == 4:
            nums = [v for v, _, _ in value["bbox"][0]]
            if all(isinstance(n, float) for n in nums):
                bbox = tuple(nums)
        items.append(Item(s, e, caption, bbox, lora_names(prompt[s:e])))
    return items


def global_loras(prompt: str, items: list[Item]) -> set[str]:
    """LoRAs mentioned anywhere outside the items (summary, Extra): those stay global."""
    outside, last = [], 0
    for it in items:
        outside.append(prompt[last : it.start])
        last = it.end
    outside.append(prompt[last:])
    return set(lora_names("".join(outside)))


def box_fraction(bbox, width: int, height: int) -> tuple[float, float, float, float]:
    """Centred (y1, x1, y2, x2) pixels -> (top, left, bottom, right) as fractions of the image.
    Inverse of compile.js centeredBox(), which subtracts floor(size / 2)."""
    y1, x1, y2, x2 = bbox
    oy, ox = height // 2, width // 2
    clamp = lambda v: min(max(v, 0.0), 1.0)  # noqa: E731
    return clamp((y1 + oy) / height), clamp((x1 + ox) / width), clamp((y2 + oy) / height), clamp((x2 + ox) / width)


def unescape_with_map(text: str) -> tuple[str, list[int]]:
    """Mirrors _comfy escape_important + unescape_important ('\\(' -> '(', '\\)' -> ')').
    Returns the text the tokenizer sees and, for every input index (plus one past the end),
    its index in that text."""
    out, index = [], []
    i = 0
    while i < len(text):
        if text[i] == "\\" and i + 1 < len(text) and text[i + 1] in "()":
            index += [len(out), len(out)]
            out.append(text[i + 1])
            i += 2
        else:
            index.append(len(out))
            out.append(text[i])
            i += 1
    index.append(len(out))
    return "".join(out), index


def token_spans(offsets: list[tuple[int, int]], char_spans: list[tuple[int, int]]) -> list[list[int]]:
    """For each char span, the indices of the tokens lying wholly inside it (a token such as '},{'
    that straddles two items belongs to neither)."""
    return [[t for t, (a, b) in enumerate(offsets) if a >= cs and b <= ce and b > a] for cs, ce in char_spans]
