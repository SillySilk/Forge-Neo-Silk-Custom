# Canvas.js Refactoring Plan

## Current State
- **File**: `canvas.js` - 2,910 lines
- **Main Issues**:
  - Single monolithic file difficult to edit and maintain
  - ~1,290 lines of shape definitions inline
  - 43 event listeners in one init() method
  - Mixed concerns: UI, state, rendering, events, data sync
  - Hard to test individual components

## Refactoring Strategy

Break the monolithic `ForgeCanvas` class into focused, maintainable modules:

### Module Breakdown

#### 1. **shapes-library.js** (~1,300 lines)
- **Purpose**: Shape definitions and catalog
- **Exports**: `ShapesLibrary` class
- **Contents**:
  - All built-in shape definitions (basic, stars, arrows, symbols, fetish, comic, curved)
  - Shape metadata (name, displayName, category, path)
  - Shape query methods (getByCategory, getByName, getAllShapes)
- **Why separate**: Shapes are pure data, rarely change, bloat the main file

#### 2. **shapes-renderer.js** (~300 lines)
- **Purpose**: Shape rendering logic
- **Exports**: `ShapesRenderer` class
- **Contents**:
  - `createPath2DFromShape()` - Convert shape data to Path2D
  - `drawShapeStamp()` - Render shape with fill and stroke
  - Shape transformation logic (rotation, aspect ratio, scaling)
  - Curved shape support (quadratic curves)
- **Dependencies**: `ShapesLibrary`

#### 3. **cursor-manager.js** (~200 lines)
- **Purpose**: Cursor preview and indicator
- **Exports**: `CursorManager` class
- **Contents**:
  - `updateCursorIndicator()` - Update cursor visual
  - Cursor positioning logic (zoom-aware, coordinate transforms)
  - Cursor shape rendering (circle, rectangle, custom shapes)
  - Preview fill + stroke colors
- **Dependencies**: `ShapesRenderer`

#### 4. **drawing-engine.js** (~400 lines)
- **Purpose**: Core drawing and brush functionality
- **Exports**: `DrawingEngine` class
- **Contents**:
  - `handleDraw()` - Main drawing state machine
  - `drawWithStamps()` - Stamp-based stroke rendering
  - `drawStamp()`, `drawEllipseStamp()`, `drawRectangleStamp()`
  - Interpolation for smooth strokes
  - Softness/gradient rendering
  - Straight line mode (Ctrl+click)
- **Dependencies**: `ShapesRenderer`

#### 5. **event-handlers.js** (~300 lines)
- **Purpose**: All DOM event listeners
- **Exports**: `EventHandlers` class
- **Contents**:
  - Pointer events (down, move, up, out)
  - Keyboard events (W/A/S/D panning, Ctrl, Shift)
  - File upload and paste handlers
  - UI control events (sliders, color pickers, buttons)
  - Zoom and pan events
- **Dependencies**: `DrawingEngine`, `CursorManager`

#### 6. **canvas-state.js** (~150 lines)
- **Purpose**: Canvas state management
- **Exports**: `CanvasState` class
- **Contents**:
  - All state variables (scribbleColor, scribbleWidth, etc.)
  - State getters/setters
  - State validation
  - Configuration flags (no_upload, no_scribbles, no_shapes)
- **Why separate**: Centralized state makes debugging easier

#### 7. **history-manager.js** (~150 lines)
- **Purpose**: Undo/redo functionality
- **Exports**: `HistoryManager` class
- **Contents**:
  - History stack management
  - `pushHistory()` - Save canvas state
  - `undo()` / `redo()` operations
  - `updateUndoRedoButtons()` - UI sync
- **Why separate**: Complex state machine, better isolated

#### 8. **gradio-sync.js** (~100 lines)
- **Purpose**: Gradio data synchronization
- **Exports**: `GradioSync` class (moved from GradioTextAreaBind)
- **Contents**:
  - `GradioTextAreaBind` class
  - `updateBackgroundImageData()` - Sync background
  - `updateDrawingData()` - Sync drawing layer
  - Canvas-to-dataURL conversion

#### 9. **image-manager.js** (~100 lines)
- **Purpose**: Image loading and rendering
- **Exports**: `ImageManager` class
- **Contents**:
  - `handleFileUpload()` - File processing
  - `handlePaste()` - Clipboard processing
  - `drawImage()` - Image rendering with transforms
  - Image scaling and positioning

#### 10. **ui-manager.js** (~100 lines)
- **Purpose**: UI state and interactions
- **Exports**: `UIManager` class
- **Contents**:
  - `maximize()` / `minimize()` - Fullscreen toggle
  - `toggleBrushShape()` - Shape switching
  - UI visibility (hiding custom shapes in regular inpaint mode)
  - Toolbar state management

#### 11. **canvas.js** (REFACTORED - ~200 lines)
- **Purpose**: Main orchestrator
- **Exports**: `ForgeCanvas` class
- **Contents**:
  - Constructor - creates all manager instances
  - `init()` - delegates to managers
  - Public API methods
  - Manager coordination
- **Why**: Thin orchestration layer, delegates to specialists

## Refactoring Steps

1. ✅ **Analyze structure** (DONE)
2. ⏳ **Create refactoring plan** (IN PROGRESS)
3. **Create directory structure**
   ```
   modules_forge/forge_canvas/
   ├── canvas.js (refactored orchestrator)
   ├── canvas.html
   ├── modules/
   │   ├── shapes-library.js
   │   ├── shapes-renderer.js
   │   ├── cursor-manager.js
   │   ├── drawing-engine.js
   │   ├── event-handlers.js
   │   ├── canvas-state.js
   │   ├── history-manager.js
   │   ├── gradio-sync.js
   │   ├── image-manager.js
   │   └── ui-manager.js
   └── REFACTORING_PLAN.md (this file)
   ```

4. **Extract modules in dependency order**:
   - shapes-library.js (no dependencies)
   - canvas-state.js (no dependencies)
   - shapes-renderer.js (depends on shapes-library)
   - cursor-manager.js (depends on shapes-renderer)
   - drawing-engine.js (depends on shapes-renderer, canvas-state)
   - history-manager.js (depends on canvas-state)
   - gradio-sync.js (no dependencies)
   - image-manager.js (depends on canvas-state)
   - ui-manager.js (depends on canvas-state)
   - event-handlers.js (depends on all above)
   - canvas.js (refactored - depends on all)

5. **Test incrementally** after each module extraction

## Benefits

- **Maintainability**: Each file <500 lines, single responsibility
- **Testability**: Can unit test individual modules
- **Collaboration**: Multiple developers can work on different modules
- **Performance**: Easier to identify and optimize bottlenecks
- **Debugging**: Smaller surface area per module
- **Reusability**: Modules can be used independently

## Risks & Mitigation

- **Risk**: Breaking existing functionality
  - **Mitigation**: Test after each module extraction

- **Risk**: Introducing circular dependencies
  - **Mitigation**: Follow dependency order, use dependency injection

- **Risk**: Performance overhead from module loading
  - **Mitigation**: Modules are loaded once, no runtime overhead

## Success Criteria

- ✅ All 2,910 lines split into 10 modules + orchestrator
- ✅ Each module < 500 lines
- ✅ No duplicated code
- ✅ All existing functionality works
- ✅ Cursor, drawing, shapes, undo all work identically
- ✅ No console errors
