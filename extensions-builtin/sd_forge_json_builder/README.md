# JSON Builder (Silk custom)

Forge Neo's JSON Builder for MOSS-Image layouts, with this fork's additions: regional LoRA per
box, a character library, a LoRA picker, a reference image under the boxes, and editing tools
(undo / redo, keyboard shortcuts, resize from any side, width/height swap).

## MOSS-Image fields the builder writes

| Field | Where | What it does (same-seed test on MOSS) |
|---|---|---|
| `caption` | Summary, each box | The description. |
| `meta` | Summary | Medium / genre words, e.g. `watercolor illustration`. Strong. |
| `canvas` | Summary | `single`, `multi_panel` or `collage`. |
| `palette` | Summary, each box | Up to 8 `#RRGGBB` colours. Weak. |
| `tags` | Each box | Up to 16 keywords. Strong. Each box still needs a caption to send. |
| `text` | Text boxes | The exact words to draw. |

Characters can store tags and a palette too; **Add to box** copies them into the box.

## Credits

- **[Haoming02/sd-webui-forge-classic](https://github.com/Haoming02/sd-webui-forge-classic)** (Forge Neo):
  the original JSON Builder this is built on.
- **[eduardoabreu81/sd-regional-boxes-neo](https://github.com/eduardoabreu81/sd-regional-boxes-neo)**:
  the idea for undo / redo, keyboard shortcuts on the selected box, and resize handles on every
  side came from comparing with this extension. Ideas only; its code (AGPL) was not copied.
- **[DenOfEquity/ersatzForge](https://github.com/DenOfEquity/ersatzForge)**: the idea for a
  one-click width/height swap button came from its builder. Ideas only; no code was copied.
