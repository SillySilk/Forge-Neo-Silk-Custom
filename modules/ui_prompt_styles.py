import gradio as gr

from modules import shared, ui_common, ui_components, styles

styles_edit_symbol = "\U0001f58c\ufe0f"  # 🖌️
styles_materialize_symbol = "\U0001f4cb"  # 📋
styles_copy_symbol = "\U0001f4dd"  # 📝


def select_style(name):
    style = shared.prompt_styles.styles.get(name)
    existing = style is not None
    empty = not name

    prompt = style.prompt if style else gr.update()
    negative_prompt = style.negative_prompt if style else gr.update()

    return prompt, negative_prompt, gr.update(visible=existing), gr.update(visible=not empty), gr.update(visible=not empty), name




def save_style(name, prompt, negative_prompt):
    if not name:
        return gr.update(visible=False)

    existing_style = shared.prompt_styles.styles.get(name)
    path = existing_style.path if existing_style is not None else None

    style = styles.PromptStyle(name, prompt, negative_prompt, path)
    shared.prompt_styles.styles[style.name] = style
    shared.prompt_styles.save_styles()

    return gr.update(visible=True)


def rename_style(new_name, prompt, negative_prompt, original_name):
    print(f"rename_style called: new_name='{new_name}', original_name='{original_name}'")

    if not original_name or not new_name:
        print("Rename failed: Missing name")
        return gr.update(visible=True)

    if original_name == new_name:
        print("Rename failed: Name unchanged - use Save instead")
        return gr.update(visible=True)

    if new_name in shared.prompt_styles.styles:
        print(f"Rename failed: Style '{new_name}' already exists")
        return gr.update(visible=True)

    old_style = shared.prompt_styles.styles.get(original_name)
    if old_style is None:
        print(f"Rename failed: Original style '{original_name}' not found")
        return gr.update(visible=True)

    print(f"Renaming '{original_name}' to '{new_name}'")
    shared.prompt_styles.styles.pop(original_name)

    renamed_style = styles.PromptStyle(new_name, prompt, negative_prompt, old_style.path)
    shared.prompt_styles.styles[renamed_style.name] = renamed_style
    shared.prompt_styles.save_styles()

    print(f"Rename successful!")
    return gr.update(visible=True)




def alphabetize_styles():
    """Alphabetize all styles by name."""
    if not shared.prompt_styles.styles:
        return

    # Get all style names and sort them
    style_names = sorted(shared.prompt_styles.styles.keys(), key=str.lower)

    # Create new ordered dict with sorted styles
    sorted_styles = {}
    for name in style_names:
        sorted_styles[name] = shared.prompt_styles.styles[name]

    # Replace the styles dict with the sorted one
    shared.prompt_styles.styles = sorted_styles

    # Save to disk
    shared.prompt_styles.save_styles()


def delete_style(name):
    if name == "":
        return

    shared.prompt_styles.styles.pop(name, None)
    shared.prompt_styles.save_styles()

    return "", "", ""


def materialize_styles(prompt, negative_prompt, styles):
    prompt = shared.prompt_styles.apply_styles_to_prompt(prompt, styles)
    negative_prompt = shared.prompt_styles.apply_negative_styles_to_prompt(negative_prompt, styles)

    return [gr.update(value=prompt), gr.update(value=negative_prompt), gr.update(value=[])]


def refresh_styles():
    return gr.update(choices=list(shared.prompt_styles.styles)), gr.update(choices=list(shared.prompt_styles.styles))


class UiPromptStyles:
    def __init__(self, tabname, main_ui_prompt, main_ui_negative_prompt):
        self.tabname = tabname
        self.main_ui_prompt = main_ui_prompt
        self.main_ui_negative_prompt = main_ui_negative_prompt

        with gr.Row(elem_id=f"{tabname}_styles_row"):
            self.dropdown = gr.Dropdown(label="Styles", show_label=False, elem_id=f"{tabname}_styles", choices=list(shared.prompt_styles.styles), value=[], multiselect=True, tooltip="Styles")
            edit_button = ui_components.ToolButton(value=styles_edit_symbol, elem_id=f"{tabname}_styles_edit_button", tooltip="Edit styles")

        with gr.Group(elem_id=f"{tabname}_styles_dialog", elem_classes="popup-dialog") as styles_dialog:
            with gr.Row():
                self.selection = gr.Dropdown(label="Styles", elem_id=f"{tabname}_styles_edit_select", choices=list(shared.prompt_styles.styles), value=[], allow_custom_value=True, info="Styles allow you to add custom text to prompt. Use the {prompt} token in style text, and it will be replaced with user's prompt when applying style. Otherwise, style's text will be added to the end of the prompt.", elem_classes=["style-name-input"])
                ui_common.create_refresh_button([self.dropdown, self.selection], shared.prompt_styles.reload, lambda: {"choices": list(shared.prompt_styles.styles)}, f"refresh_{tabname}_styles")
                self.materialize = ui_components.ToolButton(value=styles_materialize_symbol, elem_id=f"{tabname}_style_apply_dialog", tooltip="Apply all selected styles from the style selection dropdown in main UI to the prompt. Strips comments, if enabled.")
                self.copy = ui_components.ToolButton(value=styles_copy_symbol, elem_id=f"{tabname}_style_copy", tooltip="Copy main UI prompt to style.")

            with gr.Row():
                self.prompt = gr.Textbox(label="Prompt", show_label=True, elem_id=f"{tabname}_edit_style_prompt", lines=4, max_lines=16, elem_classes=["prompt"])

            with gr.Row():
                self.neg_prompt = gr.Textbox(label="Negative prompt", show_label=True, elem_id=f"{tabname}_edit_style_neg_prompt", lines=4, max_lines=16, elem_classes=["prompt"])

            with gr.Row():
                self.save = gr.Button('Save', variant='primary', elem_id=f'{tabname}_edit_style_save', visible=False)
                self.rename = gr.Button('Rename', variant='primary', elem_id=f'{tabname}_edit_style_rename', visible=False)
                self.delete = gr.Button('Delete', variant='primary', elem_id=f'{tabname}_edit_style_delete', visible=False)

            with gr.Row():
                self.alphabetize = gr.Button('Alphabetize All Styles', variant='secondary', elem_id=f'{tabname}_alphabetize_styles')
                self.close = gr.Button('Close', variant='secondary', elem_id=f'{tabname}_edit_style_close')

            # Hidden textbox to track the original style name
            self.original_name = gr.Textbox(value="", visible=False)

        # When selecting from dropdown, load the style and set original_name
        self.selection.select(
            fn=select_style,
            inputs=[self.selection],
            outputs=[self.prompt, self.neg_prompt, self.delete, self.save, self.rename, self.original_name],
            show_progress=False,
        )

        # When typing a new name, show Save and Rename buttons
        self.selection.change(
            fn=lambda name: (gr.update(visible=bool(name)), gr.update(visible=bool(name))),
            inputs=[self.selection],
            outputs=[self.save, self.rename],
            show_progress=False,
        )

        self.save.click(
            fn=save_style,
            inputs=[self.selection, self.prompt, self.neg_prompt],
            outputs=[self.delete],
            show_progress=False,
        ).then(refresh_styles, outputs=[self.dropdown, self.selection], show_progress=False).then(
            fn=None,
            _js='function(name){ alert("Style \\"" + name + "\\" saved successfully!"); }',
            inputs=[self.selection],
            outputs=[],
            show_progress=False,
        )

        self.rename.click(
            fn=rename_style,
            inputs=[self.selection, self.prompt, self.neg_prompt, self.original_name],
            outputs=[self.delete],
            show_progress=False,
        ).then(refresh_styles, outputs=[self.dropdown, self.selection], show_progress=False).then(
            fn=None,
            _js='function(name, orig){ if(orig && orig !== name) { alert("Style renamed from \\"" + orig + "\\" to \\"" + name + "\\" successfully!"); } }',
            inputs=[self.selection, self.original_name],
            outputs=[],
            show_progress=False,
        )

        self.delete.click(
            fn=delete_style,
            _js='function(name){ if(name == "") return ""; return confirm("Delete style " + name + "?") ? name : ""; }',
            inputs=[self.selection],
            outputs=[self.selection, self.prompt, self.neg_prompt],
            show_progress=False,
        ).then(refresh_styles, outputs=[self.dropdown, self.selection], show_progress=False)

        self.alphabetize.click(
            fn=alphabetize_styles,
            _js='function(){ return confirm("Alphabetize all styles?"); }',
            inputs=[],
            outputs=[],
            show_progress=False,
        ).then(refresh_styles, outputs=[self.dropdown, self.selection], show_progress=False)

        self.setup_apply_button(self.materialize)

        self.copy.click(
            fn=lambda p, n: (p, n),
            inputs=[main_ui_prompt, main_ui_negative_prompt],
            outputs=[self.prompt, self.neg_prompt],
            show_progress=False,
        )

        ui_common.setup_dialog(button_show=edit_button, dialog=styles_dialog, button_close=self.close)

    def setup_apply_button(self, button):
        button.click(
            fn=materialize_styles,
            inputs=[self.main_ui_prompt, self.main_ui_negative_prompt, self.dropdown],
            outputs=[self.main_ui_prompt, self.main_ui_negative_prompt, self.dropdown],
            show_progress=False,
        ).then(fn=None, _js="function(){update_" + self.tabname + "_tokens(); closePopup();}", show_progress=False)
