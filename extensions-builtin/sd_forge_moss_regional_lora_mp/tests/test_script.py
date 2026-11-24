"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_script.py

Imports the Forge script with modules.* and gradio stubbed, and tests its pure helpers."""

import importlib.util
import os
import sys
import types
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORGE = os.path.dirname(os.path.dirname(ROOT))
sys.path.insert(0, ROOT)
sys.path.insert(0, FORGE)
sys.path.insert(0, os.path.join(ROOT, "tests"))

from lib_moss_regional_mp.engine import Settings  # noqa: E402
from lib_moss_regional_mp.prompts import BoxEntry, plan_batch  # noqa: E402
from test_layout import PROMPT  # noqa: E402


def _load_script():
    scripts = types.ModuleType("modules.scripts")
    scripts.Script = type("Script", (), {})
    scripts.AlwaysVisible = object()
    modules = types.ModuleType("modules")
    modules.scripts = scripts
    stubs = {"modules": modules, "modules.scripts": scripts, "gradio": types.ModuleType("gradio")}
    saved = {k: sys.modules.get(k) for k in stubs}
    sys.modules.update(stubs)
    try:
        path = os.path.join(ROOT, "scripts", "moss_regional_lora_mp.py")
        spec = importlib.util.spec_from_file_location("moss_regional_lora_mp_script", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    finally:
        for k, v in saved.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v


script = _load_script()


class TestScript(unittest.TestCase):
    def test_gate(self):
        self.assertTrue(script.should_run("Moonpack-style", True, False))
        self.assertFalse(script.should_run("Original", True, False))
        self.assertFalse(script.should_run("Off", True, False))
        self.assertFalse(script.should_run("Moonpack-style", False, False))

    def test_gate_ad_inner(self):
        self.assertFalse(script.should_run("Moonpack-style", True, True))

    def test_strip_and_restore_hr(self):
        p = types.SimpleNamespace(enable_hr=True, iteration=0, batch_size=1, all_hr_prompts=[PROMPT, PROMPT])
        saved = script.strip_hr(p, plan_batch)
        self.assertEqual(saved, [PROMPT])
        self.assertNotIn("<lora:homer", p.all_hr_prompts[0])
        self.assertEqual(p.all_hr_prompts[1], PROMPT)
        script.restore_hr(p, saved)
        self.assertEqual(p.all_hr_prompts, [PROMPT, PROMPT])

    def test_strip_hr_without_hires(self):
        p = types.SimpleNamespace(enable_hr=False, iteration=0, batch_size=1, all_hr_prompts=[PROMPT])
        self.assertIsNone(script.strip_hr(p, plan_batch))
        self.assertEqual(p.all_hr_prompts, [PROMPT])

    def test_strip_hr_other_entries(self):
        p = types.SimpleNamespace(enable_hr=True, iteration=0, batch_size=1, all_hr_prompts=[PROMPT])
        with self.assertRaises(ValueError):
            script.strip_hr(p, plan_batch, [BoxEntry(0, "homer", 1.0)])
        self.assertEqual(p.all_hr_prompts, [PROMPT])

    def test_resolve_reports_missing(self):
        obj = object()
        self.assertEqual(script.resolve(["homer", "ghost"], {"homer": obj}, {}), ({"homer": obj}, ["'ghost' not found"]))

    def test_lora_problems_name_other_adapter_kinds(self):
        self.assertEqual(script.lora_problems("lk", {}, 0, {"LoKr": 12}), ["'lk': 12 LoKr layer(s) cannot be masked; skipped"])
        self.assertEqual(script.lora_problems("mix", {"a": 1}, 3, {"LoHa": 1}),
                         ["'mix': 1 LoHa layer(s) cannot be masked; skipped", "'mix': 3 unsupported layer(s) not applied"])
        self.assertEqual(script.lora_problems("none", {}, 0, {}), ["'none' matches no layer of this model"])
        self.assertEqual(script.lora_problems("ok", {"a": 1}, 0, {}), [])

    def test_infotext(self):
        entries = [BoxEntry(0, "homer", 1.0), BoxEntry(1, "marge", 0.8)]
        self.assertEqual(
            script.infotext(entries, Settings(), []),
            "moonpack-style; homer: item 1 x1.0; marge: item 2 x0.8; feather 0.1, skirt 0.0, text masked, "
            "ownership boxes, steps 0.0-1.0, x1.0",
        )
        self.assertTrue(script.infotext(entries, Settings(), ["'ghost' not found"]).endswith("; skipped: 'ghost' not found"))


def fake_p(prompt=PROMPT):
    return types.SimpleNamespace(
        _moss_regional_engine="Moonpack-style", _mrl_mp_settings=Settings(), prompts=[prompt],
        enable_hr=False, iteration=0, batch_size=1, extra_generation_params={}, width=1024, height=1024,
    )


class TestScriptFlow(unittest.TestCase):
    def setUp(self):
        self.patches = [mock.patch.object(script, "_is_moss", return_value=True)]
        for p in self.patches:
            p.start()
        self.s = script.MossRegionalLoraMP()

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def test_before_process_batch_strips(self):
        p = fake_p()
        self.s.before_process_batch(p)
        self.assertNotIn("<lora:homer", p.prompts[0])
        self.assertEqual([e.name for e in p._mrl_mp_plan.entries], ["homer", "marge"])

    def test_malformed_strength_strips_nothing(self):
        bad = PROMPT.replace("<lora:homer:1>", "<lora:homer:abc>")
        p = fake_p(bad)
        with self.assertLogs(script.logger, "WARNING"):
            self.s.before_process_batch(p)
        self.assertEqual(p.prompts, [bad])
        self.assertIsNone(p._mrl_mp_plan)
        self.assertEqual(len(p._mrl_mp_problems), 1)

    def test_patch_error_goes_to_infotext(self):
        p = fake_p()
        self.s.before_process_batch(p)
        with (
            mock.patch.object(script.MossRegionalLoraMP, "_patch", side_effect=RuntimeError("boom")),
            self.assertLogs(script.logger, "WARNING") as logs,
        ):
            self.s.process_before_every_sampling(p)
        self.assertTrue(any("ERROR" in line for line in logs.output))
        text = p.extra_generation_params[script.INFOTEXT_KEY]()
        self.assertIn("skipped: box LoRAs not applied: boom", text)

    def test_infotext_cleared_per_batch(self):
        p = fake_p()
        self.s.before_process_batch(p)
        with mock.patch.object(script.MossRegionalLoraMP, "_patch", return_value=[]):
            self.s.process_before_every_sampling(p)
        p.extra_generation_params[script.INFOTEXT_KEY] = "moonpack-style; homer: item 1 x1.0"  # as iteration 0 wrote it
        p.iteration, p.prompts = 1, ["a cat"]
        self.s.before_process_batch(p)
        self.s.process_before_every_sampling(p)
        self.assertNotIn(script.INFOTEXT_KEY, p.extra_generation_params)

    def test_hires_mismatch_keeps_first_pass_entries(self):
        from lib_moss_regional_mp.engine import Entry

        p = fake_p()
        hr = PROMPT.replace("<lora:homer:1>", "")  # the hires prompt plans other box LoRAs
        p.enable_hr, p.all_hr_prompts, p.hr_prompts = True, [hr], [hr]
        with self.assertLogs(script.logger, "WARNING"):
            self.s.before_process_batch(p)
        self.assertFalse(p._mrl_mp_hr_ok)
        applied = [Entry(0, "homer", 1.0, {}), Entry(1, "marge", 0.8, {})]
        with mock.patch.object(script.MossRegionalLoraMP, "_patch", return_value=applied):
            self.s.process_before_every_sampling(p)
        p.is_hr_pass = True
        with mock.patch.object(script.MossRegionalLoraMP, "_patch") as patch:
            self.s.process_before_every_sampling(p)
        patch.assert_not_called()
        text = p.extra_generation_params[script.INFOTEXT_KEY]()
        self.assertIn("homer: item 1 x1.0; marge: item 2 x0.8", text)
        self.assertIn("hires pass:", text)

    def test_infotext_kept_when_engine_not_chosen(self):
        p = fake_p()
        p._moss_regional_engine = "Original"
        p.extra_generation_params[script.INFOTEXT_KEY] = "homer: item 1"  # the Original engine's line
        self.s.before_process_batch(p)
        self.assertEqual(p.extra_generation_params[script.INFOTEXT_KEY], "homer: item 1")


if __name__ == "__main__":
    unittest.main()
