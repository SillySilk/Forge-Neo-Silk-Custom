"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora/tests/test_layout.py"""

import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib_moss_regional import layout  # noqa: E402

TEMPLATE = "<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n<think>\n"

# shaped like compile.js output (no spaces, escaped parentheses) plus an Extra line
PROMPT = (
    '{"summary":{"caption":"two friends \\(smiling\\) <lora:style:0.5>","canvas":"single"},'
    '"items":[{"label":"character","caption":"<lora:homer:1> homer simpson, bald","bbox":[-512,-512,512,0]},'
    '{"label":"character","caption":"marge \\"blue hair\\" <lora:marge:0.8>","bbox":[-512,0,512,512]},'
    '{"label":"text","caption":"sign","bbox":[300,-200,450,200],"text":"HELLO"}],'
    '"bbox_coord_space":"abs_centralized","bbox_format":"yxyx"}\n<lora:detail:1>'
)


class TestParse(unittest.TestCase):
    def test_items(self):
        items = layout.parse_items(PROMPT)
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0].loras, ["homer"])
        self.assertEqual(items[1].loras, ["marge"])
        self.assertEqual(items[2].loras, [])
        self.assertEqual(items[0].bbox, (-512.0, -512.0, 512.0, 0.0))
        for it in items:
            self.assertEqual(PROMPT[it.start], "{")
            self.assertEqual(PROMPT[it.end - 1], "}")
        self.assertIn('\\"blue hair\\"', items[1].caption)

    def test_globals(self):
        items = layout.parse_items(PROMPT)
        self.assertEqual(layout.global_loras(PROMPT, items), {"style", "detail"})

    def test_not_a_layout(self):
        self.assertIsNone(layout.parse_items("a cat on a mat <lora:x:1>"))
        self.assertIsNone(layout.parse_items('{"summary":{"caption":"x"}}'))
        self.assertIsNone(layout.parse_items('{"items":[{"caption":"broken'))

    def test_box_fraction(self):
        # compile.js: y1 - floor(H/2), x1 - floor(W/2) ...
        self.assertEqual(layout.box_fraction((-512, -512, 512, 0), 1024, 1024), (0.0, 0.0, 1.0, 0.5))
        self.assertEqual(layout.box_fraction((-384, 0, 384, 512), 1024, 768), (0.0, 0.5, 1.0, 1.0))

    def test_unescape_map(self):
        text, index = layout.unescape_with_map("a\\(b\\)c\\\\d")
        self.assertEqual(text, "a(b)c\\\\d")
        self.assertEqual(index[0], 0)
        self.assertEqual(index[1], 1)
        self.assertEqual(index[3], 2)  # 'b'
        self.assertEqual(index[len("a\\(b\\)c\\\\d")], len(text))

    def test_unescape_matches_comfy(self):
        def comfy(t):  # backend/text_processing/_comfy.py escape_important + unescape_important
            t = t.replace("\\)", "\0\1").replace("\\(", "\0\2")
            return t.replace("\0\1", ")").replace("\0\2", "(")

        for t in [PROMPT, "x\\\\(y\\)", "\\(\\(\\)", "plain"]:
            self.assertEqual(layout.unescape_with_map(t)[0], comfy(t))


class TestTokens(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from transformers import AutoTokenizer

        forge_root = os.path.dirname(os.path.dirname(ROOT))
        cls.tok = AutoTokenizer.from_pretrained(os.path.join(forge_root, "backend/huggingface/OpenMOSS-Team/MOSS-Image-SFT/tokenizer"))

    def test_spans_cover_each_item(self):
        stripped = layout._NET_RE.sub("", PROMPT).strip()
        items = layout.parse_items(stripped)
        escaped, index = layout.unescape_with_map(TEMPLATE.format(stripped))
        enc = self.tok(escaped, return_offsets_mapping=True)
        prefix = TEMPLATE.index("{}")
        spans = layout.token_spans(enc["offset_mapping"], [(index[prefix + it.start], index[prefix + it.end]) for it in items])

        decoded = [self.tok.decode([enc["input_ids"][t] for t in s]) for s in spans]
        self.assertIn("homer simpson, bald", decoded[0])
        self.assertNotIn("marge", decoded[0])
        self.assertIn('marge \\"blue hair\\"', decoded[1])
        self.assertNotIn("homer", decoded[1])
        self.assertIn("HELLO", decoded[2])
        # contiguous and disjoint
        for s in spans:
            self.assertEqual(s, list(range(s[0], s[-1] + 1)))
        self.assertLess(spans[0][-1], spans[1][0])
        self.assertLess(spans[1][-1], spans[2][0])


if __name__ == "__main__":
    unittest.main()
