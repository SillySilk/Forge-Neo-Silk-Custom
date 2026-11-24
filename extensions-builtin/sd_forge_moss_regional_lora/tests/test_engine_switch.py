"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora/tests/test_engine_switch.py

The Original's script steps aside when the engine switch (sd_forge_moss_regional_lora_mp) picks another engine."""

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


def _load_script():
    scripts = types.ModuleType("modules.scripts")
    scripts.Script = type("Script", (), {})
    scripts.AlwaysVisible = object()
    callbacks = types.ModuleType("modules.script_callbacks")
    callbacks.on_ui_settings = lambda fn: fn
    shared = types.ModuleType("modules.shared")
    shared.OptionInfo = object
    shared.opts = types.SimpleNamespace(moss_regional_lora=True)
    modules = types.ModuleType("modules")
    modules.scripts, modules.shared, modules.script_callbacks = scripts, shared, callbacks
    lib = types.ModuleType("lib_moss_regional")  # the real engine imports torch and backend.*
    lib.engine = types.SimpleNamespace(unpatch=lambda: None, patch=lambda *a, **k: None, collect_layouts=lambda *a, **k: ({}, []))
    stubs = {"lib_moss_regional": lib, "lib_moss_regional.engine": lib.engine, "modules": modules, "modules.scripts": scripts, "modules.shared": shared, "modules.script_callbacks": callbacks}
    saved = {k: sys.modules.get(k) for k in stubs}
    sys.modules.update(stubs)
    try:
        path = os.path.join(ROOT, "scripts", "moss_regional_lora.py")
        spec = importlib.util.spec_from_file_location("moss_regional_lora_original_script", path)
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


def _run(p):
    """Returns (is_moss mock, unpatch mock) after one process_before_every_sampling call."""
    s = script.MossRegionalLora()
    with mock.patch.object(script, "_is_moss", return_value=False) as is_moss, mock.patch.object(script.engine, "unpatch") as unpatch:
        s.process_before_every_sampling(p)
    return is_moss, unpatch


class TestEngineSwitch(unittest.TestCase):
    def test_other_engines_return_before_any_check(self):
        for choice in ("Moonpack-style", "Off"):
            is_moss, unpatch = _run(types.SimpleNamespace(_moss_regional_engine=choice))
            unpatch.assert_called_once()  # still clears its own patch
            is_moss.assert_not_called()

    def test_other_engines_never_patch(self):
        for choice in ("Moonpack-style", "Off"):
            with mock.patch.object(script.engine, "patch") as patch:
                _run(types.SimpleNamespace(_moss_regional_engine=choice))
            patch.assert_not_called()

    def test_original_and_absent_reach_the_existing_checks(self):
        for p in (types.SimpleNamespace(), types.SimpleNamespace(_moss_regional_engine="Original")):
            is_moss, unpatch = _run(p)
            unpatch.assert_called_once()
            is_moss.assert_called_once()


if __name__ == "__main__":
    unittest.main()
