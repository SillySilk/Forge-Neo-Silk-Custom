/**
 * Image Manager - Image loading and rendering
 *
 * Handles:
 * - File upload processing
 * - Clipboard paste processing
 * - Image loading and validation
 * - Image rendering with transforms
 * - Image scaling and positioning
 */

export class ImageManager {
    constructor(uuid, canvasState) {
        this.uuid = uuid;
        this.state = canvasState;
    }

    /**
     * Handle file upload
     */
    handleFileUpload(file, callback) {
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (callback) callback(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Handle paste event
     */
    handlePaste(e, callback) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                this.handleFileUpload(blob, callback);
                break;
            }
        }
    }

    /**
     * Draw image on canvas with current transforms
     */
    drawImage() {
        if (!this.state.img) return;

        const image = document.getElementById(`image_${this.uuid}`);
        const imageContainer = document.getElementById(`imageContainer_${this.uuid}`);
        const drawingCanvas = document.getElementById(`drawingCanvas_${this.uuid}`);

        if (!image || !imageContainer || !drawingCanvas) return;

        const containerWidth = imageContainer.clientWidth;
        const containerHeight = imageContainer.clientHeight;

        // Calculate scaled dimensions
        let scale = Math.min(
            containerWidth / this.state.orgWidth,
            this.state.initial_height / this.state.orgHeight
        );

        const displayWidth = this.state.orgWidth * scale * this.state.imgScale;
        const displayHeight = this.state.orgHeight * scale * this.state.imgScale;

        // Center the image
        this.state.imgX = (containerWidth - displayWidth) / 2;
        this.state.imgY = (containerHeight - displayHeight) / 2;

        // Update image element
        image.style.left = `${this.state.imgX}px`;
        image.style.top = `${this.state.imgY}px`;
        image.style.width = `${displayWidth}px`;
        image.style.height = `${displayHeight}px`;

        // Update drawing canvas
        drawingCanvas.width = this.state.orgWidth;
        drawingCanvas.height = this.state.orgHeight;
        drawingCanvas.style.left = `${this.state.imgX}px`;
        drawingCanvas.style.top = `${this.state.imgY}px`;
        drawingCanvas.style.width = `${displayWidth}px`;
        drawingCanvas.style.height = `${displayHeight}px`;
    }

    /**
     * Load image from data URL or file
     */
    loadImage(dataUrl, callback) {
        if (!dataUrl) {
            this.state.img = null;
            if (callback) callback();
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.state.img = img;
            this.state.orgWidth = img.width;
            this.state.orgHeight = img.height;
            this.state.imgScale = 1.0;
            this.state.imgX = 0;
            this.state.imgY = 0;

            const image = document.getElementById(`image_${this.uuid}`);
            if (image) {
                image.src = dataUrl;
            }

            this.drawImage();
            if (callback) callback();
        };
        img.src = dataUrl;
    }
}
