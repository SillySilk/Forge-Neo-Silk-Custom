/**
 * Gradio Sync - Synchronization with Gradio UI components
 *
 * Handles:
 * - Bidirectional data binding with Gradio text areas
 * - Background image data updates
 * - Drawing layer data updates
 * - Canvas-to-dataURL conversion
 */

export class GradioTextAreaBind {
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

export class GradioSync {
    constructor(uuid) {
        this.uuid = uuid;
        this.background_gradio_bind = new GradioTextAreaBind(uuid, "logical_image_background");
        this.foreground_gradio_bind = new GradioTextAreaBind(uuid, "logical_image_foreground");
        this.temp_canvas = document.createElement("canvas");
    }

    /**
     * Update background image data in Gradio
     */
    updateBackgroundImageData(img, orgWidth, orgHeight) {
        if (!img) {
            this.background_gradio_bind.set_value("");
            return;
        }
        const image = document.getElementById(`image_${this.uuid}`);
        const tempCtx = this.temp_canvas.getContext("2d");
        this.temp_canvas.width = orgWidth;
        this.temp_canvas.height = orgHeight;
        tempCtx.drawImage(image, 0, 0, orgWidth, orgHeight);
        const dataUrl = this.temp_canvas.toDataURL("image/png");
        this.background_gradio_bind.set_value(dataUrl);
    }

    /**
     * Update drawing layer data in Gradio
     */
    updateDrawingData(img) {
        if (!img) {
            this.foreground_gradio_bind.set_value("");
            return;
        }
        const canvas = document.getElementById(`drawingCanvas_${this.uuid}`);
        const dataUrl = canvas.toDataURL("image/png");
        this.foreground_gradio_bind.set_value(dataUrl);
    }

    /**
     * Setup listeners for Gradio bindings
     */
    setupListeners(loadImageCallback) {
        this.background_gradio_bind.listen(loadImageCallback);
    }
}
