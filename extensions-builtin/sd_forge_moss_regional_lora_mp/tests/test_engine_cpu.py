"""Run from the forge-neo root: venv/Scripts/python.exe extensions-builtin/sd_forge_moss_regional_lora_mp/tests/test_engine_cpu.py

Runs the engine on a tiny MOSSImage on the CPU (Forge's real backend.nn.moss_image, no mocks)."""

import os
import sys
import types
import unittest
from unittest import mock

import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORGE = os.path.dirname(os.path.dirname(ROOT))
sys.path.insert(0, ROOT)
sys.path.insert(0, FORGE)

from backend.args import dynamic_args  # noqa: E402
from backend.nn import moss_image  # noqa: E402
from backend.operations import using_forge_operations  # noqa: E402
from lib_moss_regional_mp import engine, lowrank, masks  # noqa: E402

HW = 16  # 4 x 4 grid
TEXT = 5


def make_dit():
    torch.manual_seed(0)
    # Forge's operations give the layers their weight_function / cast plumbing; they skip init, so fill them
    with using_forge_operations(device=torch.device("cpu"), dtype=torch.float32):
        dit = moss_image.MOSSImage(dim=48, ffn_dim=64, num_heads=2, num_layers=3, text_dim=16, latent_channels=8)
    with torch.no_grad():
        for p in dit.parameters():
            p.copy_(torch.randn_like(p) * 0.1)
    return dit.eval().float()


def lr_for(dit, path, rank=2):
    out_dim, in_dim = dit.get_submodule(path).weight.shape
    return lowrank.LowRank(torch.randn(out_dim, rank) * 0.5, torch.randn(rank, in_dim) * 0.5, 1.0)


def o_path(dit):
    return "layers.0.proj.o"  # present whether or not the layer is fused (fused_qkv only changes q/k/v)


class TestEngineCPU(unittest.TestCase):
    def setUp(self):
        self.dit = make_dit()
        torch.manual_seed(1)
        self.x = torch.randn(2, 8, 4, 4)
        self.context = torch.randn(2, TEXT, 16)
        self.timestep = torch.rand(2)
        self.opts = {"cond_or_uncond": [0, 1], "sigmas": torch.tensor([1.0, 1.0])}
        self.settings = engine.Settings(feather=0.0)
        self.device = torch.device("cpu")

    def tearDown(self):
        engine.unpatch()

    def run_dit(self):
        with torch.no_grad():
            return self.dit(self.x, self.timestep, self.context, dict(self.opts))

    def capture(self, path):
        """(input, output) of one layer during a forward."""
        seen = {}

        def hook(module, args, output):
            seen["x"], seen["out"] = args[0].clone(), output.clone()

        h = self.dit.get_submodule(path).register_forward_hook(hook)
        try:
            self.run_dit()
        finally:
            h.remove()
        return seen["x"], seen["out"]

    def info(self, boxes):
        return engine.LayoutInfo(boxes=boxes, spans={i: (0, 2) for i in boxes}, n_tokens=TEXT)

    def test_zero_outside_and_full_inside(self):
        path = o_path(self.dit)
        lr = lr_for(self.dit, path)
        _, base = self.capture(path)
        stats = engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                             self.settings, self.device, torch.float32)
        self.assertEqual(stats, {"hooked": 1, "vec_skipped": 0, "missing": 0})
        x, out = self.capture(path)
        diff = out - base
        inside = torch.zeros(HW, dtype=torch.bool)
        inside[[0, 1, 4, 5]] = True
        self.assertTrue(torch.equal(diff[:, :HW][:, ~inside], torch.zeros_like(diff[:, :HW][:, ~inside])))
        self.assertTrue(torch.allclose(diff[:, :HW][:, inside], lowrank.lowrank_delta(x, lr)[:, :HW][:, inside], atol=1e-5))
        self.assertTrue(diff[:, :HW][:, inside].abs().max() > 1e-3)
        self.assertTrue(torch.equal(diff[:, HW:], torch.zeros_like(diff[:, HW:])))  # text tokens: masked

    def test_overlap_front_only(self):
        path = o_path(self.dit)
        lr0, lr1 = lr_for(self.dit, path), lr_for(self.dit, path)
        _, base = self.capture(path)
        boxes = {0: (0.0, 0.0, 0.5, 0.5), 1: (0.25, 0.25, 0.75, 0.75)}
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr0}), engine.Entry(1, "b", 1.0, {path: lr1})],
                     self.info(boxes), self.settings, self.device, torch.float32)
        x, out = self.capture(path)
        diff = out - base
        overlap = 1 * 4 + 1  # row 1, col 1
        self.assertTrue(torch.allclose(diff[:, overlap], lowrank.lowrank_delta(x, lr0)[:, overlap], atol=1e-5))
        only_1 = 2 * 4 + 2  # row 2, col 2: item 1 alone
        self.assertTrue(torch.allclose(diff[:, only_1], lowrank.lowrank_delta(x, lr1)[:, only_1], atol=1e-5))

    def test_vec_not_wrapped(self):
        vec, path = "shared_block_modulation", o_path(self.dit)
        layers = {vec: lr_for(self.dit, vec), path: lr_for(self.dit, path)}
        stats = engine.patch(self.dit, [engine.Entry(0, "a", 1.0, layers)], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                             self.settings, self.device, torch.float32)
        self.assertEqual(stats["vec_skipped"], 1)
        self.assertEqual(stats["hooked"], 1)
        self.assertNotIn("forward", self.dit.shared_block_modulation.__dict__)
        self.assertIn("forward", self.dit.get_submodule(path).__dict__)

    def test_schedule_off(self):
        base = self.run_dit()
        path = o_path(self.dit)
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                     self.settings, self.device, torch.float32, sigma_bounds=(0.5, None))
        self.assertTrue(torch.equal(self.run_dit(), base))

    def capture_lia(self, linear):
        """(eager-activated input, output) of linear_input_act for one module during a forward."""
        seen = {}
        current = moss_image.linear_input_act

        def recorder(lin, x, input_act, *args, **kwargs):
            out = current(lin, x, input_act, *args, **kwargs)
            if lin is linear:
                seen["x"] = engine._eager_input_act(x, input_act).clone()
                seen["out"] = out.clone()
            return out

        moss_image.linear_input_act = recorder
        try:
            self.run_dit()
        finally:
            moss_image.linear_input_act = current
        return seen["x"], seen["out"]

    def test_ffn_down_via_linear_input_act(self):
        path = "layers.1.proj.ffn_down"
        linear = self.dit.get_submodule(path)
        lr = lr_for(self.dit, path)
        _, base = self.capture_lia(linear)
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                     self.settings, self.device, torch.float32)
        self.assertIsNot(moss_image.linear_input_act, engine._originals["linear_input_act"])
        x, out = self.capture_lia(linear)
        diff = out - base
        inside = torch.zeros(HW, dtype=torch.bool)
        inside[[0, 1, 4, 5]] = True
        img = diff[:, :HW]
        self.assertTrue(torch.equal(img[:, ~inside], torch.zeros_like(img[:, ~inside])))
        self.assertTrue(torch.equal(diff[:, HW:], torch.zeros_like(diff[:, HW:])))
        # exactly one delta inside: a double add would give twice this
        self.assertTrue(torch.allclose(img[:, inside], lowrank.lowrank_delta(x, lr)[:, :HW][:, inside], atol=1e-5))
        self.assertTrue(img[:, inside].abs().max() > 1e-3)

    def test_no_sigmas_with_bounds_warns(self):
        path = o_path(self.dit)
        base = self.run_dit()
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                     self.settings, self.device, torch.float32, sigma_bounds=(0.5, None))
        del self.opts["sigmas"]
        with self.assertLogs(engine.logger, "WARNING") as logs:
            out = self.run_dit()
            self.run_dit()
        self.assertEqual(len(logs.records), 1)
        self.assertIn("no sigmas", logs.output[0])
        self.assertFalse(torch.equal(out, base))  # applied at every step

    def test_batch_mismatch_warns(self):
        path = o_path(self.dit)
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                     self.settings, self.device, torch.float32)
        layer = self.dit.get_submodule(path)
        x = torch.randn(3, HW + TEXT, layer.weight.shape[1])
        with torch.no_grad():
            base = type(layer).forward(layer, x)
            engine.state.ctx = engine._CallContext((4, 4), TEXT, True, [0], 2, True,
                                                   engine.state.image_masks(4, 4, self.device, torch.float32))
            try:
                with self.assertLogs(engine.logger, "WARNING") as logs:
                    out = layer(x)
                    layer(x)
            finally:
                engine.state.ctx = None
        self.assertTrue(torch.equal(out, base))
        self.assertEqual(len(logs.records), 1)
        self.assertIn("batch", logs.output[0])

    # ---- attention ownership

    def patch_attention(self):
        path = o_path(self.dit)
        boxes = {0: (0.0, 0.0, 0.5, 0.5), 1: (0.25, 0.25, 0.75, 0.75)}
        info = engine.LayoutInfo(boxes=boxes, spans={0: (0, 2), 1: (2, 4)}, n_tokens=TEXT)
        settings = engine.Settings(feather=0.0, ownership="attention")
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)}),
                                engine.Entry(1, "b", 1.0, {path: lr_for(self.dit, path)})],
                     info, settings, self.device, torch.float32, measure_sigma=0.5)
        return boxes, settings

    def masks_now(self):
        return engine.state.image_masks(4, 4, self.device, torch.float32)

    def assert_masks_equal(self, got, want_lists):
        self.assertEqual(set(got), set(want_lists))
        for i, m in want_lists.items():
            self.assertTrue(torch.allclose(got[i], torch.tensor(m, dtype=torch.float32)), i)

    def test_measure_then_own(self):
        boxes, s = self.patch_attention()
        geo = masks.geometric_masks(boxes, 4, 4, s.feather, s.skirt)
        self.run_dit()
        self.run_dit()
        self.assertIsNotNone(engine.state.scores)
        self.assertEqual(set(engine.state.scores), {0, 1})
        self.assertTrue(all(t.sum() > 0 for t in engine.state.scores.values()))
        self.assertFalse(engine.state.owned_ready)
        self.assert_masks_equal(self.masks_now(), geo)

        self.opts["sigmas"] = torch.tensor([0.3, 0.3])
        with self.assertLogs(engine.logger, "INFO") as logs:
            self.run_dit()
        self.assertTrue(engine.state.owned_ready)
        self.assertTrue(any("box 1: +" in line and "box 2: +" in line for line in logs.output))
        scores = {b: t.tolist() for b, t in engine.state.scores.items()}
        owned = masks.ownership_image_masks(boxes, scores, 4, 4, s.feather, s.skirt, s.spill)
        self.assert_masks_equal(self.masks_now(), owned)
        self.assertNotEqual(owned, geo)  # the contested overlap is decided by attention, not the drawing

        # a new sampling run measures afresh
        self.patch_attention()
        self.assertIsNone(engine.state.scores)
        self.assertFalse(engine.state.owned_ready)

    def test_measure_only_measured_blocks(self):
        self.patch_attention()
        seen = []
        real = engine._accumulate

        def spy(q, *args, **kwargs):
            seen.append(q.shape[1])
            return real(q, *args, **kwargs)

        # what an earlier forward leaves in a reused transformer_options; the text embedder runs before the loop
        self.opts.update(block_index=1, total_blocks=len(self.dit.layers))
        with mock.patch.object(engine, "_accumulate", side_effect=spy):
            self.run_dit()
        # one call per measured block, all on the joint [image | text] sequence: never the text embedder
        self.assertEqual(seen, [HW + TEXT] * len(engine.ops.measured_layers(len(self.dit.layers))))
        self.assertFalse(engine.state.attention_off)

    def test_measure_restores_attention_function(self):
        original = moss_image.attention_function
        self.patch_attention()
        self.run_dit()
        self.assertIs(moss_image.attention_function, original)
        self.opts["sigmas"] = torch.tensor([0.3, 0.3])
        self.run_dit()
        self.assertIs(moss_image.attention_function, original)

    def test_measure_failure_falls_back_loudly(self):
        boxes, s = self.patch_attention()
        original = moss_image.attention_function
        with mock.patch.object(engine, "_accumulate", side_effect=RuntimeError("boom")):
            with self.assertLogs(engine.logger, "WARNING") as logs:
                out = self.run_dit()
        self.assertEqual(out.shape, self.x.shape)
        self.assertTrue(any("attention measurement failed (boom); using the box masks" in line for line in logs.output))
        self.assertIs(moss_image.attention_function, original)
        self.opts["sigmas"] = torch.tensor([0.3, 0.3])
        self.run_dit()
        self.assertFalse(engine.state.owned_ready)
        self.assert_masks_equal(self.masks_now(), masks.geometric_masks(boxes, 4, 4, s.feather, s.skirt))

    def test_unpatch_restores(self):
        original = moss_image.MOSSImage._forward
        base = self.run_dit()
        path = o_path(self.dit)
        engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                     self.settings, self.device, torch.float32)
        self.assertFalse(torch.equal(self.run_dit(), base))
        engine.unpatch()
        self.assertTrue(torch.equal(self.run_dit(), base))
        self.assertIs(moss_image.MOSSImage._forward, original)
        self.assertNotIn("forward", self.dit.get_submodule(path).__dict__)

    def test_refs_in_sequence_skip(self):
        saved = (list(dynamic_args.ref_latents), dynamic_args.moss_reference_method)
        try:
            dynamic_args.ref_latents = [torch.zeros(1, 8, 4, 4)]
            dynamic_args.moss_reference_method = "index"
            base = self.run_dit()
            path = o_path(self.dit)
            engine.patch(self.dit, [engine.Entry(0, "a", 1.0, {path: lr_for(self.dit, path)})], self.info({0: (0.0, 0.0, 0.5, 0.5)}),
                         self.settings, self.device, torch.float32)
            self.assertTrue(torch.equal(self.run_dit(), base))
            self.assertIn("reference images are in the sequence; box LoRAs not applied", engine.state.notes)
        finally:
            dynamic_args.ref_latents, dynamic_args.moss_reference_method = saved


class TestLoadLoraLayers(unittest.TestCase):
    def test_other_adapter_kinds_are_skipped(self):
        dit = make_dit()
        path = o_path(dit)
        out_dim, in_dim = dit.get_submodule(path).weight.shape
        plain = types.SimpleNamespace(name="lora", weights=(torch.randn(out_dim, 2), torch.randn(2, in_dim), None, None, None, None))
        lokr = types.SimpleNamespace(name="lokr", weights=tuple(range(9)))  # 9 weights: would break a 6-way unpack
        patches = {
            f"diffusion_model.{path}.weight": plain,
            "diffusion_model.layers.1.proj.o.weight": lokr,
            "diffusion_model.layers.2.proj.o.weight": lokr,
        }
        unet_model = types.SimpleNamespace(diffusion_model=dit)
        filename = "fake-mixed-adapters.safetensors"
        engine._LOWRANK_CACHE.pop(filename, None)
        try:
            with (
                mock.patch.object(engine, "load_torch_file", return_value={"x": torch.zeros(1)}),
                mock.patch.object(engine, "model_lora_keys_unet", return_value={}),
                mock.patch.object(engine, "load_lora", return_value=patches),
            ):
                layers, skipped, other = engine.load_lora_layers(filename, unet_model)
        finally:
            engine._LOWRANK_CACHE.pop(filename, None)
        self.assertEqual(list(layers), [path])  # the plain LoRA layer still applies
        self.assertEqual(skipped, 0)
        self.assertEqual(other, {"LoKr": 2})


class TestLayoutInfo(unittest.TestCase):
    def test_spans_are_the_captions(self):
        from transformers import AutoTokenizer

        slow = AutoTokenizer.from_pretrained(os.path.join(FORGE, "backend/huggingface/OpenMOSS-Team/MOSS-Image-SFT/tokenizer"), use_fast=False)
        eng = types.SimpleNamespace(llama_template="<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n<think>\n",
                                    tokenizer=types.SimpleNamespace(tokenizer=slow))
        prompt = ('{"summary":{"caption":"two friends \\(smiling\\)"},"items":['
                  '{"label":"character","caption":"homer simpson, bald","bbox":[-512,-512,512,0]},'
                  '{"label":"character","caption":"marge, blue hair"}]}')
        info = engine.build_layout_info(prompt, 1024, 1024, eng)
        self.assertEqual(info.boxes, {0: (0.0, 0.0, 1.0, 0.5)})
        enc = slow(eng.llama_template.format(prompt.replace("\\(", "(").replace("\\)", ")")))["input_ids"]
        self.assertEqual(info.n_tokens, len(enc))
        t0, t1 = info.spans[0]
        self.assertEqual(slow.decode(enc[t0:t1]).strip(), "homer simpson, bald")
        t0, t1 = info.spans[1]
        self.assertEqual(slow.decode(enc[t0:t1]).strip(), "marge, blue hair")


if __name__ == "__main__":
    unittest.main()
