"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_lowrank.py"""

import os
import sys
import unittest

import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from lib_moss_regional_mp import lowrank  # noqa: E402


class TestAddWeighted(unittest.TestCase):
    def test_add_weighted(self):
        torch.manual_seed(0)
        x = torch.randn(2, 5, 8)
        lr = lowrank.LowRank(torch.randn(6, 2), torch.randn(2, 8), 0.8)
        w = torch.tensor([[0.0] * 5, [1, 0, 0.5, 0, 1]])
        base = torch.randn(2, 5, 6)
        out = lowrank.add_weighted(base.clone(), x, [(lr, w)])
        self.assertTrue(torch.allclose(out - base, w[..., None] * lowrank.lowrank_delta(x, lr), atol=1e-5))
        self.assertTrue(torch.equal(out[w == 0], base[w == 0]))

    def test_two_loras_sum(self):
        torch.manual_seed(1)
        x = torch.randn(1, 4, 8)
        lrs = [lowrank.LowRank(torch.randn(6, 2), torch.randn(2, 8), s) for s in (0.7, 1.3)]
        ws = [torch.rand(1, 4), torch.rand(1, 4)]
        out = lowrank.add_weighted(torch.zeros(1, 4, 6), x, list(zip(lrs, ws)))
        exp = sum(lowrank.lowrank_delta(x, lr) * w[..., None] for lr, w in zip(lrs, ws))
        self.assertTrue(torch.allclose(out, exp, atol=1e-5))


class TestExtract(unittest.TestCase):
    def test_extract_scale_and_reject(self):
        up, down = torch.randn(6, 4), torch.randn(4, 8)
        lr = lowrank.extract_lowrank((up, down, 2.0, None, None, None), 0.5)
        self.assertAlmostEqual(lr.scale, 0.25)
        self.assertIsNone(lowrank.extract_lowrank((up, down, 2.0, torch.zeros(1), None, None), 1.0))


if __name__ == "__main__":
    unittest.main()
