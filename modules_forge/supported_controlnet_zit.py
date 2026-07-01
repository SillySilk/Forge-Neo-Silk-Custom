import torch

from backend import memory_management
from backend.nn.lumina_controlnet import ZImage_Control
from backend.patcher.base import ModelPatcher
from modules_forge.supported_controlnet import ControlModelPatcher
from modules_forge.shared import add_supported_control_model


def weight_dtype(sd):
    for k in sd:
        t = sd[k]
        if t.dtype != torch.uint8:
            return t.dtype
    return None


def common_upscale(samples, width, height, upscale_method, crop):
    if crop == "center":
        old_width = samples.shape[3]
        old_height = samples.shape[2]
        if old_width != width or old_height != height:
            old_aspect = old_width / old_height
            new_aspect = width / height
            x0 = round((old_width - old_width * min(new_aspect / old_aspect, 1)) / 2)
            y0 = round((old_height - old_height * min(old_aspect / new_aspect, 1)) / 2)
            x1 = old_width - x0
            y1 = old_height - y0
            samples = samples[:, :, y0:y1, x0:x1]
    return torch.nn.functional.interpolate(samples, size=(height, width), mode=upscale_method)


def z_image_convert(sd):
    replace_keys = {
        ".attention.to_out.0.bias": ".attention.out.bias",
        ".attention.norm_k.weight": ".attention.k_norm.weight",
        ".attention.norm_q.weight": ".attention.q_norm.weight",
        ".attention.to_out.0.weight": ".attention.out.weight",
    }

    out_sd = {}
    cc = []
    for k in sorted(sd.keys()):
        w = sd[k]
        k_out = k

        if k_out.endswith(".attention.to_k.weight"):
            cc = [w]
            continue
        if k_out.endswith(".attention.to_q.weight"):
            cc = [w] + cc
            continue
        if k_out.endswith(".attention.to_v.weight"):
            cc = cc + [w]
            w = torch.cat(cc, dim=0)
            k_out = k_out.replace(".attention.to_v.weight", ".attention.qkv.weight")

        for r, rr in replace_keys.items():
            k_out = k_out.replace(r, rr)
        out_sd[k_out] = w

    return out_sd


class ZImageControlPatch:
    def __deepcopy__(self, memo):
        return self

    def __init__(self, model_patch, vae, image, strength, sigma_start=None, sigma_end=None):
        self.model_patch = model_patch
        self.vae = vae
        self.image = image
        self.strength = strength
        self.sigma_start = sigma_start  # sigma above which control is inactive (early denoising)
        self.sigma_end = sigma_end      # sigma below which control is inactive (late denoising)
        self.is_inpaint = self.model_patch.model.additional_in_dim > 0
        self.encoded_image = None
        self.encoded_image_size = None
        self.refiner_data = None  # state for noise_refiner path
        self.block_data = None    # state for double_block path

    def _process_in(self, latent):
        if hasattr(self.vae, 'first_stage_model') and hasattr(self.vae.first_stage_model, 'process_in'):
            return self.vae.first_stage_model.process_in(latent)
        return latent

    def _encode_image(self, image):
        """Encode control image, adding inpaint channels if model requires them."""
        latent = self._process_in(self.vae.encode(image))

        if self.is_inpaint:
            # Model expects: [control_latent(16), mask(1), inpaint_latent(16)] = 33 channels
            # For non-inpaint use: dummy inpaint image (gray=0.5) and zero mask
            dummy_inpaint = torch.ones_like(image) * 0.5
            inpaint_latent = self._process_in(self.vae.encode(dummy_inpaint))
            mask = torch.zeros_like(latent)[:, :1]  # [B, 1, H, W]
            latent = torch.cat([latent, mask, inpaint_latent], dim=1)

        return latent

    def _get_spacial_compression(self):
        if hasattr(self.vae, 'first_stage_model') and hasattr(self.vae.first_stage_model, 'downscale_ratio'):
            try:
                return int(self.vae.first_stage_model.downscale_ratio[-1])
            except (TypeError, IndexError):
                return int(self.vae.first_stage_model.downscale_ratio)
        if hasattr(self.vae, 'downscale_ratio'):
            try:
                return int(self.vae.downscale_ratio[-1])
            except (TypeError, IndexError):
                return int(self.vae.downscale_ratio)
        return 8

    def pre_encode(self):
        """Encode control image to latent before sampling starts."""
        self.encoded_image = self._encode_image(self.image)
        self.encoded_image_size = (self.image.shape[1], self.image.shape[2])

    def __call__(self, kwargs):
        x = kwargs.get("x")
        img = kwargs.get("img")
        img_input = kwargs.get("img_input")
        txt = kwargs.get("txt")
        pe = kwargs.get("pe")
        vec = kwargs.get("vec")
        block_index = kwargs.get("block_index")
        block_type = kwargs.get("block_type", "")
        total_blocks = kwargs.get("total_blocks", 30)

        kwargs.pop("img")
        kwargs.pop("txt")

        if block_index == 0 and block_type != "noise_refiner":
            print(f"[ZImageControlNet] __call__ invoked: block={block_index}/{total_blocks}, type='{block_type}', strength={self.strength}")

        zimage_control = self.model_patch.model
        offload_device = memory_management.unet_offload_device()
        cnet_blocks = zimage_control.n_control_layers

        # Match encoded image resolution to generation latent if needed
        if self.encoded_image.shape[-2] != x.shape[-2] or self.encoded_image.shape[-1] != x.shape[-1]:
            self.encoded_image = common_upscale(
                self.encoded_image,
                x.shape[-1], x.shape[-2],
                "bilinear", "center",
            )

        if block_type == "noise_refiner":
            # Noise refiner: uses self.refiner_data
            if self.refiner_data is None:
                zimage_control.to(device=img.device, dtype=img.dtype)
                encoded = self.encoded_image.to(device=img.device, dtype=img.dtype)
                ctrl_ctx = zimage_control(txt, encoded, pe, vec)
                self.refiner_data = (-1, (None, ctrl_ctx))
                zimage_control.to(device=offload_device)

            zimage_control.to(device=img.device, dtype=img.dtype)
            next_layer = self.refiner_data[0] + 1
            self.refiner_data = (next_layer, zimage_control.forward_noise_refiner_block(
                block_index, self.refiner_data[1][1],
                img_input[:, :self.refiner_data[1][1].shape[1]],
                None, pe, vec,
            ))
            zimage_control.to(device=offload_device)
            if self.refiner_data[1][0] is not None:
                skip = self.refiner_data[1][0] * self.strength
                img[:, :skip.shape[1]] += skip

            # Reset for next step
            if block_index == total_blocks - 1:
                self.refiner_data = None
        else:
            # Double block: uses self.block_data
            div = max(round(total_blocks / cnet_blocks), 1)
            cnet_index = block_index // div
            cnet_index_float = block_index / div

            if cnet_index_float > (cnet_blocks - 1):
                return kwargs

            if self.block_data is None:
                zimage_control.to(device=img.device, dtype=img.dtype)
                encoded = self.encoded_image.to(device=img.device, dtype=img.dtype)
                print(f"[ZImageControlNet] DIAG init: encoded shape={encoded.shape}, dtype={encoded.dtype}, "
                      f"txt shape={txt.shape}, pe shape={pe.shape}, vec shape={vec.shape}")
                ctrl_ctx = zimage_control(txt, encoded, pe, vec)
                print(f"[ZImageControlNet] DIAG init: ctrl_ctx shape={ctrl_ctx.shape}, abs mean={ctrl_ctx.abs().mean().item():.6f}")
                self.block_data = (-1, (None, ctrl_ctx))
                zimage_control.to(device=offload_device)

            if self.block_data[0] < cnet_index and (self.block_data[0] + 1) < cnet_blocks:
                zimage_control.to(device=img.device, dtype=img.dtype)
                while self.block_data[0] < cnet_index and (self.block_data[0] + 1) < cnet_blocks:
                    next_layer = self.block_data[0] + 1
                    self.block_data = (next_layer, zimage_control.forward_control_block(
                        next_layer, self.block_data[1][1],
                        img_input[:, :self.block_data[1][1].shape[1]],
                        None, pe, vec,
                    ))
                zimage_control.to(device=offload_device)

            if cnet_index_float == self.block_data[0]:
                skip = self.block_data[1][0] * self.strength
                if block_index == 0:
                    print(f"[ZImageControlNet] DIAG: skip shape={skip.shape}, img shape={img.shape}, "
                          f"skip abs mean={skip.abs().mean().item():.6f}, img abs mean={img.abs().mean().item():.6f}, "
                          f"cnet_index={self.block_data[0]}, cnet_blocks={cnet_blocks}, div={div}")
                img[:, :skip.shape[1]] += skip
                if cnet_blocks == self.block_data[0] + 1:
                    self.block_data = None

        return kwargs

    def to(self, device_or_dtype):
        if isinstance(device_or_dtype, torch.device):
            if self.encoded_image is not None:
                self.encoded_image = self.encoded_image.to(device_or_dtype)
            self.refiner_data = None
            self.block_data = None
        return self

    def models(self):
        return [self.model_patch]


class ZImageControlNetPatcher(ControlModelPatcher):

    @staticmethod
    def try_build_from_state_dict(controlnet_data, ckpt_path):
        if 'control_all_x_embedder.2-1.weight' not in controlnet_data:
            return None

        try:
            sd = z_image_convert(controlnet_data)
            dtype = weight_dtype(sd)

            # Auto-detect hidden dim from embedder weight shape: [dim, patch_channels]
            embedder_w = sd['control_all_x_embedder.2-1.weight']
            detected_dim = embedder_w.shape[0]
            # head_dim=128 is shared across all Z-Image variants (sum of axes_dims)
            detected_n_heads = detected_dim // 128
            print(f"[ZImageControlNet] Detected dim={detected_dim}, n_heads={detected_n_heads} "
                  f"(Z-Image-Turbo uses dim=3840/n_heads=30)")

            config = {
                'dim': detected_dim,
                'n_heads': detected_n_heads,
                'n_kv_heads': detected_n_heads,
            }

            # Detect additional_in_dim from embedder input size: patch_channels = 4*(16+add_dim)
            detected_patch_ch = embedder_w.shape[1]  # = 4 * (control_in_dim + additional_in_dim)
            detected_additional = (detected_patch_ch // 4) - 16
            if detected_additional > 0:
                config['additional_in_dim'] = detected_additional

            # Detect n_control_layers from checkpoint keys
            n_layers = 0
            while f'control_layers.{n_layers}.after_proj.weight' in sd:
                n_layers += 1
            if n_layers > 0:
                config['n_control_layers'] = n_layers

            # refiner_control=True if noise_refiner blocks have after_proj (ZImageControlTransformerBlock)
            if 'control_noise_refiner.0.after_proj.weight' in sd:
                config['refiner_control'] = True
                ref_weight = sd.get("control_noise_refiner.0.after_proj.weight", None)
                if ref_weight is not None and torch.count_nonzero(ref_weight) == 0:
                    config['broken'] = True

            print(f"[ZImageControlNet] Config: {config}")

            model = ZImage_Control(**config)
            missing, unexpected = model.load_state_dict(sd, strict=False)
            n_missing = len(missing)
            n_unexpected = len(unexpected)
            n_total = len(list(model.parameters()))
            print(f"[ZImageControlNet] Load result: {n_missing} missing, {n_unexpected} unexpected keys "
                  f"({n_total} parameter tensors total)")
            if n_missing > 0:
                print(f"[ZImageControlNet] Missing (first 10): {missing[:10]}")
            if n_unexpected > 0:
                print(f"[ZImageControlNet] Unexpected (first 10): {unexpected[:10]}")
            if n_missing > n_total * 0.3:
                print(f"[ZImageControlNet] WARNING: >30% of keys are missing — "
                      f"checkpoint may be for a different Z-Image variant (e.g. Fun vs Turbo). "
                      f"Output quality will be poor.")

            if dtype is not None:
                model = model.to(dtype=dtype)

            model_patcher = ModelPatcher(
                model,
                load_device=memory_management.get_torch_device(),
                offload_device=memory_management.unet_offload_device(),
            )

            return ZImageControlNetPatcher(model_patcher)

        except Exception:
            import traceback
            traceback.print_exc()
            return None

    def __init__(self, model_patcher):
        super().__init__(model_patcher)
        self.is_model_patch = True

    def process_before_every_sampling(self, process, cond, mask, *args, **kwargs):
        try:
            unet = process.sd_model.forge_objects.unet.clone()
            vae = process.sd_model.forge_objects.vae

            image = cond
            if image is not None:
                if image.ndim == 4 and image.shape[1] <= 4:
                    image = image.movedim(1, -1)
                image = image[:, :, :, :3]
                print(f"[ZImageControlNet] Control image shape: {image.shape}")
            else:
                print("[ZImageControlNet] WARNING: No control image (cond is None)!")
                return

            # Convert start/end percent to sigma range for timestep gating
            sigma_start = None
            sigma_end = None
            if self.start_percent > 0.0 or self.end_percent < 1.0:
                predictor = unet.model.predictor
                if self.start_percent > 0.0:
                    sigma_start = float(predictor.percent_to_sigma(self.start_percent))
                if self.end_percent < 1.0:
                    sigma_end = float(predictor.percent_to_sigma(self.end_percent))
                print(f"[ZImageControlNet] Sigma gating: start={sigma_start}, end={sigma_end}")

            patch = ZImageControlPatch(self.model_patcher, vae, image, self.strength,
                                       sigma_start=sigma_start, sigma_end=sigma_end)

            # Pre-encode control image NOW, before sampling starts,
            # so the VAE doesn't get loaded mid-forward-pass
            patch.pre_encode()
            print(f"[ZImageControlNet] Encoded image shape: {patch.encoded_image.shape}")

            # Route injection based on model type.
            # refiner_control=True models have TWO parallel control chains trained together:
            #   - control_noise_refiner (2 blocks) → noise_refiner path for early grounding
            #   - control_layers (3/15 blocks) → double_block path for structural control
            # Both must run simultaneously; using only one gives broken/weak results.
            # refiner_control=False models use double_block only (noise_refiner is a
            # preprocessor inside forward(), not an injection path).
            zimage_model = self.model_patcher.model
            if getattr(zimage_model, 'refiner_control', False):
                unet.set_model_noise_refiner_patch(patch)
                unet.set_model_double_block_patch(patch)
                print(f"[ZImageControlNet] Using noise_refiner + double_block injection (refiner_control model)")
            else:
                unet.set_model_double_block_patch(patch)
                print(f"[ZImageControlNet] Using double_block injection")
            process.sd_model.forge_objects.unet = unet
            print(f"[ZImageControlNet] Patched with strength={self.strength}, start={self.start_percent}, end={self.end_percent}")
        except Exception as e:
            import traceback
            print(f"[ZImageControlNet] ERROR in process_before_every_sampling: {e}")
            traceback.print_exc()


add_supported_control_model(ZImageControlNetPatcher)
