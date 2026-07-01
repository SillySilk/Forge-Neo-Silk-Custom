/**
 * Canvas State - Centralized state management for ForgeCanvas
 *
 * Manages all canvas state variables including:
 * - Drawing settings (color, width, alpha, softness, rotation, aspect)
 * - Shape system state (selected shape, fill mode, stroke color/width)
 * - Canvas geometry (image position, scale, size)
 * - Drawing mode flags (dragging, drawing, contrast mode)
 * - Configuration flags (no_upload, no_scribbles, no_shapes)
 */

export class CanvasState {
    constructor(config = {}) {
        // Configuration flags
        this.no_upload = config.no_upload || false;
        this.no_scribbles = config.no_scribbles || false;
        this.no_shapes = config.no_shapes || false;
        this.contrast_scribbles = config.contrast_scribbles || false;

        // Image state
        this.img = null;
        this.imgX = 0;
        this.imgY = 0;
        this.orgWidth = 0;
        this.orgHeight = 0;
        this.imgScale = 1.0;
        this.initial_height = config.initial_height || 512;

        // Drawing mode state
        this.dragging = false;
        this.dragged_just_now = false;
        this.drawing = false;
        this.contrast_pattern = null;

        // Scribble/Brush settings
        this.scribbleColor = config.scribbleColor || "#000000";
        this.scribbleColorFixed = config.scribbleColorFixed || false;
        this.scribbleWidth = config.scribbleWidth || 20;
        this.scribbleWidthFixed = config.scribbleWidthFixed || false;
        this.scribbleWidthConsistent = config.scribbleWidthConsistent || false;
        this.scribbleAlpha = config.scribbleAlpha || 100;
        this.scribbleAlphaFixed = config.scribbleAlphaFixed || false;
        this.scribbleSoftness = config.scribbleSoftness || 0;
        this.scribbleSoftnessFixed = config.scribbleSoftnessFixed || false;
        this.scribbleRotation = config.scribbleRotation || 0;
        this.scribbleRotationFixed = config.scribbleRotationFixed || false;
        this.scribbleAspect = config.scribbleAspect || 100;
        this.scribbleAspectFixed = config.scribbleAspectFixed || false;

        // Brush shape state
        this.brushShape = "circle";  // "circle" or "rectangle"
        this.lastLinePoint = null;  // Track last point for straight line drawing

        // Shape system state
        this.selectedShape = null;  // Current custom shape or null for brush
        this.shapeFillMode = true;  // true = filled, false = outline
        this.shapeOutlineWidth = 2;  // Stroke width for outline mode
        this.strokeColor = "#ffffff";  // Stroke/outline color (separate from fill)
        this.customShapes = [];  // User-imported shapes (future)

        // UI state
        this.maximized = false;
        this.originalState = {};
        this.pointerInsideContainer = false;

        // Temporary drawing state
        this.temp_draw_points = [];
        this.temp_draw_bg = null;

        // Keyboard state (for panning)
        this._held_W = false;
        this._held_A = false;
        this._held_S = false;
        this._held_D = false;
        this._held_Q = false;

        // Alpha backup for Shift-key eraser
        this._original_alpha = null;
    }

    /**
     * Get current drawing state for passing to renderers
     */
    getDrawingState() {
        return {
            scribbleColor: this.scribbleColor,
            scribbleWidth: this.scribbleWidth,
            scribbleAlpha: this.scribbleAlpha,
            scribbleSoftness: this.scribbleSoftness,
            scribbleRotation: this.scribbleRotation,
            scribbleAspect: this.scribbleAspect,
            brushShape: this.brushShape,
            selectedShape: this.selectedShape,
            shapeFillMode: this.shapeFillMode,
            shapeOutlineWidth: this.shapeOutlineWidth,
            strokeColor: this.strokeColor
        };
    }

    /**
     * Get current image state
     */
    getImageState() {
        return {
            img: this.img,
            imgX: this.imgX,
            imgY: this.imgY,
            orgWidth: this.orgWidth,
            orgHeight: this.orgHeight,
            imgScale: this.imgScale
        };
    }

    /**
     * Reset temporary drawing state
     */
    resetTempDrawing() {
        this.temp_draw_points = [];
        this.temp_draw_bg = null;
    }

    /**
     * Check if currently in eraser mode (Shift held)
     */
    isEraserMode() {
        return this._original_alpha !== null;
    }

    /**
     * Enter eraser mode (backup current alpha)
     */
    enterEraserMode() {
        if (this._original_alpha === null) {
            this._original_alpha = this.scribbleAlpha;
            this.scribbleAlpha = 100;
        }
    }

    /**
     * Exit eraser mode (restore alpha)
     */
    exitEraserMode() {
        if (this._original_alpha !== null) {
            this.scribbleAlpha = this._original_alpha;
            this._original_alpha = null;
        }
    }
}
