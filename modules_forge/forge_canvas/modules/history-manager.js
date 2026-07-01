/**
 * History Manager - Undo/redo functionality for canvas
 *
 * Manages:
 * - History stack of canvas states (ImageData)
 * - Undo/redo operations
 * - History navigation
 * - UI button state updates
 */

export class HistoryManager {
    constructor(uuid) {
        this.uuid = uuid;
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Save current canvas state to history
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {Function} updateDrawingCallback - Callback to update drawing data
     */
    saveState(canvas, updateDrawingCallback) {
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Remove any future history after current index
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add new state
        this.history.push(imageData);
        this.historyIndex++;

        this.updateUndoRedoButtons();
        if (updateDrawingCallback) {
            updateDrawingCallback();
        }
    }

    /**
     * Undo to previous state
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {Function} updateDrawingCallback - Callback to update drawing data
     */
    undo(canvas, updateDrawingCallback) {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(canvas, updateDrawingCallback);
            this.updateUndoRedoButtons();
        }
    }

    /**
     * Redo to next state
     * @param {HTMLCanvasElement} canvas - Drawing canvas
     * @param {Function} updateDrawingCallback - Callback to update drawing data
     */
    redo(canvas, updateDrawingCallback) {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(canvas, updateDrawingCallback);
            this.updateUndoRedoButtons();
        }
    }

    /**
     * Restore canvas state from history
     * @private
     */
    restoreState(canvas, updateDrawingCallback) {
        const ctx = canvas.getContext("2d");
        const imageData = this.history[this.historyIndex];
        ctx.putImageData(imageData, 0, 0);
        if (updateDrawingCallback) {
            updateDrawingCallback();
        }
    }

    /**
     * Update undo/redo button states
     */
    updateUndoRedoButtons() {
        const undoButton = document.getElementById(`undoButton_${this.uuid}`);
        const redoButton = document.getElementById(`redoButton_${this.uuid}`);

        if (undoButton) {
            undoButton.disabled = this.historyIndex <= 0;
            undoButton.style.opacity = undoButton.disabled ? "0.5" : "1";
        }

        if (redoButton) {
            redoButton.disabled = this.historyIndex >= this.history.length - 1;
            redoButton.style.opacity = redoButton.disabled ? "0.5" : "1";
        }
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
        this.updateUndoRedoButtons();
    }

    /**
     * Get history info for debugging
     */
    getHistoryInfo() {
        return {
            count: this.history.length,
            currentIndex: this.historyIndex,
            canUndo: this.historyIndex > 0,
            canRedo: this.historyIndex < this.history.length - 1
        };
    }
}
