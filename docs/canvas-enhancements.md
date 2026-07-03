# Canvas Enhancements for Inpaint Sketch Tool

Custom additions to the Forge Canvas drawing tool, located in `modules_forge/forge_canvas/`
(`canvas.js`, `canvas.html`, `canvas.css`, `canvas.py`, plus the shape library in `shapes.js`
— see `canvas-custom-shapes.md` for the shape stamping system).

All features are additive over upstream's canvas; the file is hand-merged on upstream updates
(see CLAUDE.md "Custom work to preserve").

---

## Brush shape toggle

Cycle between circle, rectangle, and triangle brushes.

- Toolbar button (○/□/△) or press `B`
- Cursor preview matches the selected shape
- Circle at 0° rotation with 1:1 aspect uses fast native line rendering; everything else
  renders via the stamp system (`drawWithStamps` → `drawStamp`)

## Straight line drawing

Hold `Ctrl` and click to draw a straight line from the end of the last stroke
(`lastLinePoint`). Chain Ctrl+clicks for polylines. Works with brushes and shape stamps.
Reset on canvas clear.

## Brush rotation

Rotate the brush 0–360°.

- Rotation slider (5° steps with 45° detents) or hold `D` + scroll
- Cursor preview rotates to match
- Rotation > 0° switches to stamp-based rendering; supports softness, opacity, and eraser mode

## Independent width / height (aspect)

Separate Brush Width and Brush Height sliders (`W`/`Q` + scroll).

- Link button (`L`) keeps them proportional; equalize button (`=`) snaps them equal
- Non-square brushes render via the stamp system

## Scatter brush

Toggle with the ⋯ toolbar button or `N`. Stamps get random offset, size (0.6–1.2×), and
rotation jitter (±~14°). Jitter is cached per stroke (`_scatterJitterCache`) so the full-stroke
redraw on every pointer move stays deterministic — placed stamps don't shimmer while drawing.

## Editable slider labels

Click any slider label (width, height, opacity, softness, rotation, stroke width) to type an
exact value. Enter applies, Escape cancels.

## Dual color + stroke controls (shape system)

Fill color (`E`) and stroke color (`Shift+E`) pickers, plus a stroke width slider — used by
the shape stamping system (`canvas-custom-shapes.md`).

## Undo/redo

- 50-step history (upstream keeps 16), stored as compressed PNG data URLs rather than raw
  ImageData to keep memory bounded
- `Ctrl+Z` / `Ctrl+Y`, plus toolbar buttons with disabled states

## Keyboard shortcuts (summary)

| Key | Action |
|---|---|
| `B` | Cycle brush shape |
| `N` | Toggle scatter brush |
| `G` | Toggle shape picker palette |
| `H` | Toggle fill/outline mode |
| `L` | Link/unlink width & height |
| `=` | Equalize width & height |
| `E` / `Shift+E` | Fill / stroke color picker |
| `W` `Q` `A` `S` `D` + scroll | Width / height / opacity / softness / rotation |
| `Ctrl+Click` | Straight line from last point |
| `Ctrl+Z` / `Ctrl+Y` / `Ctrl+X` | Undo / redo / reset |

Shortcuts only fire while the pointer is over the canvas and never while typing in an input.

## Infrastructure notes

- Instances register in `window.forgeCanvasInstances` (keyed by UUID) for extensions such as
  ForgeUI-MaskEraser. Replacing a UUID destroys the stale instance.
- Document-level listeners are attached with an `AbortController` signal; `destroy()` detaches
  them (called automatically on registry replacement).
- The built-in Shift-key eraser is intentionally disabled (commented out) — it conflicts with
  the ForgeUI-MaskEraser extension.
- `ForgeCanvas` constructor params added over upstream: `no_shapes`, `scribbleRotation(Fixed)`,
  `scribbleHeight(Fixed)` — wired through `canvas.py`.

---

**Author**: SillySilk
**Last updated**: 2026-07-02
**Based on**: Forge Canvas by lllyasviel
