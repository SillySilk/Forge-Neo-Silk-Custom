/**
 * Cursor Manager - Cursor indicator and preview functionality
 *
 * Handles:
 * - Cursor indicator updates (position, size, shape)
 * - Shape preview rendering
 * - Brush shape preview (circle/rectangle)
 * - Aspect ratio and rotation visualization
 */

import { ShapesRenderer } from './shapes-renderer.js';

export class CursorManager {
    constructor(uuid, canvasState, shapesRenderer) {
        this.uuid = uuid;
        this.state = canvasState;
        this.shapesRenderer = shapesRenderer;
    }

    /**
     * Update cursor indicator to show shape preview or brush shape
     */
    updateCursorIndicator() {
        const scribbleIndicator = document.getElementById(`scribbleIndicator_${this.uuid}`);
        if (!scribbleIndicator) return;

        // If shape is selected, render it in the indicator
        if (this.state.selectedShape) {
            this.renderShapePreview(scribbleIndicator);
        } else {
            // Regular brush mode - show circle or rectangle border
            this.renderBrushPreview(scribbleIndicator);
        }
    }

    /**
     * Render shape preview in cursor indicator
     * @private
     */
    renderShapePreview(scribbleIndicator) {
        // Clear existing content and border style
        scribbleIndicator.style.border = "none";
        scribbleIndicator.innerHTML = "";
        // Ensure rotation is applied to the indicator
        scribbleIndicator.style.transform = `rotate(${this.state.scribbleRotation}deg)`;

        // Create canvas for shape preview
        const previewSize = Math.max(40, Math.min(this.state.scribbleWidth * 4, 100));
        const aspectRatio = this.state.scribbleAspect / 100;
        let previewWidth, previewHeight;

        if (aspectRatio >= 1) {
            previewWidth = previewSize / aspectRatio;
            previewHeight = previewSize;
        } else {
            previewWidth = previewSize;
            previewHeight = previewSize * aspectRatio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = previewWidth;
        canvas.height = previewHeight;
        canvas.style.width = `${previewWidth}px`;
        canvas.style.height = `${previewHeight}px`;
        canvas.style.pointerEvents = "none";

        const ctx = canvas.getContext("2d");

        // Draw shape centered on canvas
        ctx.save();
        ctx.translate(previewWidth / 2, previewHeight / 2);
        ctx.scale(previewWidth / 100 * 0.9, previewHeight / 100 * 0.9);
        ctx.translate(-50, -50);

        const path = this.shapesRenderer.createPath2DFromShape(this.state.selectedShape);

        if (path === "circle") {
            ctx.translate(50, 50);
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);

            // Draw fill if enabled
            if (this.state.shapeFillMode) {
                ctx.fillStyle = this.state.scribbleColor;
                ctx.fill();
            }

            // Always draw stroke
            ctx.strokeStyle = this.state.strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Draw fill if enabled
            if (this.state.shapeFillMode) {
                ctx.fillStyle = this.state.scribbleColor;
                ctx.fill(path);
            }

            // Always draw stroke
            ctx.strokeStyle = this.state.strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke(path);
        }

        ctx.restore();
        scribbleIndicator.appendChild(canvas);

        // Update indicator size
        scribbleIndicator.style.width = `${previewWidth}px`;
        scribbleIndicator.style.height = `${previewHeight}px`;
        scribbleIndicator.style.borderRadius = "0";
    }

    /**
     * Render brush preview in cursor indicator
     * @private
     */
    renderBrushPreview(scribbleIndicator) {
        scribbleIndicator.innerHTML = "";
        scribbleIndicator.style.border = "1px solid";
        scribbleIndicator.style.borderColor = this.state.scribbleColor;
        scribbleIndicator.style.borderRadius = this.state.brushShape === "rectangle" ? "0" : "50%";
        scribbleIndicator.style.transform = `rotate(${this.state.scribbleRotation}deg)`;

        // Calculate indicator size
        const indicatorSize = this.state.scribbleWidth * (this.state.scribbleWidthConsistent ? 1.0 : this.state.imgScale) * 4;
        const aspectRatio = this.state.scribbleAspect / 100;
        let indicatorWidth, indicatorHeight;

        if (aspectRatio >= 1) {
            indicatorWidth = indicatorSize / aspectRatio;
            indicatorHeight = indicatorSize;
        } else {
            indicatorWidth = indicatorSize;
            indicatorHeight = indicatorSize * aspectRatio;
        }

        scribbleIndicator.style.width = `${indicatorWidth}px`;
        scribbleIndicator.style.height = `${indicatorHeight}px`;
    }

    /**
     * Select a shape and update UI
     */
    selectShape(shape) {
        this.state.selectedShape = shape;

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

    /**
     * Deselect shape (return to brush mode)
     */
    deselectShape() {
        this.state.selectedShape = null;
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
}
