"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_masks.py"""

import os
import sys
import unittest

import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib_moss_regional_mp import masks  # noqa: E402


class TestMasks(unittest.TestCase):
    def test_front_box_takes_overlap(self):
        m = masks.geometric_masks({0: (0, 0, 1, 0.6), 1: (0, 0.4, 1, 1)}, 4, 10, 0.0, 0.0)
        for i in range(40):
            self.assertFalse(m[0][i] > 0 and m[1][i] > 0)
        self.assertEqual(m[0][5], 1.0)
        self.assertEqual(m[1][5], 0.0)

    def test_feather_soft(self):
        m = masks.geometric_masks({0: (0.1, 0.1, 0.9, 0.9)}, 10, 10, 0.3, 0.0)[0]
        self.assertTrue(any(0 < v < 1 for v in m))
        self.assertEqual(m[5 * 10 + 5], 1.0)

    def test_entry_weight_kinds(self):
        mask = torch.tensor([1.0, 0.5, 0.0, 1.0])

        def ew(kind, length, mode):
            return masks.entry_weight(mask, kind, length, 4, 3, mode, None, None, 2, True)

        self.assertIsNone(ew("vec", 4, masks.TEXT_GLOBAL))
        self.assertIsNone(ew("text", 3, masks.TEXT_MASKED))
        self.assertTrue(torch.equal(ew("text", 3, masks.TEXT_GLOBAL), torch.ones(2, 3)))
        self.assertTrue(torch.equal(ew("image", 4, masks.TEXT_MASKED), mask.repeat(2, 1)))
        self.assertIsNone(ew("image", 5, masks.TEXT_MASKED))
        t = ew("seq", 9, masks.TEXT_MASKED)
        self.assertTrue(torch.equal(t[0], torch.cat([mask, torch.zeros(3), torch.zeros(2)])))
        g = ew("seq", 9, masks.TEXT_GLOBAL)
        self.assertTrue(torch.equal(g[1], torch.cat([mask, torch.ones(3), torch.zeros(2)])))
        self.assertIsNone(ew("seq", 3, masks.TEXT_GLOBAL))

    def test_no_mask_text_global_uses_like(self):
        like = torch.zeros(1, dtype=torch.float16)
        w = masks.entry_weight(None, "text", 3, 4, 3, masks.TEXT_GLOBAL, None, None, 2, True, like=like)
        self.assertEqual(w.dtype, torch.float16)
        self.assertEqual(w.shape, (2, 3))
        self.assertIsNone(masks.entry_weight(None, "seq", 9, 4, 3, masks.TEXT_GLOBAL, None, None, 2, True))

    def test_own_caption_rows(self):
        mask = torch.ones(4)

        def ew(valid):
            return masks.entry_weight(mask, "seq", 7, 4, 3, masks.TEXT_OWN, (1, 3), [0], 2, valid)

        w = ew(True)
        self.assertEqual(w[0, 4:].tolist(), [0, 1, 1])
        self.assertEqual(w[1, 4:].tolist(), [0, 0, 0])
        w = ew(False)
        self.assertEqual(w[:, 4:].tolist(), [[0, 0, 0]] * 2)

    def test_ownership_follows_scores(self):
        boxes = {0: (0, 0, 1, 2 / 3), 1: (0, 1 / 3, 1, 1)}
        scores = {0: [1, 1, 0, 0, 0, 0], 1: [0, 0, 1, 1, 1, 1]}
        owned = masks.ownership_image_masks(boxes, scores, 1, 6, 0.0, 0.0, 0.0)
        self.assertGreater(owned[1][2], 0.5)
        self.assertGreater(owned[1][3], 0.5)
        self.assertEqual(owned[0][3], 0)

    def test_unscored_box_keeps_geometry(self):
        boxes = {0: (0, 0, 1, 0.5), 1: (0, 0.5, 1, 1)}
        owned = masks.ownership_image_masks(boxes, {0: [1, 1, 0, 0, 0, 0]}, 1, 6, 0.0, 0.0, 0.0)
        self.assertEqual(owned[1][4], 1.0)


if __name__ == "__main__":
    unittest.main()
