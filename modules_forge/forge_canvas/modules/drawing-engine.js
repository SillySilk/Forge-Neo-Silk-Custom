/**
 * Drawing Engine - Core drawing and brush stroke functionality
 *
 * Handles:
 * - Brush drawing with stamps (circle, rectangle)
 * - Line-based rendering for simple cases
 * - Softness/gradient effects
 * - Alpha and composite operations
 * - Aspect ratio and rotation support
 */

export class DrawingEngine {
    constructor(canvasState) {
        this.state = canvasState;
    }

    /**
     * Handle drawing at pointer position
     * @param {PointerEvent} e - Pointer event
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {ImageData} tempBg - Temporary background image data
     * @param {Array} tempPoints - Temporary points array
     */
    handleDraw(e, canvas, tempBg, tempPoints) {
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.state.imgScale;
        const y = (e.clientY - rect.top) / this.state.imgScale;

        tempPoints.push([x, y]);
        ctx.putImageData(tempBg, 0, 0);

        const aspectRatio = this.state.scribbleAspect / 100;
        // Need stamp-based rendering for: rotation, non-1:1 aspect, or rectangles
        const needsStampRendering = this.state.scribbleRotation > 0 || aspectRatio !== 1 || this.state.brushShape === "rectangle";

        if (needsStampRendering) {
            this.drawWithStamps(ctx, canvas, tempPoints);
        } else {
            // Use traditional line-based rendering (only for circles with no rotation and 1:1 aspect)
            this.drawWithLines(ctx, canvas, tempPoints);
        }
    }

    /**
     * Draw using traditional line-based rendering (fast path for simple circles)
     * @private
     */
    drawWithLines(ctx, canvas, tempPoints) {
        ctx.beginPath();
        ctx.moveTo(tempPoints[0][0], tempPoints[0][1]);

        for (let i = 1; i < tempPoints.length; i++) {
            ctx.lineTo(tempPoints[i][0], tempPoints[i][1]);
        }

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = this.state.scribbleWidth / (this.state.scribbleWidthConsistent ? this.state.imgScale : 1.0) * 4;

        if (this.state.contrast_scribbles) {
            ctx.strokeStyle = this.state.contrast_pattern;
            ctx.stroke();
            return;
        }

        ctx.strokeStyle = this.state.scribbleColor;

        if (this.state.scribbleAlpha <= 0) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1.0;
            ctx.stroke();
            return;
        }

        ctx.globalCompositeOperation = "source-over";

        canvas.style.opacity = 1.0;
        let drawingAlpha = this.state.scribbleAlpha;

        if (this.state.scribbleAlphaFixed) {
            canvas.style.opacity = this.state.scribbleAlpha / 100.0;
            drawingAlpha = 100.0;
        }

        if (this.state.scribbleSoftness <= 0) {
            ctx.globalAlpha = drawingAlpha / 100.0;
            ctx.stroke();
            return;
        }

        const innerWidth = ctx.lineWidth * (1 - this.state.scribbleSoftness / 96);
        const outerWidth = ctx.lineWidth * (1 + this.state.scribbleSoftness / 96);
        const steps = Math.round(5 + this.state.scribbleSoftness / 5);
        const stepWidth = (outerWidth - innerWidth) / (steps - 1);

        ctx.globalAlpha = 1.0 - Math.pow(1.0 - Math.min(drawingAlpha / 100, 0.95), 1.0 / steps);

        for (let i = 0; i < steps; i++) {
            ctx.lineWidth = innerWidth + stepWidth * i;
            ctx.stroke();
        }
    }

    /**
     * Draw using stamp-based rendering (for rotation, aspect ratio, rectangles)
     */
    drawWithStamps(ctx, canvas, tempPoints) {
        const brushSize = this.state.scribbleWidth / (this.state.scribbleWidthConsistent ? this.state.imgScale : 1.0) * 4;
        const rotationRad = (this.state.scribbleRotation * Math.PI) / 180;
        const aspectRatio = this.state.scribbleAspect / 100;

        canvas.style.opacity = 1.0;
        let drawingAlpha = this.state.scribbleAlpha;

        if (this.state.scribbleAlphaFixed) {
            canvas.style.opacity = this.state.scribbleAlpha / 100.0;
            drawingAlpha = 100.0;
        }

        if (this.state.scribbleAlpha <= 0) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalCompositeOperation = "source-over";
        }

        ctx.fillStyle = this.state.scribbleColor;

        // Calculate spacing between stamps to ensure smooth appearance
        // Use the smaller dimension for spacing calculation
        const minDimension = aspectRatio >= 1 ? brushSize / aspectRatio : brushSize * aspectRatio;
        const spacing = minDimension * 0.1; // 10% of smaller dimension for smooth coverage

        // Interpolate between points to draw stamps
        for (let i = 0; i < tempPoints.length; i++) {
            const [px, py] = tempPoints[i];

            // If there's a next point, interpolate between current and next
            if (i < tempPoints.length - 1) {
                const [nx, ny] = tempPoints[i + 1];
                const dist = Math.sqrt((nx - px) ** 2 + (ny - py) ** 2);
                const steps = Math.max(1, Math.ceil(dist / spacing));

                for (let step = 0; step <= steps; step++) {
                    const t = step / steps;
                    const ix = px + (nx - px) * t;
                    const iy = py + (ny - py) * t;
                    this.drawStamp(ctx, ix, iy, brushSize, aspectRatio, rotationRad, drawingAlpha);
                }
            } else {
                // Last point
                this.drawStamp(ctx, px, py, brushSize, aspectRatio, rotationRad, drawingAlpha);
            }
        }
    }

    /**
     * Draw a single stamp (circle or rectangle)
     */
    drawStamp(ctx, x, y, size, aspectRatio, rotation, alpha) {
        // Calculate width and height based on aspect ratio
        // aspectRatio < 1 (e.g., 0.5): flattened - width stays full, height shrinks
        // aspectRatio = 1: square/circle - both dimensions equal
        // aspectRatio > 1 (e.g., 2.0): stretched - height stays full, width shrinks
        let width, height;
        if (aspectRatio >= 1) {
            // Stretched vertically: height is full size, width is reduced
            width = size / aspectRatio;
            height = size;
        } else {
            // Flattened horizontally: width is full size, height is reduced
            width = size;
            height = size * aspectRatio;
        }

        if (this.state.brushShape === "rectangle") {
            this.drawRectangleStamp(ctx, x, y, width, height, rotation, alpha);
        } else {
            this.drawEllipseStamp(ctx, x, y, width / 2, height / 2, rotation, alpha);
        }
    }

    /**
     * Draw an ellipse stamp with optional softness
     */
    drawEllipseStamp(ctx, x, y, radiusX, radiusY, rotation, alpha) {
        if (this.state.scribbleSoftness <= 0) {
            // Simple ellipse without softness
            ctx.globalAlpha = alpha / 100.0;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Ellipse with softness (multiple layers)
            const innerScale = 1 - this.state.scribbleSoftness / 96;
            const outerScale = 1 + this.state.scribbleSoftness / 96;
            const steps = Math.round(5 + this.state.scribbleSoftness / 5);
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

    /**
     * Draw a rectangle stamp with optional softness
     */
    drawRectangleStamp(ctx, x, y, width, height, rotation, alpha) {
        if (this.state.scribbleSoftness <= 0) {
            // Simple rectangle without softness
            ctx.globalAlpha = alpha / 100.0;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
        } else {
            // Rectangle with softness (multiple layers)
            const innerScale = 1 - this.state.scribbleSoftness / 96;
            const outerScale = 1 + this.state.scribbleSoftness / 96;
            const steps = Math.round(5 + this.state.scribbleSoftness / 5);
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

    /**
     * Draw a straight line with stamps (Ctrl+click)
     */
    drawStraightLine(ctx, canvas, x1, y1, x2, y2) {
        const brushSize = this.state.scribbleWidth / (this.state.scribbleWidthConsistent ? this.state.imgScale : 1.0) * 4;
        const rotationRad = (this.state.scribbleRotation * Math.PI) / 180;
        const aspectRatio = this.state.scribbleAspect / 100;

        canvas.style.opacity = 1.0;
        let drawingAlpha = this.state.scribbleAlpha;

        if (this.state.scribbleAlphaFixed) {
            canvas.style.opacity = this.state.scribbleAlpha / 100.0;
            drawingAlpha = 100.0;
        }

        if (this.state.scribbleAlpha <= 0) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalCompositeOperation = "source-over";
        }

        ctx.fillStyle = this.state.scribbleColor;

        // Calculate spacing
        const minDimension = aspectRatio >= 1 ? brushSize / aspectRatio : brushSize * aspectRatio;
        const spacing = minDimension * 0.1;

        // Calculate distance and steps
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(1, Math.ceil(dist / spacing));

        // Draw stamps along the line
        for (let step = 0; step <= steps; step++) {
            const t = step / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            this.drawStamp(ctx, x, y, brushSize, aspectRatio, rotationRad, drawingAlpha);
        }
    }
}
