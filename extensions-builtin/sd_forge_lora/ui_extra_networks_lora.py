import html
import os.path

import network
import networks
from ui_edit_user_metadata import LoraUserMetadataEditor

from modules import shared, ui_extra_networks
from modules.ui_extra_networks import quote_js


class ExtraNetworksPageLora(ui_extra_networks.ExtraNetworksPage):
    def __init__(self):
        super().__init__("Lora")
        self.allow_negative_prompt = True

    def refresh(self):
        networks.list_available_networks()

    # CUSTOM (Forge Neo): every Lora is model-specific, so the tab is scoped to one
    # folder at a time. The picker sits in the control row next to Search.
    def create_folder_selector_html(self, tabname: str) -> str:
        folders = networks.available_lora_folders()
        active = getattr(shared.opts, "lora_active_dir", networks.ALL_LORA_FOLDERS)
        if active not in folders:
            active = networks.ALL_LORA_FOLDERS

        options = "".join(
            f'<option value="{html.escape(folder, quote=True)}"{" selected" if folder == active else ""}>'
            f"{html.escape(folder)}</option>"
            for folder in folders
        )

        return (
            f'<select id="{tabname}_{self.extra_networks_tabname}_folder_select" '
            f'class="extra-network-control--folder" title="Only show Loras from this folder" '
            f"onchange=\"extraNetworksControlFolderOnChange(event, '{tabname}', '{self.extra_networks_tabname}');\">"
            f"{options}</select>"
        )

    def set_active_dir(self, folder: str) -> None:
        if folder not in networks.available_lora_folders():
            return
        # refresh() re-scans immediately after this, so skip the onchange rescan.
        shared.opts.set("lora_active_dir", folder, run_callbacks=False)
        shared.opts.save(shared.config_filename)

    def create_item(self, name, index=None, enable_filter=True):
        lora_on_disk = networks.available_networks.get(name)
        if lora_on_disk is None:
            return

        path = os.path.splitext(lora_on_disk.filename)[0]

        alias = lora_on_disk.get_alias()

        search_terms = [self.search_terms_from_path(lora_on_disk.filename)]
        if lora_on_disk.hash:
            search_terms.append(lora_on_disk.hash)

        item: dict[str, str | dict] = {
            "name": name,
            "filename": lora_on_disk.filename,
            "shorthash": lora_on_disk.shorthash,
            "preview": self.find_preview(path) or self.find_embedded_preview(path, name, lora_on_disk.metadata),
            "description": self.find_description(path),
            "search_terms": search_terms,
            "local_preview": f"{path}.{shared.opts.samples_format}",
            "metadata": lora_on_disk.metadata,
            "sort_keys": {"default": index, **self.get_sort_keys(lora_on_disk.filename)},
        }

        self.read_user_metadata(item)
        activation_text = item["user_metadata"].get("activation text")
        preferred_weight = item["user_metadata"].get("preferred weight", 0.0)
        item["prompt"] = quote_js(f"<lora:{alias}:") + " + " + (str(preferred_weight) if preferred_weight else "opts.extra_networks_default_multiplier") + " + " + quote_js(">")

        if activation_text:
            item["prompt"] += " + " + quote_js(" " + activation_text)

        negative_prompt = item["user_metadata"].get("negative text", "")
        item["negative_prompt"] = quote_js(negative_prompt)

        sd_version: str = item["user_metadata"].get("sd version", None)
        if sd_version in network.SD_VERSION:
            item["sd_version"] = sd_version
        else:
            sd_version = "Unknown"

        if enable_filter and shared.opts.lora_preset_filter and sd_version not in ("Unknown", shared.opts.forge_preset):
            return None

        return item

    def list_items(self):
        names = list(networks.available_networks)
        for index, name in enumerate(names):
            item = self.create_item(name, index)
            if item is not None:
                yield item

    def allowed_directories_for_previews(self):
        return [shared.cmd_opts.lora_dir, *shared.cmd_opts.lora_dirs]

    def create_user_metadata_editor(self, ui, tabname):
        return LoraUserMetadataEditor(ui, tabname, self)
