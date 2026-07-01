/**
 * UI Manager - UI state and interactions
 *
 * Handles:
 * - Maximize/minimize functionality
 * - Brush shape toggle
 * - UI visibility management
 * - Button state updates
 */

export class UIManager {
    constructor(uuid, canvasState) {
        this.uuid = uuid;
        this.state = canvasState;
    }

    /**
     * Maximize canvas to fullscreen
     */
    maximize() {
        if (this.state.maximized) return;
        const container = document.getElementById(`container_${this.uuid}`);
        const maxButton = document.getElementById(`maxButton_${this.uuid}`);
        const minButton = document.getElementById(`minButton_${this.uuid}`);

        this.state.originalState = {
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
        this.state.maximized = true;
    }

    /**
     * Minimize canvas from fullscreen
     */
    minimize() {
        if (!this.state.maximized) return;
        const container = document.getElementById(`container_${this.uuid}`);
        const maxButton = document.getElementById(`maxButton_${this.uuid}`);
        const minButton = document.getElementById(`minButton_${this.uuid}`);

        container.style.width = this.state.originalState.width;
        container.style.height = this.state.originalState.height;
        container.style.top = this.state.originalState.top;
        container.style.left = this.state.originalState.left;
        container.style.position = this.state.originalState.position;
        container.style.zIndex = this.state.originalState.zIndex;
        maxButton.style.display = "inline-block";
        minButton.style.display = "none";
        this.state.maximized = false;
    }

    /**
     * Toggle brush shape between circle and rectangle
     */
    toggleBrushShape(deselectShapeCallback) {
        // If a custom shape is selected, deselect it and return to brush mode
        if (this.state.selectedShape) {
            deselectShapeCallback();
            console.log(`Deselected custom shape, returning to brush mode`);
            return;
        }

        // Toggle between circle and rectangle brush shapes
        this.state.brushShape = this.state.brushShape === "circle" ? "rectangle" : "circle";
        console.log(`Brush shape changed to: ${this.state.brushShape}`);

        // Update cursor indicator shape to match brush shape
        const scribbleIndicator = document.getElementById(`scribbleIndicator_${this.uuid}`);
        if (scribbleIndicator) {
            const newBorderRadius = this.state.brushShape === "rectangle" ? "0" : "50%";
            scribbleIndicator.style.borderRadius = newBorderRadius;
            // Maintain centering and rotation
            scribbleIndicator.style.transform = `translate(-50%, -50%) rotate(${this.state.scribbleRotation}deg)`;
            console.log(`Cursor indicator borderRadius set to: ${newBorderRadius}`);
            console.log(`Actual borderRadius is: ${scribbleIndicator.style.borderRadius}`);
        } else {
            console.error(`Could not find scribbleIndicator_${this.uuid}`);
        }
    }

    /**
     * Hide custom shapes UI in regular inpaint mode
     */
    hideCustomShapesUI() {
        if (this.state.no_shapes) {
            const shapeControls = document.getElementById(`shapeControls_${this.uuid}`);
            if (shapeControls) {
                shapeControls.style.display = "none";
            }
        }
    }
}
