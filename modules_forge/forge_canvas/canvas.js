class GradioTextAreaBind {
    constructor(id, className) {
        this.target = document.querySelector(`#${id}.${className} textarea`);
        this.sync_lock = false;
        this.previousValue = "";
    }

    set_value(value) {
        if (this.sync_lock) return;
        this.sync_lock = true;
        this.target.value = value;
        this.previousValue = value;
        const event = new Event("input", { bubbles: true });
        Object.defineProperty(event, "target", { value: this.target });
        this.target.dispatchEvent(event);
        this.previousValue = value;
        this.sync_lock = false;
    }

    listen(callback) {
        setInterval(() => {
            if (this.target.value !== this.previousValue) {
                this.previousValue = this.target.value;
                if (this.sync_lock) return;
                this.sync_lock = true;
                callback(this.target.value);
                this.sync_lock = false;
            }
        }, 100);
    }
}

const HISTORY_LIMIT = 16;

class ForgeCanvas {
    constructor(
        uuid,
        no_upload = false,
        no_scribbles = false,
        no_shapes = false,
        contrast_scribbles = false,
        initial_height = 512,
        scribbleColor = "#000000",
        scribbleColorFixed = false,
        scribbleWidth = 20,
        scribbleWidthFixed = false,
        scribbleWidthConsistent = false,
        scribbleAlpha = 100,
        scribbleAlphaFixed = false,
        scribbleSoftness = 0,
        scribbleSoftnessFixed = false,
        scribbleRotation = 0,
        scribbleRotationFixed = false,
        scribbleHeight = 25,
        scribbleHeightFixed = false,
    ) {
        this.gradio_config = gradio_config;
        this.uuid = uuid;

        // Store instance globally for access by extensions (like eraser)
        if (!window.forgeCanvasInstances) {
            window.forgeCanvasInstances = {};
        }
        // Remove any stale instance for this UUID before registering the new one
        if (window.forgeCanvasInstances[uuid]) {
            delete window.forgeCanvasInstances[uuid];
        }
        window.forgeCanvasInstances[uuid] = this;

        this.no_upload = no_upload;
        this.no_scribbles = no_scribbles;
        this.no_shapes = no_shapes;
        this.contrast_scribbles = contrast_scribbles;

        this.img = null;
        this.imgX = 0;
        this.imgY = 0;
        this.orgWidth = 0;
        this.orgHeight = 0;
        this.imgScale = 1.0;
        this.initial_height = initial_height;

        this.dragging = false;
        this.dragged_just_now = false;
        this.drawing = false;
        this.contrast_pattern = null;

        this.scribbleColor = scribbleColor;
        this.scribbleColorFixed = scribbleColorFixed;
        this.scribbleWidth = scribbleWidth;
        this.scribbleWidthFixed = scribbleWidthFixed;
        this.scribbleWidthConsistent = scribbleWidthConsistent;
        this.scribbleAlpha = scribbleAlpha;
        this.scribbleAlphaFixed = scribbleAlphaFixed;
        this.scribbleSoftness = scribbleSoftness;
        this.scribbleSoftnessFixed = scribbleSoftnessFixed;
        this.scribbleRotation = scribbleRotation;
        this.scribbleRotationFixed = scribbleRotationFixed;
        this.scribbleHeight = scribbleHeight;
        this.scribbleHeightFixed = scribbleHeightFixed;
        this.scribbleSizeLinked = true;  // Default: link width and height together
        this.sizeRatio = scribbleWidth / scribbleHeight;  // Track width:height ratio
        this._linkUpdating = false;  // Guard against ratio feedback loop

        this.history = [];
        this.historyIndex = -1;
        this.maximized = false;
        this.originalState = {};
        this.pointerInsideContainer = false;
        this.temp_canvas = document.createElement("canvas");
        this.temp_draw_points = [];
        this.temp_draw_bg = null;

        this.background_gradio_bind = new GradioTextAreaBind(this.uuid, "logical_image_background");
        this.foreground_gradio_bind = new GradioTextAreaBind(this.uuid, "logical_image_foreground");
        this.init();

        this._held_W = false;
        this._held_A = false;
        this._held_S = false;
        this._held_D = false;
        this._held_Q = false;

        this._original_alpha = null;
        this.brushShape = "circle";  // "circle", "rectangle", or "triangle"
        this.scatterMode = false;  // Scatter brush: random offset + size jitter per stamp
        this.lastLinePoint = null;  // Track last point for straight line drawing

        // Shape system state
        this.selectedShape = null;  // Current custom shape or null for brush
        this.shapeFillMode = true;  // true = filled, false = outline
        this.shapeOutlineWidth = 0;  // Stroke width for outline mode
        this.strokeColor = "#ffffff";  // Stroke/outline color (separate from fill)
        this.customShapes = [];  // User-imported shapes (future)
    }

    // Built-in shape library
    // Shapes are defined in shapes.js and loaded as a global variable
    // This allows easy expansion of the shape library without modifying canvas.js
    getBuiltInShapes() {
        // Return shapes from global variable (loaded from shapes.js)
        return window.ForgeCanvasShapes || [];
    }

    // Build a radial gradient (solid center → transparent edge) for the gradient_circle shape.
    // Expects ctx already translated to circle center; uses radius 50 (matches 100x100 shape system).
    _buildRadialGradient(ctx, hexColor) {
        const c = (hexColor || "#000000").replace("#", "");
        const r = parseInt(c.slice(0, 2), 16) || 0;
        const g = parseInt(c.slice(2, 4), 16) || 0;
        const b = parseInt(c.slice(4, 6), 16) || 0;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
        grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
        grad.addColorStop(0.55, `rgba(${r},${g},${b},0.6)`);
        grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        return grad;
    }

    // Create a Path2D object from a shape definition
    createPath2DFromShape(shape) {
        if (!shape || !shape.path) return null;

        // Special cases handled separately in drawShapeStamp / thumbnail / cursor
        if (shape.path === "circle") return "circle";
        if (shape.path === "gradient_circle") return "gradient_circle";

        const path = new Path2D();

        for (let i = 0; i < shape.path.length; i++) {
            const point = shape.path[i];
            if (point.type === "M") {
                path.moveTo(point.x, point.y);
            } else if (point.type === "L") {
                path.lineTo(point.x, point.y);
            } else if (point.type === "Z") {
                path.closePath();
            } else if (point.type === "C") {
                // Cubic bezier curve: C cp1x cp1y cp2x cp2y x y
                path.bezierCurveTo(point.cp1x, point.cp1y, point.cp2x, point.cp2y, point.x, point.y);
            } else if (point.type === "Q") {
                // Quadratic bezier curve: Q cpx cpy x y
                path.quadraticCurveTo(point.cpx, point.cpy, point.x, point.y);
            } else if (point.type === "E") {
                // Ellipse: E cx cy rx ry rotation startAngle endAngle [anticlockwise]
                path.ellipse(point.cx, point.cy, point.rx, point.ry,
                    point.rotation || 0, point.startAngle || 0, point.endAngle || Math.PI * 2,
                    point.anticlockwise || false);
            }
        }

        return path;
    }

    // Draw a shape stamp at the specified location with transformations
    drawShapeStamp(ctx, x, y, width, height, rotation) {
        if (!this.selectedShape) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Scale: width/100 and height/100 convert from 100x100 coordinate system
        // Direct control over both dimensions
        const scaleX = width / 100;
        const scaleY = height / 100;
        ctx.scale(scaleX, scaleY);

        // Translate to center the shape (shapes are defined in 0-100 coordinate system)
        ctx.translate(-50, -50);

        const path = this.createPath2DFromShape(this.selectedShape);

        // Configure stroke style for clean edges
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Special handling for circle
        if (path === "circle") {
            ctx.translate(50, 50);  // Move back to center
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);  // radius 40 in 100x100 system

            // Draw stroke first at double width (since half will be covered by fill)
            if (this.shapeOutlineWidth > 0) {
                ctx.globalAlpha = this.scribbleAlpha / 100;
                ctx.strokeStyle = this.strokeColor;
                // Double the width and scale to get outer edge effect
                ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(width, height));
                ctx.stroke();
            }

            // Draw fill on top if enabled (this covers inner half of stroke)
            if (this.shapeFillMode) {
                ctx.fillStyle = this.scribbleColor;
                ctx.globalAlpha = this.scribbleAlpha / 100;
                ctx.fill();
            }
        } else if (path === "gradient_circle") {
            // Soft-edged radial fill — useful for feathered inpaint masks
            ctx.translate(50, 50);
            ctx.beginPath();
            ctx.arc(0, 0, 50, 0, Math.PI * 2);
            ctx.globalAlpha = this.scribbleAlpha / 100;
            ctx.fillStyle = this._buildRadialGradient(ctx, this.scribbleColor);
            ctx.fill();
            // Optional outline still respected
            if (this.shapeOutlineWidth > 0) {
                ctx.globalAlpha = this.scribbleAlpha / 100;
                ctx.strokeStyle = this.strokeColor;
                ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(width, height));
                ctx.stroke();
            }
        } else {
            // Regular path shapes

            // Draw stroke first at double width (since half will be covered by fill)
            if (this.shapeOutlineWidth > 0) {
                ctx.globalAlpha = this.scribbleAlpha / 100;
                ctx.strokeStyle = this.strokeColor;
                // Double the width and scale to get outer edge effect
                ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(width, height));
                ctx.stroke(path);
            }

            // Draw fill on top if enabled (this covers inner half of stroke)
            if (this.shapeFillMode) {
                ctx.globalAlpha = this.scribbleAlpha / 100;
                ctx.fillStyle = this.scribbleColor;
                ctx.fill(path);
            }
        }

        ctx.restore();
    }

    // Stamp a shape at the specified canvas coordinates
    stampShape(x, y) {
        if (!this.selectedShape) return;

        const canvas = this.drawingCanvas_;
        const ctx = canvas.getContext("2d");

        const width = this.scribbleWidth * 2;  // Direct width control
        const height = this.scribbleHeight * 2;  // Direct height control
        const rotation = (this.scribbleRotation * Math.PI) / 180;

        this.drawShapeStamp(ctx, x, y, width, height, rotation);
        // Note: saveState() removed from here - now called once in pointerup to avoid excessive undo steps
    }

    // Stamp shapes in a line from (x1, y1) to (x2, y2) for Ctrl+Click straight lines
    stampShapeLine(x1, y1, x2, y2) {
        if (!this.selectedShape) return;

        const canvas = this.drawingCanvas_;
        const ctx = canvas.getContext("2d");

        const width = this.scribbleWidth * 2;
        const height = this.scribbleHeight * 2;
        const rotation = (this.scribbleRotation * Math.PI) / 180;

        // Calculate spacing between shapes based on dimensions
        // Use smaller dimension for spacing calculation
        const minDimension = Math.min(width, height);
        const spacing = minDimension * 0.25;  // 25% spacing for distinct shapes

        // Calculate distance and number of stamps
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(1, Math.ceil(dist / spacing));

        // Interpolate and stamp shapes along the line
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            this.drawShapeStamp(ctx, x, y, width, height, rotation);
        }
    }

    // Generate a thumbnail canvas for a shape
    generateShapeThumbnail(shape, size = 30) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Draw shape centered
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.scale(size / 100 * 0.7, size / 100 * 0.7);  // 0.7 for padding
        ctx.translate(-50, -50);

        const path = this.createPath2DFromShape(shape);

        if (path === "circle") {
            ctx.translate(50, 50);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
        } else if (path === "gradient_circle") {
            ctx.translate(50, 50);
            ctx.beginPath();
            ctx.arc(0, 0, 50, 0, Math.PI * 2);
            ctx.fillStyle = this._buildRadialGradient(ctx, "#ffffff");
            ctx.fill();
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.fill(path);
        }

        ctx.restore();
        return canvas;
    }

    // Populate the shape palette with thumbnails
    populateShapePalette() {
        const palette = document.getElementById(`shapePalette_${this.uuid}`);
        if (!palette) return;

        palette.innerHTML = "";  // Clear existing content

        const shapes = this.getBuiltInShapes();

        // Check if shapes are loaded
        if (!shapes || shapes.length === 0) {
            console.error("ForgeCanvas: No shapes loaded! Check if shapes.js is loaded properly.");
            palette.innerHTML = '<div style="color: white; padding: 10px;">Error: Shapes not loaded. Please refresh the page.</div>';
            return;
        }

        const categories = {};

        // Group shapes by category
        shapes.forEach(shape => {
            if (!categories[shape.category]) {
                categories[shape.category] = [];
            }
            categories[shape.category].push(shape);
        });

        // Render each category
        Object.keys(categories).forEach(categoryName => {
            // Category header
            const categoryHeader = document.createElement("div");
            categoryHeader.className = "forge-shape-category";
            categoryHeader.textContent = categoryName;
            palette.appendChild(categoryHeader);

            // Category grid
            const grid = document.createElement("div");
            grid.className = "forge-shape-grid";

            categories[categoryName].forEach(shape => {
                const thumbnail = document.createElement("div");
                thumbnail.className = "forge-shape-thumbnail";
                thumbnail.dataset.shapeName = shape.name;
                thumbnail.title = shape.displayName;

                // Generate and append thumbnail canvas
                const thumbCanvas = this.generateShapeThumbnail(shape);
                thumbnail.appendChild(thumbCanvas);

                // Click handler
                thumbnail.addEventListener("click", () => {
                    this.selectShape(shape);
                    palette.style.display = "none";
                });

                grid.appendChild(thumbnail);
            });

            palette.appendChild(grid);
        });
    }

    // Update cursor indicator to show shape preview or brush shape
    updateCursorIndicator() {
        const scribbleIndicator = document.getElementById(`scribbleIndicator_${this.uuid}`);
        if (!scribbleIndicator) return;

        // If shape is selected, render it in the indicator
        if (this.selectedShape) {
            // Clear existing content and border style
            scribbleIndicator.style.border = "none";
            scribbleIndicator.innerHTML = "";
            // Apply centering and rotation via transform
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${this.scribbleRotation}deg)`;

            // Create canvas for shape preview
            // Size must match actual stamp appearance: scribbleWidth/Height * 2 * imgScale
            const previewWidth = this.scribbleWidth * 2 * this.imgScale;
            const previewHeight = this.scribbleHeight * 2 * this.imgScale;

            const canvas = document.createElement("canvas");
            canvas.width = previewWidth;
            canvas.height = previewHeight;
            canvas.style.width = `${previewWidth}px`;
            canvas.style.height = `${previewHeight}px`;
            canvas.style.pointerEvents = "none";

            const ctx = canvas.getContext("2d");

            // Draw shape centered on canvas
            // Scale matches actual stamp: size/100 converts from 100x100 coordinate system
            ctx.save();
            ctx.translate(previewWidth / 2, previewHeight / 2);
            ctx.scale(previewWidth / 100, previewHeight / 100);
            ctx.translate(-50, -50);

            const path = this.createPath2DFromShape(this.selectedShape);

            // Configure stroke style for clean edges
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            if (path === "circle") {
                ctx.translate(50, 50);
                ctx.beginPath();
                ctx.arc(0, 0, 40, 0, Math.PI * 2);

                // Draw stroke first at double width (since half will be covered by fill)
                if (this.shapeOutlineWidth > 0) {
                    ctx.strokeStyle = this.strokeColor;
                    // Double the width to get outer edge effect
                    ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(this.scribbleWidth, this.scribbleHeight));
                    ctx.stroke();
                }

                // Draw fill on top if enabled (this covers inner half of stroke)
                if (this.shapeFillMode) {
                    ctx.fillStyle = this.scribbleColor;
                    ctx.fill();
                }
            } else if (path === "gradient_circle") {
                ctx.translate(50, 50);
                ctx.beginPath();
                ctx.arc(0, 0, 50, 0, Math.PI * 2);
                ctx.fillStyle = this._buildRadialGradient(ctx, this.scribbleColor);
                ctx.fill();
                if (this.shapeOutlineWidth > 0) {
                    ctx.strokeStyle = this.strokeColor;
                    ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(this.scribbleWidth, this.scribbleHeight));
                    ctx.stroke();
                }
            } else {
                // Draw stroke first at double width (since half will be covered by fill)
                if (this.shapeOutlineWidth > 0) {
                    ctx.strokeStyle = this.strokeColor;
                    // Double the width to get outer edge effect
                    ctx.lineWidth = this.shapeOutlineWidth * 2 * (100 / Math.max(this.scribbleWidth, this.scribbleHeight));
                    ctx.stroke(path);
                }

                // Draw fill on top if enabled (this covers inner half of stroke)
                if (this.shapeFillMode) {
                    ctx.fillStyle = this.scribbleColor;
                    ctx.fill(path);
                }
            }

            ctx.restore();
            scribbleIndicator.appendChild(canvas);

            // Update indicator size
            scribbleIndicator.style.width = `${previewWidth}px`;
            scribbleIndicator.style.height = `${previewHeight}px`;
            scribbleIndicator.style.borderRadius = "0";
        } else {
            // Regular brush mode - show circle/rectangle/triangle border
            scribbleIndicator.innerHTML = "";
            scribbleIndicator.style.borderColor = this.scribbleColor;
            this.applyBrushIndicatorShape(scribbleIndicator);
            scribbleIndicator.style.transform = `rotate(${this.scribbleRotation}deg)`;

            // Calculate indicator size
            const indicatorWidth = this.scribbleWidth * (this.scribbleWidthConsistent ? 1.0 : this.imgScale) * 20;
            const indicatorHeight = this.scribbleHeight * (this.scribbleWidthConsistent ? 1.0 : this.imgScale) * 20;

            scribbleIndicator.style.width = `${indicatorWidth}px`;
            scribbleIndicator.style.height = `${indicatorHeight}px`;
        }
    }

    // Select a shape
    selectShape(shape) {
        this.selectedShape = shape;

        // Update picker button to show selected shape
        const pickerButton = document.getElementById(`shapePickerButton_${this.uuid}`);
        if (pickerButton) {
            // Extract emoji/symbol from displayName (first character before space)
            const symbol = shape.displayName.split(" ")[0];
            pickerButton.textContent = symbol;
        }

        // Update selected state in palette
        const palette = document.getElementById(`shapePalette_${this.uuid}`);
        if (palette) {
            palette.querySelectorAll(".forge-shape-thumbnail").forEach(thumb => {
                thumb.classList.remove("selected");
                if (thumb.dataset.shapeName === shape.name) {
                    thumb.classList.add("selected");
                }
            });
        }

        // Update cursor indicator to show shape
        this.updateCursorIndicator();
    }

    // Deselect shape (return to brush mode)
    deselectShape() {
        this.selectedShape = null;
        const pickerButton = document.getElementById(`shapePickerButton_${this.uuid}`);
        if (pickerButton) {
            pickerButton.textContent = "▲";
        }

        // Clear selected state
        const palette = document.getElementById(`shapePalette_${this.uuid}`);
        if (palette) {
            palette.querySelectorAll(".forge-shape-thumbnail").forEach(thumb => {
                thumb.classList.remove("selected");
            });
        }

        // Restore brush cursor indicator
        this.updateCursorIndicator();
    }

    init() {
        const self = this;
        const container = document.getElementById(`container_${self.uuid}`);
        const imageContainer = document.getElementById(`imageContainer_${self.uuid}`);
        const drawingCanvas = document.getElementById(`drawingCanvas_${self.uuid}`);
        const toolbar = document.getElementById(`toolbar_${self.uuid}`);

        const maxButton = document.getElementById(`maxButton_${self.uuid}`);
        const minButton = document.getElementById(`minButton_${self.uuid}`);
        const uploadButton = document.getElementById(`uploadButton_${self.uuid}`);
        const removeButton = document.getElementById(`removeButton_${self.uuid}`);
        const centerButton = document.getElementById(`centerButton_${self.uuid}`);
        const resetButton = document.getElementById(`resetButton_${self.uuid}`);
        const undoButton = document.getElementById(`undoButton_${self.uuid}`);
        const redoButton = document.getElementById(`redoButton_${self.uuid}`);
        const brushShapeButton = document.getElementById(`brushShapeButton_${self.uuid}`);
        const scatterButton = document.getElementById(`scatterButton_${self.uuid}`);
        const shapePickerButton = document.getElementById(`shapePickerButton_${self.uuid}`);
        const shapePalette = document.getElementById(`shapePalette_${self.uuid}`);
        const shapeFillModeButton = document.getElementById(`shapeFillModeButton_${self.uuid}`);
        const sizeLinkButton = document.getElementById(`sizeLinkButton_${self.uuid}`);
        const equalizeButton = document.getElementById(`equalizeButton_${self.uuid}`);

        // Hide shape-related UI elements if shapes are disabled
        if (self.no_shapes) {
            if (shapePickerButton) shapePickerButton.style.display = "none";
            if (shapeFillModeButton) shapeFillModeButton.style.display = "none";
        }

        const uploadHint = document.getElementById(`uploadHint_${self.uuid}`);
        const scribbleIndicator = document.getElementById(`scribbleIndicator_${self.uuid}`);

        minButton.style.display = "none";
        this.maximized = false;

        const scribbleColorBlock = document.getElementById(`scribbleColorBlock_${self.uuid}`);
        if (self.scribbleColorFixed) scribbleColorBlock.style.display = "none";
        const scribbleColor = document.getElementById(`scribbleColor_${self.uuid}`);
        scribbleColor.value = self.scribbleColor;

        const strokeColorBlock = document.getElementById(`strokeColorBlock_${self.uuid}`);
        const strokeColor = document.getElementById(`strokeColor_${self.uuid}`);
        strokeColor.value = self.strokeColor;
        if (self.no_shapes && strokeColorBlock) strokeColorBlock.style.display = "none";

        const scribbleWidthBlock = document.getElementById(`scribbleWidthBlock_${self.uuid}`);
        if (self.scribbleWidthFixed) scribbleWidthBlock.style.display = "none";
        const scribbleWidth = document.getElementById(`scribbleWidth_${self.uuid}`);
        const scribbleWidthLabel = document.getElementById(`widthLabel_${self.uuid}`);
        scribbleWidth.value = self.scribbleWidth;
        scribbleWidthLabel.textContent = `Brush Width (${self.scribbleWidth})`;

        const scribbleAlphaBlock = document.getElementById(`scribbleAlphaBlock_${self.uuid}`);
        if (self.scribbleAlphaFixed) scribbleAlphaBlock.style.display = "none";
        const scribbleAlpha = document.getElementById(`scribbleAlpha_${self.uuid}`);
        const scribbleAlphaLabel = document.getElementById(`alphaLabel_${self.uuid}`);
        scribbleAlpha.value = self.scribbleAlpha;
        scribbleAlphaLabel.textContent = `Brush Opacity (${self.scribbleAlpha})`;

        const scribbleSoftnessBlock = document.getElementById(`scribbleSoftnessBlock_${self.uuid}`);
        if (self.scribbleSoftnessFixed) scribbleSoftnessBlock.style.display = "none";
        const scribbleSoftness = document.getElementById(`scribbleSoftness_${self.uuid}`);
        const scribbleSoftnessLabel = document.getElementById(`softnessLabel_${self.uuid}`);
        scribbleSoftness.value = self.scribbleSoftness;
        scribbleSoftnessLabel.textContent = `Brush Softness (${self.scribbleSoftness})`;

        const scribbleRotationBlock = document.getElementById(`scribbleRotationBlock_${self.uuid}`);
        if (self.scribbleRotationFixed) scribbleRotationBlock.style.display = "none";
        const scribbleRotation = document.getElementById(`scribbleRotation_${self.uuid}`);
        const scribbleRotationLabel = document.getElementById(`rotationLabel_${self.uuid}`);
        scribbleRotation.value = self.scribbleRotation;
        scribbleRotationLabel.textContent = `Brush Rotation (${self.scribbleRotation}°)`;

        const scribbleHeightBlock = document.getElementById(`scribbleHeightBlock_${self.uuid}`);
        if (self.scribbleHeightFixed) scribbleHeightBlock.style.display = "none";
        const scribbleHeight = document.getElementById(`scribbleHeight_${self.uuid}`);
        const scribbleHeightLabel = document.getElementById(`heightLabel_${self.uuid}`);
        scribbleHeight.value = self.scribbleHeight;
        scribbleHeightLabel.textContent = `Brush Height (${self.scribbleHeight})`;

        const strokeWidthBlock = document.getElementById(`strokeWidthBlock_${self.uuid}`);
        const strokeWidth = document.getElementById(`strokeWidth_${self.uuid}`);
        const strokeWidthLabel = document.getElementById(`strokeWidthLabel_${self.uuid}`);
        strokeWidth.value = self.shapeOutlineWidth;
        strokeWidthLabel.textContent = `Stroke Width (${self.shapeOutlineWidth})`;
        if (self.no_shapes && strokeWidthBlock) strokeWidthBlock.style.display = "none";

        const indicatorWidth = self.scribbleWidth;
        const indicatorHeight = self.scribbleHeight;
        scribbleIndicator.style.width = `${indicatorWidth}px`;
        scribbleIndicator.style.height = `${indicatorHeight}px`;
        self.applyBrushIndicatorShape(scribbleIndicator);
        scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;

        container.style.height = `${self.initial_height}px`;
        drawingCanvas.width = imageContainer.clientWidth;
        drawingCanvas.height = imageContainer.clientHeight;

        const drawContext = drawingCanvas.getContext("2d", { willReadFrequently: true });
        self.drawingCanvas_ = drawingCanvas;

        if (self.no_scribbles) {
            toolbar.querySelector(".forge-toolbar-box-b").style.display = "none";
            toolbar.removeAttribute("title");
            resetButton.style.display = "none";
            undoButton.style.display = "none";
            redoButton.style.display = "none";
        }

        if (self.no_upload) {
            uploadButton.style.display = "none";
            uploadHint.style.display = "none";
        }

        if (self.contrast_scribbles) {
            const size = 10;
            const tempCanvas = self.temp_canvas;
            tempCanvas.width = size * 2;
            tempCanvas.height = size * 2;
            const tempCtx = tempCanvas.getContext("2d");
            tempCtx.fillStyle = "#ffffff";
            tempCtx.fillRect(0, 0, size, size);
            tempCtx.fillRect(size, size, size, size);
            tempCtx.fillStyle = "#000000";
            tempCtx.fillRect(size, 0, size, size);
            tempCtx.fillRect(0, size, size, size);
            self.contrast_pattern = drawContext.createPattern(tempCanvas, "repeat");
            drawingCanvas.style.opacity = "0.5";
        }

        function resetScribble(e, rect) {
            // If shape is selected, update the shape preview (which includes size calculation)
            if (self.selectedShape) {
                self.updateCursorIndicator();
                // Position at cursor with centering
                scribbleIndicator.style.left = `${e.clientX - rect.left}px`;
                scribbleIndicator.style.top = `${e.clientY - rect.top}px`;
                scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
                return;
            }

            // Regular brush mode
            // Stamp is drawn at canvas size, which appears as canvas_size * imgScale in screen pixels
            const indicatorWidth = self.scribbleWidth * self.imgScale;
            const indicatorHeight = self.scribbleHeight * self.imgScale;
            scribbleIndicator.style.width = `${indicatorWidth}px`;
            scribbleIndicator.style.height = `${indicatorHeight}px`;
            // Position at cursor and use transform for centering + rotation
            // This ensures rotation happens around the visual center
            scribbleIndicator.style.left = `${e.clientX - rect.left}px`;
            scribbleIndicator.style.top = `${e.clientY - rect.top}px`;
            // Maintain brush shape
            self.applyBrushIndicatorShape(scribbleIndicator);
            // Apply centering and rotation via transform
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
        }

        function endStroke() {
            if (!self.drawing) return;
            // CUSTOM (Forge Neo): update last point to end of current stroke for
            // straight-line continuation (Ctrl+click).
            if (self.temp_draw_points.length > 0) {
                self.lastLinePoint = self.temp_draw_points[self.temp_draw_points.length - 1];
            }
            self.drawing = false;
            drawingCanvas.style.cursor = "";
            scribbleIndicator.style.display = "none";
            self.saveState();
        }

        const resizeObserver = new ResizeObserver(() => {
            self.adjustInitialPositionAndScale();
            self.drawImage();
        });
        resizeObserver.observe(container);

        document.getElementById(`imageInput_${self.uuid}`).addEventListener("change", (e) => {
            self.handleFileUpload(e.target.files[0]);
        });

        uploadButton.addEventListener("click", () => {
            if (self.no_upload) return;
            document.getElementById(`imageInput_${self.uuid}`).click();
        });

        removeButton.addEventListener("click", () => {
            self.resetImage();
            self.removeImage();
        });

        centerButton.addEventListener("click", () => {
            self.adjustInitialPositionAndScale();
            self.drawImage();
        });

        resetButton.addEventListener("click", () => {
            self.resetImage();
        });

        undoButton.addEventListener("click", () => {
            self.undo();
        });

        redoButton.addEventListener("click", () => {
            self.redo();
        });

        brushShapeButton.addEventListener("click", () => {
            self.toggleBrushShape();
            brushShapeButton.textContent = { circle: "○", rectangle: "□", triangle: "△" }[self.brushShape] || "○";
        });

        // Scatter brush toggle - randomizes stamp position and size during stroke
        if (scatterButton) {
            scatterButton.addEventListener("click", () => {
                self.scatterMode = !self.scatterMode;
                scatterButton.textContent = self.scatterMode ? "✦" : "⋯";
                scatterButton.style.background = self.scatterMode ? "rgba(100, 200, 255, 0.3)" : "";
                scatterButton.title = self.scatterMode
                    ? "Toggle Scatter Brush [N] — currently ON"
                    : "Toggle Scatter Brush [N] — random offset & size per stamp";
            });
        }

        // Shape picker button - toggle palette display
        shapePickerButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const isVisible = shapePalette.style.display !== "none";
            shapePalette.style.display = isVisible ? "none" : "block";

            // Populate palette on first open
            if (!isVisible && shapePalette.children.length === 0) {
                self.populateShapePalette();
            }
        });

        // Fill/outline mode toggle button
        shapeFillModeButton.addEventListener("click", () => {
            self.shapeFillMode = !self.shapeFillMode;
            shapeFillModeButton.textContent = self.shapeFillMode ? "■" : "□";
        });

        // Size link button - toggle width/height linking
        sizeLinkButton.addEventListener("click", () => {
            self.scribbleSizeLinked = !self.scribbleSizeLinked;
            sizeLinkButton.textContent = self.scribbleSizeLinked ? "🔗" : "🔓";
            sizeLinkButton.title = self.scribbleSizeLinked
                ? "Link/Unlink Width and Height [L] - Currently Linked (Proportional)"
                : "Link/Unlink Width and Height [L] - Currently Unlinked";

            // When linking, capture the current ratio
            if (self.scribbleSizeLinked) {
                self.sizeRatio = self.scribbleWidth / self.scribbleHeight;
                console.log(`Sizes linked with ratio ${self.scribbleWidth}:${self.scribbleHeight} (${self.sizeRatio.toFixed(2)})`);
            }
        });

        // Equalize button - make width and height equal
        equalizeButton.addEventListener("click", () => {
            // Use the average of current width and height
            const avgSize = Math.round((parseInt(self.scribbleWidth) + parseInt(self.scribbleHeight)) / 2);
            self.scribbleWidth = avgSize;
            self.scribbleHeight = avgSize;
            scribbleWidth.value = avgSize;
            scribbleHeight.value = avgSize;
            scribbleWidthLabel.textContent = `Brush Width (${avgSize})`;
            scribbleHeightLabel.textContent = `Brush Height (${avgSize})`;

            // Update ratio to 1:1
            self.sizeRatio = 1.0;

            // Update cursor indicator
            const indicatorWidth = self.scribbleWidth * self.imgScale;
            const indicatorHeight = self.scribbleHeight * self.imgScale;
            scribbleIndicator.style.width = `${indicatorWidth}px`;
            scribbleIndicator.style.height = `${indicatorHeight}px`;
            self.applyBrushIndicatorShape(scribbleIndicator);
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
            if (self.selectedShape) {
                self.updateCursorIndicator();
            }

            console.log(`Sizes equalized to ${avgSize}x${avgSize}`);
        });

        // Close shape palette when clicking outside
        document.addEventListener("click", (e) => {
            if (shapePalette && shapePalette.style.display !== "none") {
                if (!shapePickerButton.contains(e.target) && !shapePalette.contains(e.target)) {
                    shapePalette.style.display = "none";
                }
            }
        });

        scribbleColor.addEventListener("input", (e) => {
            self.scribbleColor = e.target.value;
            scribbleIndicator.style.borderColor = self.scribbleColor;
        });

        strokeColor.addEventListener("input", (e) => {
            self.strokeColor = e.target.value;
        });

        scribbleWidth.addEventListener("input", (e) => {
            self.scribbleWidth = e.target.value;
            scribbleWidthLabel.textContent = `Brush Width (${self.scribbleWidth})`;

            // If linked, adjust height to maintain ratio (guard against feedback loop)
            if (self.scribbleSizeLinked && !self._linkUpdating) {
                self._linkUpdating = true;
                self.scribbleHeight = Math.round(self.scribbleWidth / self.sizeRatio);
                scribbleHeight.value = self.scribbleHeight;
                scribbleHeightLabel.textContent = `Brush Height (${self.scribbleHeight})`;
                self._linkUpdating = false;
            }

            // Stamp is drawn at canvas size, which appears as canvas_size * imgScale in screen pixels
            const indicatorWidth = self.scribbleWidth * self.imgScale;
            const indicatorHeight = self.scribbleHeight * self.imgScale;
            scribbleIndicator.style.width = `${indicatorWidth}px`;
            scribbleIndicator.style.height = `${indicatorHeight}px`;
            // Maintain brush shape and rotation
            self.applyBrushIndicatorShape(scribbleIndicator);
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
            // Update shape preview if shape is selected
            if (self.selectedShape) {
                self.updateCursorIndicator();
            }
        });

        scribbleAlpha.addEventListener("input", (e) => {
            self.scribbleAlpha = e.target.value;
            scribbleAlphaLabel.textContent = `Brush Opacity (${self.scribbleAlpha})`;
        });

        scribbleSoftness.addEventListener("input", (e) => {
            self.scribbleSoftness = e.target.value;
            scribbleSoftnessLabel.textContent = `Brush Softness (${self.scribbleSoftness})`;
        });

        scribbleRotation.addEventListener("input", (e) => {
            self.scribbleRotation = e.target.value;
            scribbleRotationLabel.textContent = `Brush Rotation (${self.scribbleRotation}°)`;
            // Update indicator rotation
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
            // Update shape preview if shape is selected
            if (self.selectedShape) {
                self.updateCursorIndicator();
            }
        });

        // Click any slider label to type an exact value inline
        function makeSliderEditable(label, slider) {
            label.style.cursor = "pointer";
            label.title = "Click to type a value";
            label.addEventListener("click", () => {
                if (label.querySelector("input")) return; // already editing
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                const step = parseFloat(slider.step) || 1;
                const isFloat = step < 1;
                const currentVal = isFloat ? parseFloat(slider.value) : parseInt(slider.value);
                const originalText = label.textContent;
                let applied = false;

                const inp = document.createElement("input");
                inp.type = "number";
                inp.min = min;
                inp.max = max;
                inp.step = isFloat ? step : 1;
                inp.value = currentVal;
                inp.className = "forge-label-input";

                label.textContent = "";
                label.appendChild(inp);
                inp.focus();
                inp.select();

                function apply() {
                    if (applied) return;
                    applied = true;
                    const raw = parseFloat(inp.value);
                    const val = isFloat ? raw : Math.round(raw);
                    if (!isNaN(val) && val >= min && val <= max) {
                        slider.value = val;
                        slider.dispatchEvent(new Event("input", { bubbles: true }));
                    } else {
                        label.textContent = originalText;
                    }
                }

                inp.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") { e.preventDefault(); apply(); inp.blur(); }
                    if (e.key === "Escape") { applied = true; label.textContent = originalText; }
                });
                inp.addEventListener("blur", apply);
            });
        }

        makeSliderEditable(scribbleWidthLabel, scribbleWidth);
        makeSliderEditable(scribbleHeightLabel, scribbleHeight);
        makeSliderEditable(scribbleAlphaLabel, scribbleAlpha);
        makeSliderEditable(scribbleSoftnessLabel, scribbleSoftness);
        makeSliderEditable(scribbleRotationLabel, scribbleRotation);
        makeSliderEditable(strokeWidthLabel, strokeWidth);

        scribbleHeight.addEventListener("input", (e) => {
            self.scribbleHeight = e.target.value;
            scribbleHeightLabel.textContent = `Brush Height (${self.scribbleHeight})`;

            // If linked, adjust width to maintain ratio (guard against feedback loop)
            if (self.scribbleSizeLinked && !self._linkUpdating) {
                self._linkUpdating = true;
                self.scribbleWidth = Math.round(self.scribbleHeight * self.sizeRatio);
                scribbleWidth.value = self.scribbleWidth;
                scribbleWidthLabel.textContent = `Brush Width (${self.scribbleWidth})`;
                self._linkUpdating = false;
            }

            // Stamp is drawn at canvas size, which appears as canvas_size * imgScale in screen pixels
            const indicatorWidth = self.scribbleWidth * self.imgScale;
            const indicatorHeight = self.scribbleHeight * self.imgScale;
            scribbleIndicator.style.width = `${indicatorWidth}px`;
            scribbleIndicator.style.height = `${indicatorHeight}px`;
            // Maintain brush shape and rotation
            self.applyBrushIndicatorShape(scribbleIndicator);
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${self.scribbleRotation}deg)`;
            // Update shape preview if shape is selected
            if (self.selectedShape) {
                self.updateCursorIndicator();
            }
        });

        strokeWidth.addEventListener("input", (e) => {
            self.shapeOutlineWidth = parseFloat(e.target.value);
            strokeWidthLabel.textContent = `Stroke Width (${self.shapeOutlineWidth})`;
            // Update shape preview if shape is selected
            if (self.selectedShape) {
                self.updateCursorIndicator();
            }
        });

        drawingCanvas.addEventListener("pointerdown", (e) => {
            if (!self.img || e.button !== 0 || self.no_scribbles) return;
            e.preventDefault();
            drawingCanvas.setPointerCapture(e.pointerId);
            const rect = drawingCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / self.imgScale;
            const y = (e.clientY - rect.top) / self.imgScale;

            // If a shape is selected, stamp it instead of drawing
            if (self.selectedShape) {
                // Ctrl+Click for straight line with shapes
                if (e.ctrlKey && self.lastLinePoint !== null) {
                    self.stampShapeLine(self.lastLinePoint[0], self.lastLinePoint[1], x, y);
                } else {
                    self.stampShape(x, y);
                }
                self.lastLinePoint = [x, y];  // Update last point for next Ctrl+click
                self.saveState();
                return;
            }

            // Ctrl+Click for straight line from last point
            if (e.ctrlKey && self.lastLinePoint !== null) {
                self.temp_draw_bg = drawContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
                self.temp_draw_points = [self.lastLinePoint, [x, y]];
                self.handleDraw(e);
                self.saveState();
                self.lastLinePoint = [x, y];  // Update last point
                return;
            }

            // Normal drawing start
            self.drawing = true;
            drawingCanvas.style.cursor = "crosshair";
            scribbleIndicator.style.display = "none";
            self.temp_draw_points = [[x, y]];
            self.temp_draw_bg = drawContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
            self.lastLinePoint = [x, y];  // Track starting point for straight lines
            self.handleDraw(e);
        });

        drawingCanvas.addEventListener("pointermove", (e) => {
            if (self.drawing) self.handleDraw(e);
            if (self.img && !self.drawing && !self.dragging && !self.no_scribbles) {
                // Use imageContainer rect since scribbleIndicator is positioned relative to it
                const rect = imageContainer.getBoundingClientRect();
                resetScribble(e, rect);
                scribbleIndicator.style.display = "inline-block";
            }
        });

        toolbar.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
        });

        drawingCanvas.addEventListener("pointerup", (e) => {
            if (drawingCanvas.hasPointerCapture(e.pointerId)) drawingCanvas.releasePointerCapture(e.pointerId);
            endStroke();
        });

        drawingCanvas.addEventListener("pointercancel", (e) => {
            if (drawingCanvas.hasPointerCapture(e.pointerId)) drawingCanvas.releasePointerCapture(e.pointerId);
            endStroke();
        });

        drawingCanvas.addEventListener("pointerout", (e) => {
            scribbleIndicator.style.display = "none";
            if (!drawingCanvas.hasPointerCapture(e.pointerId)) return;
            endStroke();
        });

        container.addEventListener("pointerdown", (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (e.button === 2 && self.isInsideImage(x, y)) {
                self.dragging = true;
                self.offsetX = x - self.imgX;
                self.offsetY = y - self.imgY;
                imageContainer.style.cursor = "grabbing";
                drawingCanvas.style.cursor = "grabbing";
                scribbleIndicator.style.display = "none";
            } else if (e.button === 0 && !self.img && !self.no_upload) {
                document.getElementById(`imageInput_${self.uuid}`).click();
            }
        });

        container.addEventListener("pointermove", (e) => {
            if (self.dragging) {
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                self.imgX = x - self.offsetX;
                self.imgY = y - self.offsetY;
                self.drawImage();
                self.dragged_just_now = true;
            }
        });

        container.addEventListener("pointerup", (e) => {
            if (self.dragging) self.handleDragEnd(e, false);
        });

        container.addEventListener("pointerout", (e) => {
            if (self.dragging) self.handleDragEnd(e, true);
        });

        container.addEventListener("wheel", (e) => {
            if (!self.img) return;
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            let scale = true;

            if (this._held_W) {
                // Width (and height if linked)
                const newValue = parseInt(scribbleWidth.value) - Math.sign(e.deltaY) * 3;
                scribbleWidth.value = newValue;
                updateInput(scribbleWidth);

                // If linked, update height to maintain ratio
                if (this.scribbleSizeLinked) {
                    scribbleHeight.value = Math.round(newValue / this.sizeRatio);
                    updateInput(scribbleHeight);
                }

                const rect = container.getBoundingClientRect();
                resetScribble(e, rect);
                scale = false;
            }
            if (this._held_A && !this.scribbleAlphaFixed) {
                // Alpha (Opacity)
                scribbleAlpha.value = parseInt(scribbleAlpha.value) - Math.sign(e.deltaY) * 5;
                updateInput(scribbleAlpha);
                scale = false;
            }
            if (this._held_S) {
                // Softness
                scribbleSoftness.value = parseInt(scribbleSoftness.value) - Math.sign(e.deltaY) * 5;
                updateInput(scribbleSoftness);
                scale = false;
            }
            if (this._held_D) {
                // Rotation
                scribbleRotation.value = parseInt(scribbleRotation.value) - Math.sign(e.deltaY) * 5;
                updateInput(scribbleRotation);
                scale = false;
            }
            if (this._held_Q) {
                // Height (and width if linked)
                const newValue = parseInt(scribbleHeight.value) - Math.sign(e.deltaY) * 3;
                scribbleHeight.value = newValue;
                updateInput(scribbleHeight);

                // If linked, update width to maintain ratio
                if (this.scribbleSizeLinked) {
                    scribbleWidth.value = Math.round(newValue * this.sizeRatio);
                    updateInput(scribbleWidth);
                }

                const rect = container.getBoundingClientRect();
                resetScribble(e, rect);
                scale = false;
            }

            if (!scale) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const oldScale = self.imgScale;
            self.imgScale += delta;
            self.imgScale = Math.max(0.1, self.imgScale);
            const newScale = self.imgScale / oldScale;
            self.imgX = x - (x - self.imgX) * newScale;
            self.imgY = y - (y - self.imgY) * newScale;
            self.drawImage();
            resetScribble(e, rect);
        });

        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            self.dragged_just_now = false;
            return false;
        });

        container.addEventListener("dragleave", () => {
            toolbar.style.opacity = "0";
            imageContainer.style.cursor = "";
            drawingCanvas.style.cursor = "";
            container.style.cursor = "";
            scribbleIndicator.style.display = "none";
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        for (const e of ["dragenter", "dragover", "dragleave", "drop"]) {
            container.addEventListener(e, preventDefaults, false);
        }

        container.addEventListener("dragenter", () => {
            imageContainer.style.cursor = "copy";
            drawingCanvas.style.cursor = "copy";
        });

        container.addEventListener("dragleave", () => {
            imageContainer.style.cursor = "";
            drawingCanvas.style.cursor = "";
        });

        container.addEventListener("drop", (e) => {
            imageContainer.style.cursor = "";
            drawingCanvas.style.cursor = "";
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) self.handleFileUpload(files[0]);
        });

        container.addEventListener("pointerenter", () => {
            self.pointerInsideContainer = true;
            toolbar.style.opacity = "1";
            if (!self.img && !self.no_upload) container.style.cursor = "pointer";
        });

        container.addEventListener("pointerleave", () => {
            self.pointerInsideContainer = false;
            toolbar.style.opacity = "0";
        });

        document.addEventListener("paste", (e) => {
            if (self.pointerInsideContainer) self.handlePaste(e);
        });

        document.addEventListener("keydown", (e) => {
            if (!self.pointerInsideContainer) return;
            // CUSTOM (Forge Neo): built-in Shift-key eraser disabled to avoid conflict
            // with the ForgeUI-MaskEraser extension. Upstream re-enables it; keep ours.
            // if (e.shiftKey) {
            //     e.preventDefault();
            //     if (this._original_alpha === null) this._original_alpha = scribbleAlpha.value;
            //     scribbleAlpha.value = 0.0;
            //     updateInput(scribbleAlpha);
            //     scribbleIndicator.style.border = "2px dotted";
            //     return;
            // }
            if (e.ctrlKey && e.key === "z") {
                e.preventDefault();
                this.undo();
            }
            if (e.ctrlKey && e.key === "y") {
                e.preventDefault();
                this.redo();
            }
            if (e.ctrlKey && e.key === "x") {
                e.preventDefault();
                this.resetImage();
            }
            if (e.key === "e") {
                scribbleColor.click();
            }
            if (e.key === "r") {
                centerButton.click();
            }
            if (e.key === "f") {
                if (maxButton.style.display === "none") minButton.click();
                else maxButton.click();
            }
            if (e.key === "b") {
                self.toggleBrushShape();
                brushShapeButton.textContent = { circle: "○", rectangle: "□", triangle: "△" }[self.brushShape] || "○";
            }
            if (e.key === "n" && scatterButton) {
                scatterButton.click();
            }
            if (e.key === "g") {
                shapePickerButton.click();
            }
            if (e.key === "h") {
                shapeFillModeButton.click();
            }
            if (e.key === "l") {
                sizeLinkButton.click();
            }
            if (e.key === "=") {
                equalizeButton.click();
            }

            if (e.key === "w") this._held_W = true;
            if (e.key === "a") this._held_A = true;
            if (e.key === "s") this._held_S = true;
            if (e.key === "d") this._held_D = true;
            if (e.key === "q") this._held_Q = true;
        });

        document.addEventListener("keyup", () => {
            this._held_W = false;
            this._held_A = false;
            this._held_S = false;
            this._held_D = false;
            this._held_Q = false;

            // Disabled built-in Shift key eraser restoration to avoid conflict with ForgeUI-MaskEraser extension
            // if (this._original_alpha !== null) {
            //     scribbleAlpha.value = this._original_alpha;
            //     this._original_alpha = null;
            //     updateInput(scribbleAlpha);
            //     scribbleIndicator.style.border = "1px solid";
            // }
        });

        maxButton.addEventListener("click", () => {
            self.maximize();
        });

        minButton.addEventListener("click", () => {
            self.minimize();
        });

        self.updateUndoRedoButtons();

        self.background_gradio_bind.listen((value) => {
            self.loadImage(value);
        });

        self.foreground_gradio_bind.listen((value) => {
            self.loadDrawing(value);
        });
    }

    handleDraw(e) {
        const canvas = this.drawingCanvas_;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.imgScale;
        const y = (e.clientY - rect.top) / this.imgScale;

        this.temp_draw_points.push([x, y]);
        ctx.putImageData(this.temp_draw_bg, 0, 0);

        // Need stamp-based rendering for: rotation, non-equal dimensions, rectangles, triangles, or scatter mode
        const needsStampRendering = this.scribbleRotation > 0 || this.scribbleWidth !== this.scribbleHeight || this.brushShape !== "circle" || this.scatterMode;

        if (needsStampRendering) {
            this.drawWithStamps(ctx, canvas);
        } else {
            // Use traditional line-based rendering (only for circles with no rotation and 1:1 aspect)
            ctx.beginPath();
            ctx.moveTo(this.temp_draw_points[0][0], this.temp_draw_points[0][1]);

            for (let i = 1; i < this.temp_draw_points.length; i++) {
                ctx.lineTo(this.temp_draw_points[i][0], this.temp_draw_points[i][1]);
            }

            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = this.scribbleWidth / (this.scribbleWidthConsistent ? this.imgScale : 1.0);

            if (this.contrast_scribbles) {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = this.contrast_pattern;
                ctx.stroke();
                return;
            }

            ctx.strokeStyle = this.scribbleColor;

            if (this.scribbleAlpha <= 0) {
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.globalAlpha = 1.0;
                ctx.stroke();
                ctx.restore();
                return;
            }

            // Preserve eraser mode if it's active (set by eraser extension)
            if (ctx.globalCompositeOperation !== "destination-out") {
                ctx.globalCompositeOperation = "source-over";
            }

            canvas.style.opacity = 1.0;
            let drawingAlpha = this.scribbleAlpha;

            if (this.scribbleAlphaFixed) {
                canvas.style.opacity = this.scribbleAlpha / 100.0;
                drawingAlpha = 100.0;
            }

            if (this.scribbleSoftness <= 0) {
                ctx.globalAlpha = drawingAlpha / 100.0;
                ctx.stroke();
                return;
            }

            const innerWidth = ctx.lineWidth * (1 - this.scribbleSoftness / 96);
            const outerWidth = ctx.lineWidth * (1 + this.scribbleSoftness / 96);
            const steps = Math.round(5 + this.scribbleSoftness / 5);
            const stepWidth = (outerWidth - innerWidth) / (steps - 1);

            ctx.globalAlpha = 1.0 - Math.pow(1.0 - Math.min(drawingAlpha / 100, 0.95), 1.0 / steps);

            for (let i = 0; i < steps; i++) {
                ctx.lineWidth = innerWidth + stepWidth * i;
                ctx.stroke();
            }
        }
    }

    drawWithStamps(ctx, canvas) {
        const brushWidth = this.scribbleWidth / (this.scribbleWidthConsistent ? this.imgScale : 1.0);
        const brushHeight = this.scribbleHeight / (this.scribbleWidthConsistent ? this.imgScale : 1.0);
        const rotationRad = (this.scribbleRotation * Math.PI) / 180;

        canvas.style.opacity = 1.0;
        let drawingAlpha = this.scribbleAlpha;

        if (this.scribbleAlphaFixed) {
            canvas.style.opacity = this.scribbleAlpha / 100.0;
            drawingAlpha = 100.0;
        }

        const eraserMode = this.scribbleAlpha <= 0;
        if (eraserMode) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1.0;
        } else {
            // Preserve eraser mode if it's active (set by eraser extension)
            if (ctx.globalCompositeOperation !== "destination-out") {
                ctx.globalCompositeOperation = "source-over";
            }
        }

        ctx.fillStyle = this.scribbleColor;

        // Calculate spacing between stamps to ensure smooth appearance.
        // Scatter mode uses much larger spacing so individual stamps are distinct.
        const minDimension = Math.min(brushWidth, brushHeight);
        const spacing = this.scatterMode ? minDimension * 0.5 : minDimension * 0.1;
        const scatterRange = minDimension * 0.7;  // max offset radius in scatter mode

        const stampOne = (cx, cy) => {
            if (this.scatterMode) {
                const offsetAngle = Math.random() * Math.PI * 2;
                const offsetMag = Math.random() * scatterRange;
                const sizeJitter = 0.6 + Math.random() * 0.6;  // 0.6 - 1.2
                const rotJitter = (Math.random() - 0.5) * 0.5;  // ±~14°
                this.drawStamp(
                    ctx,
                    cx + Math.cos(offsetAngle) * offsetMag,
                    cy + Math.sin(offsetAngle) * offsetMag,
                    brushWidth * sizeJitter,
                    brushHeight * sizeJitter,
                    rotationRad + rotJitter,
                    drawingAlpha
                );
            } else {
                this.drawStamp(ctx, cx, cy, brushWidth, brushHeight, rotationRad, drawingAlpha);
            }
        };

        // Interpolate between points to draw stamps
        for (let i = 0; i < this.temp_draw_points.length; i++) {
            const [px, py] = this.temp_draw_points[i];

            // If there's a next point, interpolate between current and next
            if (i < this.temp_draw_points.length - 1) {
                const [nx, ny] = this.temp_draw_points[i + 1];
                const dist = Math.sqrt((nx - px) ** 2 + (ny - py) ** 2);
                const steps = Math.max(1, Math.ceil(dist / spacing));

                for (let step = 0; step <= steps; step++) {
                    const t = step / steps;
                    stampOne(px + (nx - px) * t, py + (ny - py) * t);
                }
            } else {
                // Last point
                stampOne(px, py);
            }
        }

        if (eraserMode) {
            ctx.restore();
        }
    }

    drawStamp(ctx, x, y, width, height, rotation, alpha) {
        // Direct width and height control - no aspect ratio calculation needed
        if (this.brushShape === "rectangle") {
            this.drawRectangleStamp(ctx, x, y, width, height, rotation, alpha);
        } else if (this.brushShape === "triangle") {
            this.drawTriangleStamp(ctx, x, y, width, height, rotation, alpha);
        } else {
            this.drawEllipseStamp(ctx, x, y, width / 2, height / 2, rotation, alpha);
        }
    }

    drawTriangleStamp(ctx, x, y, width, height, rotation, alpha) {
        // Equilateral-ish triangle pointing up (apex at top, base at bottom)
        // bounding box matches width × height; rotation is around (x, y)
        const drawTri = (w, h) => {
            ctx.beginPath();
            ctx.moveTo(0, -h / 2);          // apex
            ctx.lineTo(-w / 2, h / 2);      // bottom-left
            ctx.lineTo(w / 2, h / 2);       // bottom-right
            ctx.closePath();
            ctx.fill();
        };

        if (this.scribbleSoftness <= 0) {
            ctx.globalAlpha = alpha / 100.0;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            drawTri(width, height);
            ctx.restore();
        } else {
            // Triangle with softness (multiple scaled layers)
            const innerScale = 1 - this.scribbleSoftness / 96;
            const outerScale = 1 + this.scribbleSoftness / 96;
            const steps = Math.round(5 + this.scribbleSoftness / 5);
            const stepScale = (outerScale - innerScale) / (steps - 1);

            ctx.globalAlpha = 1.0 - Math.pow(1.0 - Math.min(alpha / 100, 0.95), 1.0 / steps);

            for (let i = 0; i < steps; i++) {
                const currentScale = innerScale + stepScale * i;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                drawTri(width * currentScale, height * currentScale);
                ctx.restore();
            }
        }
    }

    drawEllipseStamp(ctx, x, y, radiusX, radiusY, rotation, alpha) {
        if (this.scribbleSoftness <= 0) {
            // Simple ellipse without softness
            ctx.globalAlpha = alpha / 100.0;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Ellipse with softness (multiple layers)
            const innerScale = 1 - this.scribbleSoftness / 96;
            const outerScale = 1 + this.scribbleSoftness / 96;
            const steps = Math.round(5 + this.scribbleSoftness / 5);
            const stepScale = (outerScale - innerScale) / (steps - 1);

            ctx.globalAlpha = 1.0 - Math.pow(1.0 - Math.min(alpha / 100, 0.95), 1.0 / steps);

            for (let i = 0; i < steps; i++) {
                const currentScale = innerScale + stepScale * i;
                ctx.beginPath();
                ctx.ellipse(x, y, radiusX * currentScale, radiusY * currentScale, rotation, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawRectangleStamp(ctx, x, y, width, height, rotation, alpha) {
        if (this.scribbleSoftness <= 0) {
            // Simple rectangle without softness
            ctx.globalAlpha = alpha / 100.0;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
        } else {
            // Rectangle with softness (multiple layers)
            const innerScale = 1 - this.scribbleSoftness / 96;
            const outerScale = 1 + this.scribbleSoftness / 96;
            const steps = Math.round(5 + this.scribbleSoftness / 5);
            const stepScale = (outerScale - innerScale) / (steps - 1);

            ctx.globalAlpha = 1.0 - Math.pow(1.0 - Math.min(alpha / 100, 0.95), 1.0 / steps);

            for (let i = 0; i < steps; i++) {
                const currentScale = innerScale + stepScale * i;
                const currentWidth = width * currentScale;
                const currentHeight = height * currentScale;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(rotation);
                ctx.fillRect(-currentWidth / 2, -currentHeight / 2, currentWidth, currentHeight);
                ctx.restore();
            }
        }
    }

    handleFileUpload(file) {
        if (file && !this.no_upload) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }

    handlePaste(e) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                this.handleFileUpload(file);
                break;
            }
        }
    }

    loadImage(base64) {
        if (typeof this.gradio_config !== "undefined") {
            if (!this.gradio_config.version.startsWith("4.")) return;
        } else {
            return;
        }

        const image = new Image();
        image.onload = () => {
            this.img = base64;
            this.orgWidth = image.width;
            this.orgHeight = image.height;
            const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
            if (canvas.width !== image.width || canvas.height !== image.height) {
                canvas.width = image.width;
                canvas.height = image.height;
            }
            this.adjustInitialPositionAndScale();
            this.drawImage();
            this.updateBackgroundImageData();
            this.saveState();
            this.updateUndoRedoButtons();
            document.getElementById(`imageInput_${this.uuid}`).value = null;
            document.getElementById(`uploadHint_${this.uuid}`).style.display = "none";
        };

        if (base64) {
            image.src = base64;
        } else {
            this.img = null;
            const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
            canvas.width = 1;
            canvas.height = 1;
            this.adjustInitialPositionAndScale();
            this.drawImage();
            this.saveState();
            this.updateUndoRedoButtons();
        }
    }

    loadDrawing(base64) {
        const image = new Image();
        image.onload = () => {
            const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
            this.saveState();
        };
        if (base64) {
            image.src = base64;
        } else {
            const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.saveState();
        }
    }

    isInsideImage(x, y) {
        const scaledWidth = this.orgWidth * this.imgScale;
        const scaledHeight = this.orgHeight * this.imgScale;
        return x > this.imgX && x < this.imgX + scaledWidth && y > this.imgY && y < this.imgY + scaledHeight;
    }

    drawImage() {
        const image = document.getElementById(`image_${this.uuid}`);
        const drawingCanvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        if (this.img) {
            const scaledWidth = this.orgWidth * this.imgScale;
            const scaledHeight = this.orgHeight * this.imgScale;
            image.src = this.img;
            image.style.width = `${scaledWidth}px`;
            image.style.height = `${scaledHeight}px`;
            image.style.left = `${this.imgX}px`;
            image.style.top = `${this.imgY}px`;
            image.style.display = "block";
            drawingCanvas.style.width = `${scaledWidth}px`;
            drawingCanvas.style.height = `${scaledHeight}px`;
            drawingCanvas.style.left = `${this.imgX}px`;
            drawingCanvas.style.top = `${this.imgY}px`;
        } else {
            image.src = "";
            image.style.display = "none";
        }
    }

    adjustInitialPositionAndScale() {
        const container = document.getElementById(`container_${this.uuid}`);
        const containerWidth = container.clientWidth - 20;
        const containerHeight = container.clientHeight - 20;
        const scaleX = containerWidth / this.orgWidth;
        const scaleY = containerHeight / this.orgHeight;
        this.imgScale = Math.min(scaleX, scaleY);
        const scaledWidth = this.orgWidth * this.imgScale;
        const scaledHeight = this.orgHeight * this.imgScale;
        this.imgX = (container.clientWidth - scaledWidth) / 2;
        this.imgY = (container.clientHeight - scaledHeight) / 2;
    }

    resetImage() {
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.adjustInitialPositionAndScale();
        this.drawImage();
        this.lastLinePoint = null;  // Clear straight line starting point
        this.saveState();
    }

    removeImage() {
        this.img = null;
        const image = document.getElementById(`image_${this.uuid}`);
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        image.src = "";
        image.style.width = "0";
        image.style.height = "0";
        this.lastLinePoint = null;  // Clear straight line starting point
        this.saveState();
        if (!this.no_upload) {
            document.getElementById(`uploadHint_${this.uuid}`).style.display = "inline-block";
        }
        this.loadImage(null);
    }

    saveState() {
        const MAX_HISTORY = 50;
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(imageData);
        this.historyIndex++;
        if (this.history.length > MAX_HISTORY) {  // CUSTOM (Forge Neo): 50-step history (upstream HISTORY_LIMIT=16)
            this.history.shift();
            this.historyIndex--;
        }
        this.updateUndoRedoButtons();
        this.updateDrawingData();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState();
            this.updateUndoRedoButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState();
            this.updateUndoRedoButtons();
        }
    }

    restoreState() {
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const ctx = canvas.getContext("2d");
        const imageData = this.history[this.historyIndex];
        ctx.putImageData(imageData, 0, 0);
        this.updateDrawingData();
    }

    updateUndoRedoButtons() {
        const undoButton = document.getElementById(`undoButton_${this.uuid}`);
        const redoButton = document.getElementById(`redoButton_${this.uuid}`);
        undoButton.disabled = this.historyIndex <= 0;
        redoButton.disabled = this.historyIndex >= this.history.length - 1;
        undoButton.style.opacity = undoButton.disabled ? "0.5" : "1";
        redoButton.style.opacity = redoButton.disabled ? "0.5" : "1";
    }

    updateBackgroundImageData() {
        if (!this.img) {
            this.background_gradio_bind.set_value("");
            return;
        }
        const image = document.getElementById(`image_${this.uuid}`);
        const tempCanvas = this.temp_canvas;
        const tempCtx = tempCanvas.getContext("2d");
        tempCanvas.width = this.orgWidth;
        tempCanvas.height = this.orgHeight;
        tempCtx.drawImage(image, 0, 0, this.orgWidth, this.orgHeight);
        const dataUrl = tempCanvas.toDataURL("image/png");
        this.background_gradio_bind.set_value(dataUrl);
    }

    updateDrawingData() {
        if (!this.img) {
            this.foreground_gradio_bind.set_value("");
            return;
        }
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const dataUrl = canvas.toDataURL("image/png");
        this.foreground_gradio_bind.set_value(dataUrl);
    }

    maximize() {
        if (this.maximized) return;
        const container = document.getElementById(`container_${this.uuid}`);
        const maxButton = document.getElementById(`maxButton_${this.uuid}`);
        const minButton = document.getElementById(`minButton_${this.uuid}`);

        this.originalState = {
            width: container.style.width,
            height: container.style.height,
            top: container.style.top,
            left: container.style.left,
            position: container.style.position,
            zIndex: container.style.zIndex,
        };

        container.style.width = "100vw";
        container.style.height = "100vh";
        container.style.top = "0";
        container.style.left = "0";
        container.style.position = "fixed";
        container.style.zIndex = "1000";
        maxButton.style.display = "none";
        minButton.style.display = "inline-block";
        this.maximized = true;
    }

    minimize() {
        if (!this.maximized) return;
        const container = document.getElementById(`container_${this.uuid}`);
        const maxButton = document.getElementById(`maxButton_${this.uuid}`);
        const minButton = document.getElementById(`minButton_${this.uuid}`);

        container.style.width = this.originalState.width;
        container.style.height = this.originalState.height;
        container.style.top = this.originalState.top;
        container.style.left = this.originalState.left;
        container.style.position = this.originalState.position;
        container.style.zIndex = this.originalState.zIndex;
        maxButton.style.display = "inline-block";
        minButton.style.display = "none";
        this.maximized = false;
    }

    handleDragEnd(e, isPointerOut) {
        const image = document.getElementById(`image_${this.uuid}`);
        const drawingCanvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        this.dragging = false;
        image.style.cursor = "grab";
        drawingCanvas.style.cursor = "grab";
    }

    toggleBrushShape() {
        // If a custom shape is selected, deselect it and return to brush mode
        if (this.selectedShape) {
            this.deselectShape();
            console.log(`Deselected custom shape, returning to brush mode`);
            return;
        }

        // Cycle through circle → rectangle → triangle → circle
        const cycle = { circle: "rectangle", rectangle: "triangle", triangle: "circle" };
        this.brushShape = cycle[this.brushShape] || "circle";
        console.log(`Brush shape changed to: ${this.brushShape}`);

        const scribbleIndicator = document.getElementById(`scribbleIndicator_${this.uuid}`);
        if (scribbleIndicator) {
            this.applyBrushIndicatorShape(scribbleIndicator);
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${this.scribbleRotation}deg)`;
        } else {
            console.error(`Could not find scribbleIndicator_${this.uuid}`);
        }
    }

    // Apply the correct CSS for the current brushShape to the cursor indicator.
    // Triangle uses clipPath since border-radius cannot produce a triangle.
    applyBrushIndicatorShape(scribbleIndicator) {
        if (this.brushShape === "rectangle") {
            scribbleIndicator.style.borderRadius = "0";
            scribbleIndicator.style.clipPath = "";
            scribbleIndicator.style.border = "1px solid";
            scribbleIndicator.style.background = "";
        } else if (this.brushShape === "triangle") {
            scribbleIndicator.style.borderRadius = "0";
            // Equilateral-ish triangle pointing up; CSS border can't draw a hollow triangle,
            // so we fill with a faint tint and use clipPath for the silhouette.
            scribbleIndicator.style.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
            scribbleIndicator.style.border = "none";
            scribbleIndicator.style.background = (this.scribbleColor || "#000000") + "33";
        } else {
            scribbleIndicator.style.borderRadius = "50%";
            scribbleIndicator.style.clipPath = "";
            scribbleIndicator.style.border = "1px solid";
            scribbleIndicator.style.background = "";
        }
    }
}

const True = true;
const False = false;