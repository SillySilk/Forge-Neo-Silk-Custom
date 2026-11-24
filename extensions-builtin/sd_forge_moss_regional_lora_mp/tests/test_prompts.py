"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_prompts.py"""

import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "tests"))

from lib_moss_regional_mp.prompts import BoxEntry, plan_batch  # noqa: E402
from test_layout import PROMPT  # noqa: E402


class TestPlanBatch(unittest.TestCase):
    def test_plan_batch_single(self):
        plan = plan_batch([PROMPT])
        self.assertIsNone(plan.skip_reason)
        self.assertEqual(plan.entries, [BoxEntry(0, "homer", 1.0), BoxEntry(1, "marge", 0.8)])
        self.assertNotIn("<lora:homer", plan.stripped[0])
        self.assertNotIn("<lora:marge", plan.stripped[0])
        self.assertIn("<lora:style", plan.stripped[0])
        self.assertIn("<lora:detail", plan.stripped[0])

    def test_plan_batch_global_wins(self):
        prompt = PROMPT + " <lora:homer:1>"
        plan = plan_batch([prompt])
        self.assertEqual([e.name for e in plan.entries], ["marge"])
        self.assertIn("<lora:homer:1> homer simpson", plan.stripped[0])
        self.assertTrue(any("homer" in n for n in plan.global_notes))

    def test_plan_batch_mixed_layouts(self):
        prompts = [PROMPT, PROMPT.replace("[-512,-512,512,0]", "[-512,-512,512,-100]")]
        plan = plan_batch(prompts)
        self.assertEqual(plan.skip_reason, "prompts in the batch have different layouts")
        self.assertEqual(plan.entries, [])
        self.assertEqual(plan.stripped, prompts)
        plan = plan_batch([PROMPT, "a cat"])
        self.assertEqual(plan.skip_reason, "prompts in the batch have different layouts")

    def test_plan_batch_identical_layouts(self):
        plan = plan_batch([PROMPT, PROMPT])
        self.assertEqual(len(plan.entries), 2)
        self.assertEqual(plan.stripped[0], plan.stripped[1])

    def test_plan_batch_not_layout(self):
        prompts = ["a cat <lora:x:1>"]
        plan = plan_batch(prompts)
        self.assertEqual(plan.entries, [])
        self.assertIsNone(plan.skip_reason)
        self.assertEqual(plan.stripped, prompts)

    def test_plan_batch_no_bbox_stays_global(self):
        prompt = '{"summary":{"caption":"x"},"items":[{"label":"character","caption":"<lora:q:1> q"}]}'
        plan = plan_batch([prompt])
        self.assertEqual(plan.entries, [])
        self.assertTrue(any("q" in n for n in plan.global_notes))
        self.assertIn("<lora:q:1>", plan.stripped[0])


if __name__ == "__main__":
    unittest.main()
