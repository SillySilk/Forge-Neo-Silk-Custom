/**
 * Shapes Renderer - Handles shape rendering, path creation, and stamping
 *
 * Responsibilities:
 * - Convert shape definitions to Path2D objects
 * - Render shapes with fill and stroke
 * - Handle shape transformations (rotation, aspect ratio, scaling)
 * - Generate shape thumbnails for UI
 */

import { ShapesLibrary } from './shapes-library.js';

export class ShapesRenderer {
    constructor(canvasState) {
        this.canvasState = canvasState;
        this.shapesLibrary = new ShapesLibrary();
    }

    /**
     * Create a Path2D object from a shape definition
     * @param {Object} shape - Shape object with path data
     * @returns {Path2D|string|null} Path2D object, "circle" string, or null
     */
    createPath2DFromShape(shape) {
        if (!shape || !shape.path) return null;

        // Special case: circle
        if (shape.path === "circle") {
            return "circle";  // Handled separately in drawShapeStamp
        }

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

    /**
     * Draw a shape stamp at the specified location with transformations
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - Shape size
     * @param {number} rotation - Rotation in radians
     * @param {number} aspectRatio - Aspect ratio multiplier
     */
    drawShapeStamp(ctx, selectedShape, x, y, size, rotation, aspectRatio, fillMode, fillColor, strokeColor, outlineWidth, alpha) {
        if (!selectedShape) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // Scale: size/100 converts from 100x100 coordinate system
        // aspectRatio affects horizontal vs vertical scaling
        const scaleX = (size / 100) * (1 / aspectRatio);
        const scaleY = (size / 100) * aspectRatio;
        ctx.scale(scaleX, scaleY);

        // Translate to center the shape (shapes are defined in 0-100 coordinate system)
        ctx.translate(-50, -50);

        const path = this.createPath2DFromShape(selectedShape);

        // Special handling for circle
        if (path === "circle") {
            ctx.translate(50, 50);  // Move back to center
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);  // radius 40 in 100x100 system

            // Draw fill if enabled
            if (fillMode) {
                ctx.fillStyle = fillColor;
                ctx.globalAlpha = alpha / 100;
                ctx.fill();
            }

            // Always draw stroke (outline) at full opacity
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = outlineWidth * (100 / size);  // Scale outline width
            ctx.stroke();
        } else {
            // Regular path shapes

            // Draw fill if enabled
            if (fillMode) {
                ctx.globalAlpha = alpha / 100;
                ctx.fillStyle = fillColor;
                ctx.fill(path);
            }

            // Always draw stroke (outline) at full opacity
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = outlineWidth * (100 / size);  // Scale outline width
            ctx.stroke(path);
        }

        ctx.restore();
    }

    /**
     * Stamp a shape at the specified canvas coordinates
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {Object} selectedShape - Selected shape object
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} state - Canvas state (width, rotation, aspect, alpha, colors, etc.)
     */
    stampShape(canvas, selectedShape, x, y, state) {
        if (!selectedShape) return;

        const ctx = canvas.getContext("2d");
        const size = state.scribbleWidth * 4;  // Use existing brush width for size
        const rotation = (state.scribbleRotation * Math.PI) / 180;
        const aspectRatio = state.scribbleAspect / 100;

        this.drawShapeStamp(
            ctx,
            selectedShape,
            x,
            y,
            size,
            rotation,
            aspectRatio,
            state.shapeFillMode,
            state.scribbleColor,
            state.strokeColor,
            state.shapeOutlineWidth,
            state.scribbleAlpha
        );
    }

    /**
     * Stamp shapes in a line from (x1, y1) to (x2, y2) for Ctrl+Click straight lines
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {Object} selectedShape - Selected shape object
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @param {Object} state - Canvas state
     */
    stampShapeLine(canvas, selectedShape, x1, y1, x2, y2, state) {
        if (!selectedShape) return;

        const ctx = canvas.getContext("2d");
        const size = state.scribbleWidth * 4;
        const rotation = (state.scribbleRotation * Math.PI) / 180;
        const aspectRatio = state.scribbleAspect / 100;

        // Calculate spacing between shapes based on size
        // Use smaller dimension for spacing calculation
        const minDimension = aspectRatio >= 1 ? size / aspectRatio : size * aspectRatio;
        const spacing = minDimension * 0.25;  // 25% spacing for distinct shapes

        // Calculate distance and number of stamps
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(1, Math.ceil(dist / spacing));

        // Interpolate and stamp shapes along the line
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            this.drawShapeStamp(
                ctx,
                selectedShape,
                x,
                y,
                size,
                rotation,
                aspectRatio,
                state.shapeFillMode,
                state.scribbleColor,
                state.strokeColor,
                state.shapeOutlineWidth,
                state.scribbleAlpha
            );
        }
    }

    /**
     * Generate a thumbnail canvas for a shape
     * @param {Object} shape - Shape object
     * @param {number} size - Thumbnail size in pixels
     * @returns {HTMLCanvasElement} Canvas element with shape thumbnail
     */
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
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.fill(path);
        }

        ctx.restore();
        return canvas;
    }

    /**
     * Populate the shape palette with thumbnails
     * @param {string} uuid - Canvas UUID
     * @param {Function} selectShapeCallback - Callback when shape is selected
     */
    populateShapePalette(uuid, selectShapeCallback) {
        const palette = document.getElementById(`shapePalette_${uuid}`);
        if (!palette) return;

        palette.innerHTML = "";  // Clear existing content

        const shapes = this.shapesLibrary.getAllShapes();
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
                    selectShapeCallback(shape);
                    palette.style.display = "none";
                });

                grid.appendChild(thumbnail);
            });

            palette.appendChild(grid);
        });
    }
}
