# ForgeCanvas - Modular Architecture

## Overview

This directory contains the refactored ForgeCanvas code with a clean modular architecture.

## File Structure

```
modules_forge/forge_canvas/
├── canvas.js                    ← DEPLOYED (bundled for browser)
├── canvas-refactored.js         ← Source (main orchestrator)
├── canvas.js.backup_refactor    ← Original monolithic backup
├── build-canvas.sh              ← Build script (bundles modules)
├── modules/                     ← SOURCE CODE (edit these!)
│   ├── canvas-state.js          (152 lines)
│   ├── shapes-library.js        (1,020 lines)
│   ├── shapes-renderer.js       (296 lines)
│   ├── drawing-engine.js        (306 lines)
│   ├── history-manager.js       (107 lines)
│   ├── cursor-manager.js        (190 lines)
│   ├── gradio-sync.js           (85 lines)
│   ├── image-manager.js         (112 lines)
│   └── ui-manager.js            (104 lines)
└── README.md                    ← This file
```

## Development Workflow

### 1. Edit Source Modules

**Edit the small, maintainable module files:**

```bash
# Example: Fix a shape rendering bug
nano modules/shapes-renderer.js

# Example: Update cursor behavior
nano modules/cursor-manager.js

# Example: Add a new shape
nano modules/shapes-library.js
```

### 2. Build Bundled Version

**After editing, run the build script:**

```bash
cd modules_forge/forge_canvas
./build-canvas.sh
```

This creates `canvas.js` (the bundled version) that the browser loads.

### 3. Test in Browser

Restart your Stable Diffusion WebUI and test the inpaint sketch canvas.

## Why This Architecture?

### Problem (Before)
- ❌ Single 2,910-line file (129KB)
- ❌ Impossible to edit without crashes
- ❌ Mixed concerns (state, rendering, events, UI)
- ❌ Hard to debug and maintain

### Solution (After)
- ✅ 10 focused modules (~100-300 lines each)
- ✅ Easy to edit and understand
- ✅ Clear separation of concerns
- ✅ Bundled for browser compatibility

## Module Responsibilities

| Module | Purpose | Lines |
|--------|---------|-------|
| **canvas-state.js** | State management (colors, sizes, flags) | 152 |
| **shapes-library.js** | Shape definitions (50+ shapes) | 1,020 |
| **shapes-renderer.js** | Shape rendering & Path2D logic | 296 |
| **drawing-engine.js** | Brush strokes & stamp rendering | 306 |
| **history-manager.js** | Undo/redo functionality | 107 |
| **cursor-manager.js** | Cursor preview & indicators | 190 |
| **gradio-sync.js** | Gradio data synchronization | 85 |
| **image-manager.js** | Image loading & rendering | 112 |
| **ui-manager.js** | UI controls & interactions | 104 |
| **canvas-refactored.js** | Main orchestrator (ties it all together) | 397 |

## Build Process

The `build-canvas.sh` script:
1. Removes `export` statements from modules
2. Removes `import` statements
3. Concatenates all modules into one file
4. Adds header comment

**Result:** A single `canvas.js` file with no ES6 module syntax (browser-compatible).

## Rollback

If you need the original monolithic file:

```bash
cp canvas.js.backup_refactor canvas.js
```

## Best Practices

### DO ✅
- Edit module files in `modules/` directory
- Run `./build-canvas.sh` after changes
- Test thoroughly before committing
- Keep modules focused and under 500 lines

### DON'T ❌
- Don't edit `canvas.js` directly (it gets overwritten)
- Don't add ES6 imports/exports in module files
- Don't mix concerns (keep modules focused)

## Adding New Features

**Example: Adding a new tool**

1. Create new module: `modules/new-tool.js`
2. Add class definition (no `export` keyword)
3. Update `canvas-refactored.js` to use it
4. Update `build-canvas.sh` to include it
5. Run `./build-canvas.sh`
6. Test!

## Benefits

- 🧩 **Modular**: Easy to find and fix bugs
- 📖 **Readable**: Small, focused files
- 🧪 **Testable**: Can unit test modules independently
- 🤝 **Collaborative**: Multiple developers can work simultaneously
- 🚀 **Maintainable**: Clear code structure and responsibilities

## Questions?

See the detailed refactoring documentation:
- `REFACTORING_PLAN.md` - Architecture decisions
- `REFACTORING_COMPLETE.md` - Implementation summary

---

**Happy coding! 🎨**
