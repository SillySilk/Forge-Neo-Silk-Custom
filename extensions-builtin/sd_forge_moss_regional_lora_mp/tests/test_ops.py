"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_ops.py"""

import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib_moss_regional_mp import ops  # noqa: E402


def _grid(mask, w):
    return [mask[i:i + w] for i in range(0, len(mask), w)]


class TestOps(unittest.TestCase):
    def test_closest_names(self):
        self.assertEqual(
            ops.closest_names("anna_mos", ["anna_moss.safetensors", "car.safetensors"])[0],
            "anna_moss.safetensors",
        )

    # --- geometry -----------------------------------------------------------

    def test_box_mask_hard(self):
        # left half of an 4x4 grid
        m = _grid(ops.box_mask([0, 0, 1000, 500], 4, 4), 4)
        self.assertEqual(m, [[1.0, 1.0, 0.0, 0.0]] * 4)

    def test_box_mask_aspect_and_order(self):
        # rows are y: top quarter of a 4 (h) x 8 (w) grid
        m = _grid(ops.box_mask([0, 0, 250, 1000], 4, 8), 8)
        self.assertEqual(m[0], [1.0] * 8)
        self.assertTrue(all(v == 0.0 for row in m[1:] for v in row))

    def test_box_mask_tiny_box_keeps_one_token(self):
        m = ops.box_mask([510, 510, 520, 520], 8, 8)
        self.assertEqual(sum(m), 1.0)
        self.assertEqual(m[4 * 8 + 4], 1.0)

    def test_box_mask_feather_is_soft_and_capped(self):
        m = ops.box_mask([0, 0, 1000, 1000], 20, 20, feather=1.0)  # capped to 0.3
        row = m[10 * 20:11 * 20]
        self.assertEqual(row[10], 1.0)
        self.assertGreater(row[0], 0.0)
        self.assertLess(row[0], 1.0)
        self.assertEqual(row, row[::-1])

    def test_box_mask_skirt_grows(self):
        hard = sum(ops.box_mask([400, 400, 600, 600], 10, 10))
        grown = sum(ops.box_mask([400, 400, 600, 600], 10, 10, skirt=0.1))
        self.assertEqual(hard, 4.0)
        self.assertEqual(grown, 16.0)

    def test_compose_masks_painter_order(self):
        back = [1.0, 1.0, 1.0, 0.0]
        front = [0.0, 1.0, 0.5, 0.0]
        owned, background = ops.compose_masks([back, front])
        self.assertEqual(owned[1], front)
        self.assertEqual(owned[0], [1.0, 0.0, 0.5, 0.0])
        self.assertEqual(background, [0.0, 0.0, 0.0, 1.0])
        for i in range(4):
            self.assertAlmostEqual(owned[0][i] + owned[1][i] + background[i], 1.0)

    def test_module_kind(self):
        self.assertEqual(ops.module_kind("layers.3.proj.qkv"), ops.SEQ)
        self.assertEqual(ops.module_kind("video_embedder"), ops.VEC)
        self.assertEqual(ops.module_kind("final_linear_video"), ops.IMAGE)
        self.assertEqual(ops.module_kind("text_embedder.blocks.0.qkv"), ops.TEXT)
        self.assertEqual(ops.module_kind("shared_block_modulation"), ops.VEC)

    def test_schedule_active(self):
        self.assertTrue(ops.schedule_active(5.0, None, None))
        self.assertTrue(ops.schedule_active(5.0, 10.0, 1.0))
        self.assertFalse(ops.schedule_active(11.0, 10.0, 1.0))
        self.assertFalse(ops.schedule_active(1.0, 10.0, 1.0))

    # --- attention ownership ------------------------------------------------

    def test_measured_layers_middle_third(self):
        self.assertEqual(ops.measured_layers(42), [14, 16, 18, 20, 22, 24, 26])
        self.assertEqual(ops.measured_layers(2), [0])

    @staticmethod
    def _ownership_fixture():
        # 1 x 6 strip: box A covers cells 0-3, box B covers 2-5 (overlap 2-3); no spill.
        geo = {0: [1, 1, 1, 1, 0, 0], 1: [0, 0, 1, 1, 1, 1]}
        reach = {0: [1, 1, 1, 1, 0, 0], 1: [0, 0, 1, 1, 1, 1]}
        return geo, reach

    def test_ownership_overlap_follows_attention(self):
        geo, reach = self._ownership_fixture()
        # A's caption is attended in cells 0-2, B's in 3-5
        scores = {0: [1, 1, 1, 0.1, 0, 0], 1: [0, 0, 0.1, 1, 1, 1]}
        owned, bg = ops.ownership_masks(geo, reach, scores, 1, 6)
        self.assertEqual(owned[0][0], 1)  # exclusive zones stay geometric
        self.assertEqual(owned[1][5], 1)
        self.assertGreater(owned[0][2], owned[1][2])
        self.assertGreater(owned[1][3], owned[0][3])
        for i in range(6):
            self.assertAlmostEqual(owned[0][i] + owned[1][i] + bg[i], 1.0)

    def test_ownership_back_box_wins_overlap_when_attended(self):
        geo, reach = self._ownership_fixture()
        scores = {0: [1, 1, 0, 0, 0, 0], 1: [0, 0, 1, 1, 1, 1]}  # B (the back box) owns the overlap
        owned, _ = ops.ownership_masks(geo, reach, scores, 1, 6)
        self.assertGreater(owned[1][2], 0.5)
        self.assertGreater(owned[1][3], 0.5)
        self.assertEqual(owned[0][3], 0)

    def test_ownership_ring_needs_score(self):
        geo = {0: [0, 1, 1, 0, 0, 0]}
        reach = {0: [1, 1, 1, 1, 1, 0]}
        owned, _ = ops.ownership_masks(geo, reach, {0: [0.9, 1, 1, 0.2, 0, 0]}, 1, 6)
        self.assertGreater(owned[0][0], 0)  # spill only where the subject is attended
        self.assertEqual(owned[0][5], 0)
        self.assertLess(owned[0][4], 0.5)

    def test_ownership_without_measurement_is_empty_contest(self):
        geo, reach = self._ownership_fixture()
        owned, bg = ops.ownership_masks(geo, reach, {0: [0] * 6, 1: [0] * 6}, 1, 6)
        # only the soft edge reaches in
        self.assertEqual(owned[0][0], 1)
        self.assertLess(owned[0][2], 0.5)
        self.assertLess(owned[1][3], 0.5)


if __name__ == "__main__":
    unittest.main()
