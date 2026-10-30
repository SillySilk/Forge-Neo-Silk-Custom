"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora/tests/test_lowrank.py"""

import os
import sys
import unittest

import torch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib_moss_regional import lowrank  # noqa: E402


class TestSubtract(unittest.TestCase):
    def test_matches_masked_lora(self):
        torch.manual_seed(0)
        B, L, din, dout, r = 2, 7, 16, 12, 4
        base = torch.randn(dout, din)
        lrs = [lowrank.LowRank(torch.randn(dout, r), torch.randn(r, din), 0.7), lowrank.LowRank(torch.randn(dout, r), torch.randn(r, din), 1.3)]
        ws = [torch.randint(0, 2, (B, L)).float(), torch.randint(0, 2, (B, L)).float()]
        x = torch.randn(B, L, din)

        full = x @ base.t() + sum(lowrank.lowrank_delta(x, lr) for lr in lrs)
        out = lowrank.subtract_outside(full.clone(), x, list(zip(lrs, ws)))

        expected = x @ base.t() + sum(lowrank.lowrank_delta(x, lr) * w.unsqueeze(-1) for lr, w in zip(lrs, ws))
        self.assertTrue(torch.allclose(out, expected, atol=1e-4))

    def test_all_inside_is_untouched(self):
        x = torch.randn(1, 5, 8)
        lr = lowrank.LowRank(torch.randn(6, 2), torch.randn(2, 8), 1.0)
        full = torch.randn(1, 5, 6)
        out = lowrank.subtract_outside(full.clone(), x, [(lr, torch.ones(1, 5))])
        self.assertTrue(torch.equal(out, full))


if __name__ == "__main__":
    unittest.main()
