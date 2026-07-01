// Auto-set ControlNet defaults on page load
// This script sets default preprocessor and model for all ControlNet units

(function() {
    'use strict';

    const DEFAULT_PREPROCESSOR = "lineart_standard (from white bg & black line)";
    const DEFAULT_MODEL = "mistoline_v10";

    console.log("[ControlNet Defaults] Script loaded");

    function updateGradioInput(input, value) {
        if (!input) return false;

        console.log(`[ControlNet Defaults] Setting "${value}"`);

        // Use Object.getOwnPropertyDescriptor to bypass any getters/setters
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        ).set;

        // Set the value using the native setter
        nativeInputValueSetter.call(input, value);

        // Create and dispatch InputEvent (this is what Gradio listens for)
        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: false,
            composed: true
        });
        input.dispatchEvent(inputEvent);

        // Also dispatch change event for good measure
        const changeEvent = new Event('change', {
            bubbles: true,
            cancelable: false
        });
        input.dispatchEvent(changeEvent);

        return true;
    }

    function setControlNetDefaults() {
        console.log("[ControlNet Defaults] === Starting ===");

        // Find dropdowns
        const preprocessorDropdowns = document.querySelectorAll('[id*="controlnet_preprocessor_dropdown"]');
        const modelDropdowns = document.querySelectorAll('[id*="controlnet_model_dropdown"]');

        console.log(`[ControlNet Defaults] Found ${preprocessorDropdowns.length} preprocessor, ${modelDropdowns.length} model dropdowns`);

        if (preprocessorDropdowns.length === 0) {
            console.log("[ControlNet Defaults] No dropdowns found yet");
            return false;
        }

        // Set preprocessors first
        let ppSet = 0;
        preprocessorDropdowns.forEach((dropdown, i) => {
            const input = dropdown.querySelector('input');
            if (input && (!input.value || input.value === "None")) {
                console.log(`[ControlNet Defaults] Preprocessor ${i}: "${input.value}" -> "${DEFAULT_PREPROCESSOR}"`);
                updateGradioInput(input, DEFAULT_PREPROCESSOR);
                ppSet++;
            }
        });

        // IMPORTANT: Wait for preprocessor change to complete and any filtering to finish
        // before setting models (preprocessor change can trigger model dropdown updates)
        setTimeout(() => {
            let mSet = 0;
            modelDropdowns.forEach((dropdown, i) => {
                const input = dropdown.querySelector('input');
                if (input && (!input.value || input.value === "None")) {
                    console.log(`[ControlNet Defaults] Model ${i}: "${input.value}" -> "${DEFAULT_MODEL}"`);
                    updateGradioInput(input, DEFAULT_MODEL);
                    mSet++;
                }
            });
            console.log(`[ControlNet Defaults] === Done: ${ppSet} preprocessors, ${mSet} models ===`);
        }, 1000);
        return true;
    }

    // Multiple attempts with different timings
    window.addEventListener('load', () => {
        console.log("[ControlNet Defaults] Page loaded");
        setTimeout(setControlNetDefaults, 2000);
        setTimeout(setControlNetDefaults, 4000);
        setTimeout(setControlNetDefaults, 6000);
    });

    // Also try when ControlNet appears in DOM
    const observer = new MutationObserver(() => {
        if (document.querySelector('[id*="controlnet"]')) {
            console.log("[ControlNet Defaults] ControlNet found in DOM");
            setTimeout(setControlNetDefaults, 1000);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
