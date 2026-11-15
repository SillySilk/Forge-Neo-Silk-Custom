onUiLoaded(() => {
    const tab = document.getElementById("tab_sd-forge-json-builder");

    const t2i_prompt = document.getElementById("txt2img_prompt").querySelector("textarea");
    const t2i_width = document.getElementById("txt2img_width").querySelector("input");
    const t2i_height = document.getElementById("txt2img_height").querySelector("input");

    const i2i_prompt = document.getElementById("img2img_prompt").querySelector("textarea");
    const i2i_width = document.getElementById("img2img_width").querySelector("input");
    const i2i_height = document.getElementById("img2img_height").querySelector("input");

    const LABELS = ["object", "character", "text"];
    const CANVAS_TYPES = ["single", "multi_panel", "collage"];
    const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
    const MP_PIXELS = 1024 * 1024;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const round16 = (v) => Math.max(16, Math.round(v / 16) * 16);

    let idCounter = 0;

    const state = {
        width: 1024,
        height: 1024,
        summary: { caption: "", meta: "", extra: "", canvas: "single" },
        items: [],
    };

    const listRefs = new Map();
    const canvasRefs = new Map();
    // CUSTOM (Forge Neo): on-screen stacking of canvas boxes, back to front. Only the display
    // changes; state.items keeps its order, since item numbers matter in the prompt.
    let stackOrder = [];
    // CUSTOM (Forge Neo): undo/redo over the boxes (javascript/editing.js) and the selected box
    const undoHistory = new JbHistory(100);
    let restoring = false;
    let selectedId = null;

    // the resolution is part of each step: undoing a box change made by a resize must also undo the resize
    function itemsSnapshot() {
        return JSON.stringify({ width: state.width, height: state.height, items: state.items });
    }

    function recordHistory(key = null) {
        saveLayout(); // CUSTOM (Forge Neo)
        if (restoring) return;
        undoHistory.commit(itemsSnapshot(), key);
        updateUndoButtons();
    }

    // CUSTOM (Forge Neo): the layout is kept in the browser, so a page refresh doesn't lose it
    const LAYOUT_KEY = "jb-layout";
    let saveTimer = null;
    function saveLayout() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            const items = state.items.map(({ label, caption, text, bbox }) => ({ label, caption, text, bbox }));
            storeSet(LAYOUT_KEY, JSON.stringify({ width: state.width, height: state.height, summary: state.summary, items }));
        }, 300);
    }

    const MIN_ZOOM = 0.25;
    const MAX_ZOOM = 8;
    const view = { scale: 1, panX: 0, panY: 0 };

    function h(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === "class") el.className = v;
            else if (k === "style") Object.assign(el.style, v);
            else if (k === "dataset") Object.assign(el.dataset, v);
            else if (k === "value" || k === "checked") el[k] = v;
            else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
            else el.setAttribute(k, v);
        }
        for (const c of [].concat(children)) {
            if (c === null || c === undefined) continue;
            el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        }
        return el;
    }

    const growables = new Set();

    function autoGrow(el) {
        if (el?.tagName !== "TEXTAREA") return;
        el.style.height = "auto";
        const cs = getComputedStyle(el);
        const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
        el.style.height = `${el.scrollHeight + borders}px`;
    }

    const growObserver = new ResizeObserver(() => growables.forEach(autoGrow));

    function addGrowable(el) {
        if (growables.has(el)) return;
        growables.add(el);
        growObserver.observe(el);
        requestAnimationFrame(() => autoGrow(el));
    }

    function pruneGrowables() {
        for (const el of growables) {
            if (el.isConnected) continue;
            growObserver.unobserve(el);
            growables.delete(el);
        }
    }

    function defaultBbox() {
        const m = Math.round(Math.min(state.width, state.height) * 0.1);
        const s = Math.round(Math.min(state.width, state.height) * 0.3);
        return [m, m, m + s, m + s];
    }

    function newItem() {
        return { id: ++idCounter, label: "character", caption: "", text: "", bbox: defaultBbox() }; // CUSTOM (Forge Neo): was "object"
    }

    state.items.push(newItem());

    // ----- canvas -----

    const canvasSection = h("div", { class: "jb-canvas" });
    const stage = h("div", { class: "jb-stage" });
    canvasSection.appendChild(stage);

    // ----- side panel -----

    const widthInput = h("input", { type: "number", class: "jb-width", min: "16", step: "16", value: state.width });
    const heightInput = h("input", { type: "number", class: "jb-height", min: "16", step: "16", value: state.height });
    const mpInput = h("input", { type: "number", class: "jb-mp", min: "0.1", step: "0.1", value: "1" });
    const arSelect = h(
        "select",
        { class: "jb-ar" },
        ASPECT_RATIOS.map((r) => h("option", { value: r }, [r])),
    );
    const setResBtn = h("button", { type: "button", class: "jb-set-res" }, ["Set Resolution"]);
    const swapResBtn = h("button", { type: "button", class: "jb-swap-res", title: "Swap width and height" }, ["\u21C4"]); // CUSTOM (Forge Neo)

    const resolutionSection = h("div", { class: "jb-section jb-sec-res" }, [ // CUSTOM (Forge Neo): jb-sec-* = section tint
        h("div", { class: "jb-section-title" }, ["Resolution"]),
        h("div", { class: "jb-row" }, [h("label", {}, ["Width"]), widthInput, swapResBtn, h("label", {}, ["Height"]), heightInput]),
        h("div", { class: "jb-row" }, [h("label", {}, ["MP"]), mpInput, h("label", {}, ["AR"]), arSelect, setResBtn]),
    ]);

    const sumCaption = h("textarea", { class: "jb-sum-caption", placeholder: "global caption", rows: "1" });
    const sumMeta = h("input", { type: "text", class: "jb-sum-meta", placeholder: "meta tags (comma separated)" });
    const sumExtra = h("textarea", { class: "jb-sum-extra", placeholder: "e.g. LoRA", rows: "3" }); // CUSTOM (Forge Neo): 3-line box, was a one-line input
    const loraBtn = h("button", { type: "button", class: "jb-lora-btn", title: "Pick a LoRA" }, ["+ LoRA"]); // CUSTOM (Forge Neo)
    const canvasRadioInputs = [];
    const canvasRadios = CANVAS_TYPES.map((t) => {
        const id = `jb-canvas-${t}`;
        const radio = h("input", { type: "radio", name: "jb-canvas", value: t, id, checked: state.summary.canvas === t });
        radio.addEventListener("change", () => {
            if (radio.checked) state.summary.canvas = t;
            saveLayout(); // CUSTOM (Forge Neo)
        });
        canvasRadioInputs.push(radio);
        return h("label", { class: "jb-radio", for: id }, [radio, t]);
    });

    const summarySection = h("div", { class: "jb-section jb-sec-summary" }, [ // CUSTOM (Forge Neo): jb-sec-* = section tint
        h("div", { class: "jb-section-title" }, ["Summary"]),
        h("div", { class: "jb-row" }, canvasRadios),
        h("label", { class: "jb-fld-label", for: "jb-sum-caption" }, ["Caption"]),
        sumCaption,
        // CUSTOM (Forge Neo): Meta and Extra on their own rows (Extra is ~3x wider), plus a LoRA picker
        h("label", { class: "jb-fld-label", for: "jb-sum-meta" }, ["Meta"]),
        sumMeta,
        h("label", { class: "jb-fld-label", for: "jb-sum-extra" }, ["Extra"]),
        h("div", { class: "jb-row jb-extra-row" }, [sumExtra, loraBtn]),
    ]);
    sumCaption.id = "jb-sum-caption";
    sumMeta.id = "jb-sum-meta";
    sumExtra.id = "jb-sum-extra";

    const addBtn = h("button", { type: "button", class: "jb-add" }, ["Add Item"]);
    const clearBtn = h("button", { type: "button", class: "jb-clear" }, ["Clear All"]);
    const listEl = h("div", { class: "jb-list" });
    // CUSTOM (Forge Neo): undo / redo for the boxes
    const undoBtn = h("button", { type: "button", class: "jb-undo", title: "Undo (Ctrl+Z)", disabled: "" }, ["\u21B6 Undo"]);
    const redoBtn = h("button", { type: "button", class: "jb-redo", title: "Redo (Ctrl+Y)", disabled: "" }, ["\u21B7 Redo"]);
    const listToolbar = h("div", { class: "jb-list-toolbar" }, [addBtn, clearBtn, undoBtn, redoBtn]); // CUSTOM (Forge Neo): sits above Summary, not inside the list
    const listSection = h("div", { class: "jb-section jb-list-section" }, [listEl]);

    const sendT2I = h("button", { type: "button", class: "jb-send-t2i" }, ["Send to txt2img"]);
    const sendI2I = h("button", { type: "button", class: "jb-send-i2i" }, ["Send to img2img"]);
    const submitSection = h("div", { class: "jb-section jb-submit" }, [sendT2I, sendI2I]);

    // ----- save / load -----

    const loadPromptBtn = h("button", { type: "button", class: "jb-load-prompt" }, ["Load Prompt"]);
    // CUSTOM (Forge Neo): edit the prompt that is in txt2img now (e.g. one sent from here earlier)
    const fromT2IPromptBtn = h("button", { type: "button", class: "jb-from-t2i-prompt", title: "Load txt2img's current prompt and size back into the builder" }, ["From txt2img"]);
    const promptMsg = h("div", { class: "jb-char-msg jb-prompt-msg" }); // CUSTOM (Forge Neo): why a load failed
    const saveJsonBtn = h("button", { type: "button", class: "jb-save-json" }, ["Save JSON"]);
    const loadJsonBtn = h("button", { type: "button", class: "jb-load-json" }, ["Load JSON"]);
    const loadImageBtn = h("button", { type: "button", class: "jb-load-image", title: "Trace boxes over an image; takes its resolution" }, ["Load Image"]); // CUSTOM (Forge Neo)
    const clearImageBtn = h("button", { type: "button", class: "jb-clear-image", disabled: "" }, ["Clear Image"]); // CUSTOM (Forge Neo)
    const fromT2IBtn = h("button", { type: "button", class: "jb-from-t2i", title: "Use the selected (or latest) txt2img result as the reference image" }, ["From txt2img"]); // CUSTOM (Forge Neo)
    const fromI2IBtn = h("button", { type: "button", class: "jb-from-i2i", title: "Use img2img's input image as the reference image" }, ["From img2img"]); // CUSTOM (Forge Neo)
    const imageOpacity = h("input", { type: "range", class: "jb-image-opacity", min: "0", max: "100", step: "1", value: "100", disabled: "", title: "Image opacity (preview only)" }); // CUSTOM (Forge Neo)
    // CUSTOM (Forge Neo): Save/Load split into Prompt (beside Resolution) and Reference image (full width below)
    const promptSection = h("div", { class: "jb-section jb-save" }, [
        h("div", { class: "jb-section-title" }, ["Prompt"]),
        h("div", { class: "jb-row" }, [loadPromptBtn, fromT2IPromptBtn]), // CUSTOM (Forge Neo): + From txt2img
        h("div", { class: "jb-row" }, [saveJsonBtn, loadJsonBtn]),
        promptMsg,
    ]);
    const imageSection = h("div", { class: "jb-section jb-save jb-image" }, [
        h("div", { class: "jb-section-title" }, ["Reference image"]),
        h("div", { class: "jb-row" }, [loadImageBtn, clearImageBtn, fromT2IBtn, fromI2IBtn]),
        h("div", { class: "jb-row" }, [h("label", {}, ["Opacity"]), imageOpacity]),
    ]);

    const dialogInput = h("textarea", { class: "jb-dialog-input", placeholder: "Compiled Prompt or Layout Draft", spellcheck: "false" });
    const dialogWidth = h("input", { type: "number", min: "16", step: "16", class: "jb-dialog-width" });
    const dialogHeight = h("input", { type: "number", min: "16", step: "16", class: "jb-dialog-height" });
    const dialogClose = h("button", { type: "button", class: "jb-dialog-close", title: "Close" }, ["\u00D7"]);
    const dialogLoad = h("button", { type: "button", class: "jb-dialog-load" }, ["Load"]);
    const modal = h("div", { class: "jb-modal jb-hidden" }, [
        h("div", { class: "jb-dialog" }, [
            dialogClose,
            h("div", { class: "jb-dialog-body" }, [dialogInput, h("div", { class: "jb-dialog-dims" }, [h("label", {}, ["Width"]), dialogWidth, h("label", {}, ["Height"]), dialogHeight])]),
            dialogLoad,
        ]),
    ]);

    const fileInput = h("input", { type: "file", accept: ".json,application/json", class: "jb-file" });
    fileInput.style.display = "none";
    const imageInput = h("input", { type: "file", accept: "image/*", class: "jb-file" }); // CUSTOM (Forge Neo)
    imageInput.style.display = "none";

    // ----- CUSTOM (Forge Neo): characters -----
    // saved characters live in .jbcast files on the server (scripts/builder.py); Add puts
    // "(ABBR) Full name, description" into the Summary caption (javascript/characters.js)

    const CHAR_API = "/json_builder/characters";
    const charFileSelect = h("select", { class: "jb-char-file", title: "Character file" });
    const charNewFileBtn = h("button", { type: "button", class: "jb-char-new" }, ["New file"]);
    const charImportBtn = h("button", { type: "button", class: "jb-char-import", title: "Copy a .jbcast file into the character folder" }, ["Import…"]);
    const charImportInput = h("input", { type: "file", accept: ".jbcast", class: "jb-file" });
    charImportInput.style.display = "none";
    // delete the selected character file (moved to characters/deleted/); examples can't be deleted
    const charFileTrash = h("button", { type: "button", class: "jb-char-file-trash", title: "Delete this character file" });
    charFileTrash.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
    const charSelect = h("select", { class: "jb-char-select", title: "Saved characters" });
    const charAddBtn = h("button", { type: "button", class: "jb-char-add" }, ["Add to caption"]);
    const charBoxBtn = h("button", { type: "button", class: "jb-char-box", title: "Put (ABBR) in the selected box's caption, and the character's line in the Summary caption" }, ["Add to box"]); // CUSTOM (Forge Neo)
    const charAbbr = h("input", { type: "text", class: "jb-char-abbr", maxlength: "5", placeholder: "LS" });
    const charName = h("input", { type: "text", class: "jb-char-name", placeholder: "Full name" });
    const charDesc = h("textarea", { class: "jb-char-desc", rows: "2", placeholder: "Description" });
    const charSaveBtn = h("button", { type: "button", class: "jb-char-save" }, ["Save"]);
    const charDeleteBtn = h("button", { type: "button", class: "jb-char-delete" }, ["Delete"]);
    const charMsg = h("div", { class: "jb-char-msg" });
    const charFoldBtn = h("button", { type: "button", class: "jb-char-fold", title: "Show or hide the character editor" });
    // two inner panels: using a character in the prompt vs editing the saved roster
    const charEditor = h("div", { class: "jb-subpanel jb-char-editor" }, [
        h("div", { class: "jb-subpanel-title" }, ["Edit roster"]),
        h("div", { class: "jb-row" }, [charNewFileBtn, charImportBtn]),
        h("div", { class: "jb-row" }, [h("label", {}, ["Abbrev"]), charAbbr, h("label", {}, ["Name"]), charName]),
        charDesc,
        h("div", { class: "jb-row jb-char-actions" }, [charSaveBtn, charDeleteBtn]),
    ]);
    const charactersSection = h("div", { class: "jb-section jb-chars" }, [
        h("div", { class: "jb-section-title" }, ["Characters", charFoldBtn]),
        h("div", { class: "jb-subpanel jb-char-use" }, [
            h("div", { class: "jb-subpanel-title" }, ["Add to prompt"]),
            h("div", { class: "jb-row" }, [charFileSelect, charFileTrash]),
            h("div", { class: "jb-row" }, [charSelect, charAddBtn, charBoxBtn]),
        ]),
        charEditor,
        charMsg,
    ]);

    const charState = { file: null, example: false, characters: [] };

    function storeGet(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function storeSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* storage unavailable: the choice just isn't remembered */
        }
    }

    function charMessage(text, isError = false) {
        charMsg.textContent = text;
        charMsg.classList.toggle("jb-char-error", isError);
    }

    function promptMessage(text, isError = false) {
        promptMsg.textContent = text;
        promptMsg.classList.toggle("jb-char-error", isError);
    }

    function flash(button) {
        button.classList.add("jb-invalid");
        setTimeout(() => button.classList.remove("jb-invalid"), 1200);
    }

    async function charRequest(path, body) {
        const res = await fetch(`${CHAR_API}${path}`, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
        return data;
    }

    function setFolded(folded) {
        charEditor.classList.toggle("jb-hidden", folded);
        charFoldBtn.textContent = folded ? "Edit ▸" : "Edit ▾";
        storeSet("jb-char-folded", folded ? "1" : "0");
    }

    function renderCharacters(selectAbbr) {
        const sorted = [...charState.characters].sort((a, b) => a.abbr.localeCompare(b.abbr, undefined, { sensitivity: "base" }));
        charSelect.textContent = "";
        if (!sorted.length) charSelect.appendChild(h("option", { value: "" }, ["(no characters yet)"]));
        for (const c of sorted) charSelect.appendChild(h("option", { value: c.abbr }, [`${c.abbr} — ${c.name}`]));
        if (selectAbbr && sorted.some((c) => c.abbr === selectAbbr)) charSelect.value = selectAbbr;
        charAddBtn.disabled = !sorted.length;
        charSaveBtn.disabled = charState.example || !charState.file;
        charDeleteBtn.disabled = charState.example || !charState.file || !sorted.length;
        charFileTrash.disabled = charState.example || !charState.file;
        charFileTrash.title = charState.example ? "Examples can't be deleted" : "Delete this character file";
        if (charState.example) charMessage("Examples are read-only. Use New file to make your own.");
        fillEditor();
    }

    function selectedCharacter() {
        return charState.characters.find((c) => c.abbr === charSelect.value) || null;
    }

    function fillEditor() {
        const c = selectedCharacter();
        charAbbr.value = c ? c.abbr : "";
        charName.value = c ? c.name : "";
        charDesc.value = c ? c.description : "";
        autoGrow(charDesc);
    }

    function applyFile(data, selectAbbr) {
        charState.file = data.name;
        charState.example = data.example;
        charState.characters = data.characters;
        charFileSelect.value = data.name;
        storeSet("jb-char-file", data.name);
        renderCharacters(selectAbbr);
    }

    async function openCharFile(name) {
        charMessage("");
        try {
            applyFile(await charRequest(`/file?name=${encodeURIComponent(name)}`));
        } catch (e) {
            charState.file = name;
            charState.example = false;
            charState.characters = [];
            renderCharacters();
            charSaveBtn.disabled = charDeleteBtn.disabled = true;
            charFileTrash.disabled = false; // a damaged file can still be deleted
            charMessage(e.message, true);
        }
    }

    async function loadCharFiles(selectName) {
        try {
            const { files } = await charRequest("/files");
            charFileSelect.textContent = "";
            for (const f of files) charFileSelect.appendChild(h("option", { value: f }, [f]));
            if (!files.length) {
                charState.file = null;
                charState.characters = [];
                renderCharacters();
                charFileTrash.disabled = true;
                charMessage("No character files. Use New file.", true);
                return;
            }
            const wanted = [selectName, storeGet("jb-char-file")].find((f) => f && files.includes(f));
            await openCharFile(wanted || files[0]);
        } catch (e) {
            charMessage(e.message, true);
        }
    }

    charFileSelect.addEventListener("change", () => openCharFile(charFileSelect.value));
    charSelect.addEventListener("change", fillEditor);
    charFoldBtn.addEventListener("click", () => setFolded(!charEditor.classList.contains("jb-hidden")));

    charAddBtn.addEventListener("click", () => {
        const c = selectedCharacter();
        const next = c && jbAppendCharacter(sumCaption.value, c);
        if (!next) {
            flash(charAddBtn);
            if (c) charMessage(`(${c.abbr}) is already in the caption.`);
            return;
        }
        sumCaption.value = next;
        state.summary.caption = next;
        autoGrow(sumCaption);
        saveLayout();
        charMessage(`Added (${c.abbr}) to the caption.`);
    });

    // CUSTOM (Forge Neo): the box names the character by "(ABBR)"; the Summary caption says who that is
    charBoxBtn.addEventListener("click", () => {
        const c = selectedCharacter();
        const item = state.items.find((it) => it.id === selectedId);
        if (!c || !item) {
            flash(charBoxBtn);
            if (c) charMessage("Click a box on the canvas first.", true);
            return;
        }
        const n = state.items.indexOf(item) + 1;
        const boxNext = jbAddAbbr(item.caption, c.abbr);
        if (boxNext !== null) {
            item.caption = boxNext;
            const row = listRefs.get(item.id);
            if (row) {
                row.captionInput.value = boxNext;
                autoGrow(row.captionInput);
            }
            const box = canvasRefs.get(item.id);
            if (box) box.caption.value = boxNext;
            recordHistory();
        }
        const sumNext = jbAppendCharacter(sumCaption.value, c);
        if (sumNext) {
            sumCaption.value = sumNext;
            state.summary.caption = sumNext;
            autoGrow(sumCaption);
            saveLayout();
        }
        if (boxNext === null && !sumNext) charMessage(`(${c.abbr}) is already in box #${n} and the caption.`);
        else charMessage(`Added (${c.abbr}) to box #${n}${sumNext ? " and its line to the caption" : ""}.`);
    });

    charSaveBtn.addEventListener("click", async () => {
        try {
            const data = await charRequest("/save", { name: charState.file, abbr: charAbbr.value, full_name: charName.value, description: charDesc.value });
            applyFile(data, charAbbr.value.trim());
            charMessage(`Saved ${charAbbr.value.trim()} to ${data.name}.`);
        } catch (e) {
            flash(charSaveBtn);
            charMessage(e.message, true);
        }
    });

    charDeleteBtn.addEventListener("click", async () => {
        const abbr = charAbbr.value.trim();
        if (!abbr || !window.confirm(`Delete ${abbr} from ${charState.file}?`)) return;
        try {
            applyFile(await charRequest("/delete", { name: charState.file, abbr }));
            charMessage(`Deleted ${abbr}.`);
        } catch (e) {
            flash(charDeleteBtn);
            charMessage(e.message, true);
        }
    });

    charFileTrash.addEventListener("click", async () => {
        const name = charState.file;
        if (!name || charState.example) return;
        if (!window.confirm(`Delete ${name}?

It is moved to the characters/deleted folder, so it can be put back by hand.`)) return;
        try {
            await charRequest("/delete_file", { name });
            await loadCharFiles();
            charMessage(`Deleted ${name} (kept in characters/deleted).`);
        } catch (e) {
            flash(charFileTrash);
            charMessage(e.message, true);
        }
    });

    charNewFileBtn.addEventListener("click", async () => {
        const name = window.prompt("Name for the new character file:");
        if (!name || !name.trim()) return;
        try {
            const data = await charRequest("/file", { name });
            await loadCharFiles(data.name);
            charMessage(`Created ${data.name}.`);
        } catch (e) {
            flash(charNewFileBtn);
            charMessage(e.message, true);
        }
    });

    charImportBtn.addEventListener("click", () => charImportInput.click());
    charImportInput.addEventListener("change", async () => {
        const file = charImportInput.files[0];
        charImportInput.value = "";
        if (!file) return;
        try {
            const data = await charRequest("/import", { name: file.name, content: await file.text() });
            await loadCharFiles(data.name);
            charMessage(`Imported ${data.name}.`);
        } catch (e) {
            flash(charImportBtn);
            charMessage(e.message, true);
        }
    });

    const topRow = h("div", { class: "jb-top" }, [resolutionSection, promptSection]); // CUSTOM (Forge Neo)
    const side = h("div", { class: "jb-side" }, [topRow, imageSection, listToolbar, charactersSection, summarySection, listSection, submitSection]); // CUSTOM (Forge Neo)
    // CUSTOM (Forge Neo): LoRA picker, mirroring the txt2img LoRA tab's cards
    const loraSearch = h("input", { type: "text", class: "jb-lora-search", placeholder: "Search..." });
    const loraFolder = h("select", { class: "jb-lora-folder", title: "Active Lora folder" });
    const loraClose = h("button", { type: "button", class: "jb-dialog-close", title: "Close" }, ["×"]);
    const loraGrid = h("div", { class: "extra-network-cards jb-lora-grid" });
    const loraModal = h("div", { class: "jb-modal jb-hidden" }, [
        h("div", { class: "jb-dialog jb-lora-dialog" }, [
            loraClose,
            h("div", { class: "jb-row jb-lora-controls" }, [loraSearch, loraFolder]),
            h("div", { class: "extra-network-pane jb-lora-pane" }, [loraGrid]), // borrows the LoRA tab's card styling
        ]),
    ]);

    const root = h("div", { class: "jb-root" }, [canvasSection, side, modal, loraModal, fileInput, imageInput, charImportInput]); // CUSTOM (Forge Neo): + charImportInput

    tab.textContent = "";
    tab.appendChild(root);
    addGrowable(sumCaption);
    addGrowable(sumExtra); // CUSTOM (Forge Neo)

    function loadDraft(draft) {
        resPinned = true; // CUSTOM (Forge Neo)
        state.width = draft.width;
        state.height = draft.height;
        state.summary.caption = draft.summary.caption;
        state.summary.meta = draft.summary.meta.join(", ");
        state.summary.canvas = draft.summary.canvas;
        state.summary.extra = draft.extra || ""; // CUSTOM (Forge Neo): was always ""
        state.items = draft.items.map((item) => ({
            id: ++idCounter,
            label: item.label,
            caption: item.caption,
            text: item.text || "",
            bbox: item.bbox.slice(),
        }));

        widthInput.value = state.width;
        heightInput.value = state.height;
        sumCaption.value = state.summary.caption;
        sumMeta.value = state.summary.meta;
        sumExtra.value = state.summary.extra;
        autoGrow(sumCaption);
        autoGrow(sumExtra); // CUSTOM (Forge Neo)
        canvasRadioInputs.forEach((radio) => {
            radio.checked = radio.value === state.summary.canvas;
        });

        fitStage();
        renderAll();
    }

    function openDialog() {
        loadPromptBtn.classList.remove("jb-invalid");
        dialogInput.value = "";
        dialogWidth.value = state.width;
        dialogHeight.value = state.height;
        modal.classList.remove("jb-hidden");
        dialogInput.focus();
    }

    function closeDialog() {
        modal.classList.add("jb-hidden");
    }

    function handleDialogLoad() {
        const text = dialogInput.value.trim();
        if (text === "") {
            closeDialog();
            return;
        }
        try {
            const draft = decompilePrompt(text, parseFloat(dialogWidth.value), parseFloat(dialogHeight.value));
            loadDraft(draft);
            promptMessage("");
        } catch (e) {
            loadPromptBtn.classList.add("jb-invalid");
            promptMessage(`Couldn't load that prompt: ${e.message}`, true); // CUSTOM (Forge Neo)
        }
        closeDialog();
    }

    // ----- LoRA picker (CUSTOM (Forge Neo)) -----

    const loraCardsHtml = () => document.getElementById("txt2img_lora_cards_html");
    const loraFolderSource = () => document.querySelector("#txt2img_lora_folder_select");

    function renderLoraCards() {
        loraGrid.textContent = "";
        const query = loraSearch.value.trim().toLowerCase();
        const cards = loraCardsHtml()?.querySelectorAll(".card") ?? [];
        for (const card of cards) {
            if (query && !card.textContent.toLowerCase().includes(query)) continue;
            const clone = card.cloneNode(true);
            clone.removeAttribute("onclick");
            clone.removeAttribute("style");
            clone.querySelector(".button-row")?.remove();
            clone.addEventListener("click", () => pickLora(card));
            loraGrid.appendChild(clone);
        }
        if (!loraGrid.childElementCount) loraGrid.appendChild(h("div", { class: "jb-lora-empty" }, ["No LoRA found"]));
    }

    function syncLoraFolders() {
        const source = loraFolderSource();
        loraFolder.textContent = "";
        loraFolder.classList.toggle("jb-hidden", !source);
        if (!source) return;
        for (const opt of source.options) loraFolder.appendChild(h("option", { value: opt.value }, [opt.textContent]));
        loraFolder.value = source.value;
    }

    // the LoRA tab's own click handler builds the tag (weight, trigger words, ...); capture it instead of inserting into txt2img
    function pickLora(card) {
        const original = window.cardClicked;
        let tag = null;
        window.cardClicked = (_tabname, textToAdd) => {
            tag = textToAdd;
        };
        try {
            card.click();
        } finally {
            window.cardClicked = original;
        }
        if (!tag) return;
        const onPick = loraTarget;
        closeLoraPicker();
        onPick?.(tag);
    }

    function appendTag(field, tag) {
        const current = field.value.trim();
        field.value = current ? `${current} ${tag}` : tag;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        autoGrow(field);
    }

    const loraObserver = new MutationObserver(() => {
        if (!loraModal.classList.contains("jb-hidden")) renderLoraCards();
    });

    let loraTarget = null; // where the picked tag goes: the summary's Extra or an item's caption

    function openLoraPicker(onPick) {
        loraTarget = onPick;
        syncLoraFolders();
        renderLoraCards();
        const cardsHtml = loraCardsHtml();
        if (cardsHtml) loraObserver.observe(cardsHtml, { childList: true, subtree: true });
        loraModal.classList.remove("jb-hidden");
        loraSearch.focus();
    }

    function closeLoraPicker() {
        loraObserver.disconnect();
        loraTarget = null;
        loraModal.classList.add("jb-hidden");
    }

    loraBtn.addEventListener("click", () =>
        openLoraPicker((tag) => {
            appendTag(sumExtra, tag);
            state.summary.extra = sumExtra.value;
            saveLayout();
        }),
    );
    // shared by the list row and the canvas box; the row's input event keeps item.caption and the box in step
    function pickLoraForItem(item) {
        openLoraPicker((tag) => {
            const input = listRefs.get(item.id)?.captionInput;
            if (input) appendTag(input, tag);
        });
    }

    loraClose.addEventListener("click", closeLoraPicker);
    loraModal.addEventListener("click", (ev) => {
        if (ev.target === loraModal) closeLoraPicker();
    });
    loraSearch.addEventListener("input", renderLoraCards);
    loraFolder.addEventListener("change", () => {
        const source = loraFolderSource();
        if (!source) return;
        source.value = loraFolder.value;
        source.dispatchEvent(new Event("change", { bubbles: true }));
    });

    loadPromptBtn.addEventListener("click", openDialog);
    // CUSTOM (Forge Neo)
    fromT2IPromptBtn.addEventListener("click", () => {
        const text = t2i_prompt.value.trim();
        try {
            if (!text.includes("{")) throw new Error(text ? "it isn't a layout prompt" : "it is empty");
            loadDraft(decompilePrompt(text, jbSnap16(parseInt(t2i_width.value, 10)), jbSnap16(parseInt(t2i_height.value, 10))));
            promptMessage("Loaded txt2img's prompt.");
        } catch (e) {
            flash(fromT2IPromptBtn);
            promptMessage(`Couldn't load txt2img's prompt: ${e.message}`, true);
        }
    });
    dialogClose.addEventListener("click", closeDialog);
    dialogLoad.addEventListener("click", handleDialogLoad);

    saveJsonBtn.addEventListener("click", () => {
        const name = prompt("Save JSON as", "layout.json");
        if (name === null || name.trim() === "") return;
        const blob = new Blob([JSON.stringify(buildJson(), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = h("a", { href: url, download: name.trim() });
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    });

    loadJsonBtn.addEventListener("click", () => {
        loadJsonBtn.classList.remove("jb-invalid");
        fileInput.value = "";
        fileInput.click();
    });

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            try {
                const draft = decompilePrompt(reader.result, NaN, NaN);
                loadDraft(draft);
                promptMessage("");
            } catch (e) {
                loadJsonBtn.classList.add("jb-invalid");
                promptMessage(`Couldn't load ${file.name}: ${e.message}`, true); // CUSTOM (Forge Neo)
            }
        });
        reader.readAsText(file);
    });

    // ----- background image (CUSTOM (Forge Neo)) -----

    // an <img> with a blob: URL, not a CSS data: URL, which Chrome silently drops past ~2 MB
    const bgEl = h("img", { class: "jb-bg", alt: "", draggable: "false" });
    let bgFile = null; // the loaded reference image, sent to img2img

    function setBackground(file, url) {
        if (bgEl.src.startsWith("blob:")) URL.revokeObjectURL(bgEl.src);
        bgFile = file;
        if (url) bgEl.src = url;
        else bgEl.removeAttribute("src");
        stage.classList.toggle("jb-has-image", !!file);
        clearImageBtn.disabled = !file;
        imageOpacity.disabled = !file;
    }

    // preview only; the image sent to img2img stays untouched
    imageOpacity.addEventListener("input", () => {
        bgEl.style.opacity = String(imageOpacity.value / 100);
    });

    loadImageBtn.addEventListener("click", () => {
        loadImageBtn.classList.remove("jb-invalid");
        imageInput.value = "";
        imageInput.click();
    });

    // takes the image's resolution and scales the boxes with it; `button` turns red if it cannot be read
    function loadBackground(file, button) {
        [loadImageBtn, fromT2IBtn, fromI2IBtn].forEach((b) => b.classList.remove("jb-invalid"));
        setBackground(null); // a new pick always replaces the last one, even if it fails to load
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            // the prompt format needs multiples of 16; the image stretches by at most 8 px a side
            const width = round16(img.naturalWidth);
            const height = round16(img.naturalHeight);
            // boxes keep their place relative to the frame
            const sx = width / state.width;
            const sy = height / state.height;
            for (const item of state.items) {
                const [x1, y1, x2, y2] = item.bbox;
                item.bbox = [Math.round(x1 * sx), Math.round(y1 * sy), Math.round(x2 * sx), Math.round(y2 * sy)];
            }
            resPinned = true;
            widthInput.value = width;
            heightInput.value = height;
            setBackground(file, url);
            applyResolution(width, height);
            clampItemsToCanvas();
            renderList();
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            button.classList.add("jb-invalid");
        };
        img.src = url;
    }

    imageInput.addEventListener("change", () => {
        const file = imageInput.files?.[0];
        if (file) loadBackground(file, loadImageBtn);
    });

    async function loadBackgroundFromUrl(src, button) {
        button.classList.remove("jb-invalid");
        if (!src) {
            button.classList.add("jb-invalid");
            return;
        }
        try {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            loadBackground(await res.blob(), button);
        } catch (e) {
            console.error("[JSON Builder] could not grab the image:", e);
            button.classList.add("jb-invalid");
        }
    }

    // the result the txt2img gallery shows: the selected thumbnail, else the open preview, else the first result
    function txt2imgImageSrc() {
        const gallery = document.getElementById("txt2img_gallery");
        if (!gallery) return null;
        const img =
            gallery.querySelector(".thumbnail-item.selected img") ??
            gallery.querySelector(".preview img:not(.thumbnail-item img)") ??
            gallery.querySelector(".thumbnail-item img, .grid-wrap img");
        return img?.src || null;
    }

    function img2imgCanvas() {
        const target = document.getElementById("img2img_image");
        return Object.values(window.forgeCanvasInstances ?? {}).find((c) => target?.contains(document.getElementById(`drawingCanvas_${c.uuid}`)));
    }

    fromT2IBtn.addEventListener("click", () => loadBackgroundFromUrl(txt2imgImageSrc(), fromT2IBtn));
    fromI2IBtn.addEventListener("click", () => loadBackgroundFromUrl(img2imgCanvas()?.img || null, fromI2IBtn));

    clearImageBtn.addEventListener("click", () => setBackground(null));

    // puts the reference image into img2img's input canvas
    function sendImageToImg2img() {
        if (!bgFile) return;
        const canvas = img2imgCanvas();
        if (!canvas) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => canvas.loadImage(reader.result));
        reader.readAsDataURL(bgFile);
    }

    // ----- canvas sizing -----

    function fitStage() {
        const inset = 32;
        const cw = Math.max(1, canvasSection.clientWidth - inset);
        const ch = Math.max(1, canvasSection.clientHeight - inset);
        const ratio = state.width / state.height;
        let w = cw;
        let hgt = cw / ratio;
        if (hgt > ch) {
            hgt = ch;
            w = ch * ratio;
        }
        stage.style.width = w + "px";
        stage.style.height = hgt + "px";
        clampPan();
        resetView();
    }

    function applyView() {
        stage.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`;
        stage.style.setProperty("--jb-text-scale", String(1 / Math.max(1, view.scale)));
    }

    function clampAxis(pan, canvasSize, stageSize) {
        const diff = (stageSize - canvasSize) / 2;
        return diff >= 0 ? clamp(pan, -diff, diff) : clamp(pan, diff, -diff);
    }

    function clampPan() {
        const c = canvasSection.getBoundingClientRect();
        const r = stage.getBoundingClientRect();
        view.panX = clampAxis(view.panX, c.width, r.width);
        view.panY = clampAxis(view.panY, c.height, r.height);
    }

    function zoomAt(clientX, clientY, factor) {
        const next = clamp(view.scale * factor, MIN_ZOOM, MAX_ZOOM);
        const ratio = next / view.scale;
        if (ratio === 1) return;
        const r = stage.getBoundingClientRect();
        view.panX += (clientX - (r.left + r.width / 2)) * (1 - ratio);
        view.panY += (clientY - (r.top + r.height / 2)) * (1 - ratio);
        view.scale = next;
        applyView();
        clampPan();
        applyView();
    }

    function resetView() {
        view.scale = 1;
        view.panX = 0;
        view.panY = 0;
        applyView();
    }

    function startPan(e) {
        const sx = e.clientX;
        const sy = e.clientY;
        const px = view.panX;
        const py = view.panY;
        stage.classList.add("jb-panning");
        function move(ev) {
            view.panX = px + (ev.clientX - sx);
            view.panY = py + (ev.clientY - sy);
            clampPan();
            applyView();
        }
        function up() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            stage.classList.remove("jb-panning");
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }

    stage.addEventListener(
        "wheel",
        (e) => {
            e.preventDefault();
            zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
        },
        { passive: false },
    );

    stage.addEventListener("pointerdown", (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        startPan(e);
    });

    stage.addEventListener("dblclick", (e) => {
        if (e.target.closest(".jb-box")) return;
        resetView();
    });

    function updateBoxPosition(item) {
        const ref = canvasRefs.get(item.id);
        if (!ref) return;
        const [x1, y1, x2, y2] = item.bbox;
        ref.el.style.left = (x1 / state.width) * 100 + "%";
        ref.el.style.top = (y1 / state.height) * 100 + "%";
        ref.el.style.width = ((x2 - x1) / state.width) * 100 + "%";
        ref.el.style.height = ((y2 - y1) / state.height) * 100 + "%";
    }

    function syncListNums(item) {
        const ref = listRefs.get(item.id);
        if (!ref) return;
        ref.numInputs.forEach((inp, i) => {
            if (document.activeElement !== inp) inp.value = item.bbox[i];
        });
    }

    function makeEditable(item, field) {
        const ta = h("textarea", { class: "jb-field", placeholder: field, readonly: "", spellcheck: "false" });
        ta.value = item[field] || "";
        ta.addEventListener("dblclick", () => {
            ta.readOnly = false;
            ta.focus();
        });
        ta.addEventListener("blur", () => {
            ta.readOnly = true;
        });
        ta.addEventListener("input", () => {
            item[field] = ta.value;
            recordHistory(`${field}:${item.id}`); // CUSTOM (Forge Neo)
            const ref = listRefs.get(item.id);
            if (!ref) return;
            const inp = field === "caption" ? ref.captionInput : ref.textInput;
            if (inp && document.activeElement !== inp) {
                inp.value = ta.value;
                autoGrow(inp);
            }
        });
        return ta;
    }

    // CUSTOM (Forge Neo): snap guides
    const guideV = h("div", { class: "jb-guide jb-guide-v jb-hidden" });
    const guideH = h("div", { class: "jb-guide jb-guide-h jb-hidden" });
    const SNAP_PX = 6; // on screen

    function showGuides(x, y) {
        guideV.classList.toggle("jb-hidden", x === null);
        guideH.classList.toggle("jb-hidden", y === null);
        if (x !== null) guideV.style.left = (x / state.width) * 100 + "%";
        if (y !== null) guideH.style.top = (y / state.height) * 100 + "%";
    }

    function snapTargetsFor(item) {
        return jbSnapTargets(state.items.filter((it) => it !== item).map((it) => it.bbox), state.width, state.height);
    }

    function startDrag(item, e) {
        const ref = canvasRefs.get(item.id);
        const rect = stage.getBoundingClientRect();
        const scaleX = state.width / rect.width;
        const scaleY = state.height / rect.height;
        const sx = e.clientX;
        const sy = e.clientY;
        const [x1, y1, x2, y2] = item.bbox;
        const w = x2 - x1;
        const hgt = y2 - y1;
        let moved = false;
        const targets = snapTargetsFor(item); // CUSTOM (Forge Neo)

        function move(ev) {
            const dx = (ev.clientX - sx) * scaleX;
            const dy = (ev.clientY - sy) * scaleY;
            if (!moved && Math.hypot(dx, dy) < 3) return;
            moved = true;
            ref.el.classList.add("jb-active");
            let nx1 = clamp(Math.round(x1 + dx), 0, state.width - w);
            let ny1 = clamp(Math.round(y1 + dy), 0, state.height - hgt);
            // CUSTOM (Forge Neo): edges and centre snap to the canvas and the other boxes; Alt places freely
            let gx = null;
            let gy = null;
            if (!ev.altKey) {
                const snapX = jbSnapOffset([nx1, nx1 + w / 2, nx1 + w], targets.x, SNAP_PX * scaleX);
                const snapY = jbSnapOffset([ny1, ny1 + hgt / 2, ny1 + hgt], targets.y, SNAP_PX * scaleY);
                if (snapX) [nx1, gx] = [clamp(Math.round(nx1 + snapX.delta), 0, state.width - w), snapX.at];
                if (snapY) [ny1, gy] = [clamp(Math.round(ny1 + snapY.delta), 0, state.height - hgt), snapY.at];
            }
            showGuides(gx, gy);
            item.bbox = [nx1, ny1, nx1 + w, ny1 + hgt];
            updateBoxPosition(item);
            syncListNums(item);
        }

        function up() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            ref.el.classList.remove("jb-active");
            showGuides(null, null); // CUSTOM (Forge Neo)
            if (moved) recordHistory(); // CUSTOM (Forge Neo)
        }

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }

    // CUSTOM (Forge Neo): resize from any side or corner (`dir`); Shift keeps the shape
    function startResize(item, e, dir = "se") {
        e.stopPropagation();
        const ref = canvasRefs.get(item.id);
        const rect = stage.getBoundingClientRect();
        const scaleX = state.width / rect.width;
        const scaleY = state.height / rect.height;
        const sx = e.clientX;
        const sy = e.clientY;
        const [x1, y1, x2, y2] = item.bbox;
        ref.el.classList.add("jb-active");
        const targets = snapTargetsFor(item);

        function move(ev) {
            item.bbox = jbResizeBox([x1, y1, x2, y2], dir, (ev.clientX - sx) * scaleX, (ev.clientY - sy) * scaleY, {
                maxW: state.width,
                maxH: state.height,
                min: 16,
                keepAspect: ev.shiftKey,
            });
            // the edge being dragged snaps too (not while Shift keeps the shape, or with Alt)
            let gx = null;
            let gy = null;
            if (!ev.shiftKey && !ev.altKey) {
                const b = item.bbox;
                const xi = dir.includes("e") ? 2 : dir.includes("w") ? 0 : -1;
                const yi = dir.includes("s") ? 3 : dir.includes("n") ? 1 : -1;
                const snapEdge = (i, list, thr, other, lo, hi) => {
                    const r = jbSnapOffset([b[i]], list, thr);
                    const v = r && b[i] + r.delta;
                    if (r && (i === other + 2 ? v - b[other] >= 16 : b[other] - v >= 16) && v >= lo && v <= hi) {
                        b[i] = Math.round(v);
                        return r.at;
                    }
                    return null;
                };
                if (xi >= 0) gx = snapEdge(xi, targets.x, SNAP_PX * scaleX, xi === 2 ? 0 : 2, 0, state.width);
                if (yi >= 0) gy = snapEdge(yi, targets.y, SNAP_PX * scaleY, yi === 3 ? 1 : 3, 0, state.height);
            }
            showGuides(gx, gy);
            updateBoxPosition(item);
            syncListNums(item);
        }

        function up() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            ref.el.classList.remove("jb-active");
            showGuides(null, null);
            recordHistory();
        }

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }

    function createBox(item) {
        const el = h("div", { class: "jb-box", dataset: { id: String(item.id) } });
        // CUSTOM (Forge Neo): the tag is a dropdown to change the item's type
        const tag = h(
            "select",
            { class: "jb-box-tag", title: "Item type" },
            LABELS.map((label) => h("option", { value: label }, [label])),
        );
        tag.value = item.label;
        tag.addEventListener("change", () => {
            item.label = tag.value;
            renderAll();
        });
        // CUSTOM (Forge Neo): the item's number, as the prompt counts them (regional LoRA "item N")
        const num = h("span", { class: "jb-box-tag jb-box-num", title: "Item number in the prompt" }, [`#${state.items.indexOf(item) + 1}`]);
        el.appendChild(h("div", { class: "jb-box-head" }, [num, tag]));

        const caption = makeEditable(item, "caption");
        el.appendChild(caption);

        let text = null;
        if (item.label === "text") {
            text = makeEditable(item, "text");
            text.classList.add("jb-box-text");
            el.appendChild(text);
        }

        // CUSTOM (Forge Neo): delete button in the top-right corner
        const trash = h("button", { type: "button", class: "jb-box-trash", title: "Delete this box" });
        trash.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
        trash.addEventListener("pointerdown", (ev) => ev.stopPropagation());
        trash.addEventListener("click", (ev) => {
            ev.stopPropagation();
            removeItem(item.id);
        });
        el.appendChild(trash);

        // CUSTOM (Forge Neo): duplicate button, left of the trash button
        const copy = h("button", { type: "button", class: "jb-box-copy", title: "Duplicate this box" });
        copy.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
        copy.addEventListener("pointerdown", (ev) => ev.stopPropagation());
        copy.addEventListener("click", (ev) => {
            ev.stopPropagation();
            duplicateItem(item.id);
        });
        el.appendChild(copy);

        // CUSTOM (Forge Neo): LoRA picker along the box's bottom edge, same as the row's button
        const boxLora = h("button", { type: "button", class: "jb-box-lora", title: "Add a LoRA to this item's caption" }, ["+ LoRA"]);
        boxLora.addEventListener("pointerdown", (ev) => ev.stopPropagation());
        boxLora.addEventListener("click", (ev) => {
            ev.stopPropagation();
            pickLoraForItem(item);
        });
        el.appendChild(boxLora);

        // CUSTOM (Forge Neo): a handle on every side and corner
        for (const dir of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
            const handle = h("div", { class: `jb-box-handle jb-h-${dir}` });
            handle.addEventListener("pointerdown", (ev) => {
                if (ev.button !== 0) return;
                bringToFront(item.id);
                selectBox(item.id);
                startResize(item, ev, dir);
            });
            el.appendChild(handle);
        }

        el.addEventListener("pointerdown", (ev) => {
            if (ev.button !== 0) return;
            bringToFront(item.id); // CUSTOM (Forge Neo)
            selectBox(item.id); // CUSTOM (Forge Neo)
            if (ev.target.classList.contains("jb-box-handle")) return; // CUSTOM (Forge Neo)
            if (ev.target === tag) return; // CUSTOM (Forge Neo)
            if (ev.target.tagName === "TEXTAREA" && !ev.target.readOnly) return;
            ev.preventDefault();
            startDrag(item, ev);
        });

        if (item.id === selectedId) el.classList.add("jb-selected"); // CUSTOM (Forge Neo)
        canvasRefs.set(item.id, { el, caption, text });
        updateBoxPosition(item);
        return el;
    }

    // CUSTOM (Forge Neo): the clicked box goes on top of the others, so its text can be
    // reached when boxes overlap. z-index stays 1..n (below the builder's modals).
    function applyStacking() {
        const ids = new Set(state.items.map((it) => it.id));
        stackOrder = stackOrder.filter((id) => ids.has(id));
        for (const it of state.items) if (!stackOrder.includes(it.id)) stackOrder.push(it.id);
        stackOrder.forEach((id, i) => {
            const ref = canvasRefs.get(id);
            if (ref) ref.el.style.zIndex = String(i + 1);
        });
    }

    // CUSTOM (Forge Neo): the box the keyboard shortcuts act on
    function selectBox(id) {
        selectedId = id;
        for (const [rid, ref] of canvasRefs) ref.el.classList.toggle("jb-selected", rid === id);
    }

    function bringToFront(id) {
        stackOrder = stackOrder.filter((x) => x !== id);
        stackOrder.push(id);
        applyStacking();
    }

    function renderCanvas() {
        stage.textContent = "";
        stage.appendChild(bgEl); // CUSTOM (Forge Neo)
        canvasRefs.clear();
        for (const item of state.items) stage.appendChild(createBox(item));
        stage.append(guideV, guideH); // CUSTOM (Forge Neo)
        applyStacking(); // CUSTOM (Forge Neo)
    }

    // ----- list -----

    function createRow(item) {
        const row = h("div", { class: "jb-item", dataset: { id: String(item.id) } });

        const top = h("div", { class: "jb-item-top" });
        const radios = LABELS.map((label) => {
            const id = `jb-${item.id}-${label}`;
            const radio = h("input", {
                type: "radio",
                name: `jb-label-${item.id}`,
                value: label,
                id,
                checked: item.label === label,
            });
            radio.addEventListener("change", () => {
                if (radio.checked) {
                    item.label = label;
                    renderAll();
                }
            });
            return h("label", { class: "jb-radio", for: id }, [radio, label]);
        });
        top.append(h("span", { class: "jb-item-num", title: "Item number in the prompt" }, [`#${state.items.indexOf(item) + 1}`])); // CUSTOM (Forge Neo)
        top.append(...radios);

        const remove = h("button", { type: "button", class: "jb-remove", title: "Remove" }, ["\u00D7"]);
        remove.addEventListener("click", () => removeItem(item.id));
        // CUSTOM (Forge Neo): LoRA picker for this item's caption
        const itemLoraBtn = h("button", { type: "button", class: "jb-item-lora", title: "Add a LoRA to this item's caption" }, ["+ LoRA"]);
        top.append(itemLoraBtn, remove);
        row.appendChild(top);

        const caption = h("textarea", { class: "jb-item-caption", placeholder: "caption", rows: "1", value: item.caption });
        caption.addEventListener("input", () => {
            item.caption = caption.value;
            recordHistory(`caption:${item.id}`); // CUSTOM (Forge Neo)
            autoGrow(caption);
            const ref = canvasRefs.get(item.id);
            if (ref && document.activeElement !== ref.caption) ref.caption.value = caption.value;
        });
        row.appendChild(caption);
        addGrowable(caption);
        itemLoraBtn.addEventListener("click", () => pickLoraForItem(item)); // CUSTOM (Forge Neo)

        let textInput = null;
        if (item.label === "text") {
            textInput = h("input", { type: "text", class: "jb-item-text", placeholder: "text", value: item.text });
            textInput.addEventListener("input", () => {
                item.text = textInput.value;
                recordHistory(`text:${item.id}`); // CUSTOM (Forge Neo)
                const ref = canvasRefs.get(item.id);
                if (ref?.text && document.activeElement !== ref.text) ref.text.value = textInput.value;
            });
            row.appendChild(textInput);
        }

        const placeholders = ["x1", "y1", "x2", "y2"];
        const nums = h("div", { class: "jb-item-nums" });
        const numInputs = item.bbox.map((value, i) => {
            const inp = h("input", { type: "number", class: "jb-num", placeholder: placeholders[i], value });
            inp.addEventListener("input", () => {
                const v = parseFloat(inp.value);
                if (!Number.isNaN(v)) {
                    item.bbox[i] = v;
                    updateBoxPosition(item);
                    recordHistory(`bbox:${item.id}`); // CUSTOM (Forge Neo)
                }
            });
            // CUSTOM (Forge Neo): on leaving the field, put corners in order and the box inside the canvas
            inp.addEventListener("change", () => {
                item.bbox = jbFixBox(item.bbox, state.width, state.height, 16);
                numInputs.forEach((n, j) => (n.value = item.bbox[j]));
                updateBoxPosition(item);
                recordHistory(`bbox:${item.id}`);
            });
            nums.appendChild(inp);
            return inp;
        });
        row.appendChild(nums);

        listRefs.set(item.id, { row, captionInput: caption, textInput, numInputs });
        return row;
    }

    function renderList() {
        listEl.textContent = "";
        listRefs.clear();
        pruneGrowables();
        for (const item of state.items) listEl.appendChild(createRow(item));
    }

    function renderAll() {
        renderList();
        renderCanvas();
        recordHistory(); // CUSTOM (Forge Neo)
    }

    // CUSTOM (Forge Neo): undo / redo
    function updateUndoButtons() {
        undoBtn.disabled = !undoHistory.canUndo();
        redoBtn.disabled = !undoHistory.canRedo();
    }

    function restoreItems(snap) {
        if (snap === null) return;
        restoring = true;
        const saved = JSON.parse(snap);
        state.items = saved.items;
        if (saved.width !== state.width || saved.height !== state.height) {
            resPinned = true;
            widthInput.value = saved.width;
            heightInput.value = saved.height;
            state.width = saved.width;
            state.height = saved.height;
            fitStage();
        }
        idCounter = Math.max(idCounter, ...state.items.map((it) => it.id));
        if (!state.items.some((it) => it.id === selectedId)) selectedId = null;
        renderAll();
        restoring = false;
        updateUndoButtons();
    }

    undoBtn.addEventListener("click", () => restoreItems(undoHistory.undo()));
    redoBtn.addEventListener("click", () => restoreItems(undoHistory.redo()));

    function addItem() {
        state.items.push(newItem());
        renderAll();
    }

    function removeItem(id) {
        const index = state.items.findIndex((it) => it.id === id);
        if (index >= 0) state.items.splice(index, 1);
        if (state.items.length === 0) state.items.push(newItem());
        renderAll();
    }

    // CUSTOM (Forge Neo): copy a box (type, caption, text, size), offset so it doesn't sit on top
    function duplicateItem(id) {
        const index = state.items.findIndex((it) => it.id === id);
        if (index < 0) return;
        const src = state.items[index];
        const [x1, y1, x2, y2] = src.bbox;
        const w = x2 - x1;
        const ht = y2 - y1;
        const off = Math.max(16, Math.round(Math.min(state.width, state.height) * 0.04));
        const nx1 = clamp(x1 + off, 0, Math.max(0, state.width - w));
        const ny1 = clamp(y1 + off, 0, Math.max(0, state.height - ht));
        const copy = { ...src, id: ++idCounter, bbox: [nx1, ny1, nx1 + w, ny1 + ht] };
        state.items.splice(index + 1, 0, copy);
        selectedId = copy.id; // CUSTOM (Forge Neo): the copy is the one the keys move next
        bringToFront(copy.id);
        renderAll();
    }

    function clearItems() {
        state.items = [newItem()];
        renderAll();
    }

    // ----- inputs -----

    // CUSTOM (Forge Neo): default to the txt2img resolution until the user sets one here
    let resPinned = false;

    function syncFromTxt2img() {
        if (resPinned) return;
        const w = jbSnap16(parseInt(t2i_width.value, 10)); // txt2img allows multiples of 8; the prompt needs 16
        const hgt = jbSnap16(parseInt(t2i_height.value, 10));
        if (w === null || hgt === null || (w === state.width && hgt === state.height)) return;
        widthInput.value = w;
        heightInput.value = hgt;
        applyResolution(w, hgt);
        clampItemsToCanvas();
    }

    function applyResolution(w, h) {
        state.width = w;
        state.height = h;
        fitStage();
        renderCanvas();
    }

    function clampItemsToCanvas() {
        for (const item of state.items) {
            const bw = Math.min(item.bbox[2] - item.bbox[0], state.width);
            const bh = Math.min(item.bbox[3] - item.bbox[1], state.height);
            const x1 = clamp(item.bbox[0], 0, state.width - bw);
            const y1 = clamp(item.bbox[1], 0, state.height - bh);
            item.bbox = [x1, y1, x1 + bw, y1 + bh];
            syncListNums(item);
        }
        renderCanvas();
        recordHistory(); // CUSTOM (Forge Neo)
    }

    widthInput.addEventListener("input", () => {
        resPinned = true; // CUSTOM (Forge Neo)
        const v = parseInt(widthInput.value, 10);
        if (v > 0) applyResolution(v, state.height);
    });
    widthInput.addEventListener("change", () => snapResolution(widthInput));

    heightInput.addEventListener("input", () => {
        resPinned = true; // CUSTOM (Forge Neo)
        const v = parseInt(heightInput.value, 10);
        if (v > 0) applyResolution(state.width, v);
    });
    heightInput.addEventListener("change", () => snapResolution(heightInput));

    // CUSTOM (Forge Neo): the prompt needs multiples of 16, so a typed 1000 becomes 1008 (it would fail at Send)
    function snapResolution(input) {
        const v = jbSnap16(parseInt(input.value, 10));
        input.value = v === null ? (input === widthInput ? state.width : state.height) : v;
        applyResolution(parseInt(widthInput.value, 10), parseInt(heightInput.value, 10));
        clampItemsToCanvas();
    }

    // CUSTOM (Forge Neo): swap width and height
    swapResBtn.addEventListener("click", () => {
        resPinned = true;
        const w = state.width;
        const hgt = state.height;
        widthInput.value = hgt;
        heightInput.value = w;
        applyResolution(hgt, w);
        clampItemsToCanvas();
    });

    setResBtn.addEventListener("click", () => {
        const mp = parseFloat(mpInput.value);
        if (!(mp > 0)) return;
        resPinned = true; // CUSTOM (Forge Neo)
        const [aw, ah] = arSelect.value.split(":").map(Number);
        const area = mp * MP_PIXELS;
        const w = Math.sqrt((area * aw) / ah);
        const hgt = area / w;
        const width = round16(w);
        const height = round16(hgt);
        widthInput.value = width;
        heightInput.value = height;
        applyResolution(width, height);
        clampItemsToCanvas();
    });

    sumCaption.addEventListener("input", () => {
        state.summary.caption = sumCaption.value;
        autoGrow(sumCaption);
        saveLayout(); // CUSTOM (Forge Neo)
    });
    sumMeta.addEventListener("input", () => {
        state.summary.meta = sumMeta.value;
        saveLayout(); // CUSTOM (Forge Neo)
    });
    sumExtra.addEventListener("input", () => {
        state.summary.extra = sumExtra.value;
        autoGrow(sumExtra); // CUSTOM (Forge Neo)
        saveLayout(); // CUSTOM (Forge Neo)
    });

    addBtn.addEventListener("click", addItem);
    clearBtn.addEventListener("click", clearItems);

    // ----- submit -----

    function buildJson() {
        const meta = state.summary.meta
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const summary = {};
        if (meta.length) summary.meta = meta;
        summary.canvas = state.summary.canvas;
        summary.caption = state.summary.caption;
        return {
            width: state.width,
            height: state.height,
            bbox_coord_space: "abs",
            bbox_format: "xyxy",
            summary,
            items: state.items.map((item) => {
                const out = { label: item.label, caption: item.caption, bbox: item.bbox.map((n) => Math.round(n)) };
                if (item.label === "text") out.text = item.text;
                return out;
            }),
        };
    }

    function validate() {
        root.querySelectorAll(".jb-invalid").forEach((el) => {
            el.classList.remove("jb-invalid");
        });
        const invalid = [];

        if (state.summary.caption.trim() === "") invalid.push(sumCaption);

        for (const item of state.items) {
            const list = listRefs.get(item.id);
            const canvas = canvasRefs.get(item.id);

            if (item.caption.trim() === "") {
                if (list) invalid.push(list.captionInput);
                if (canvas) invalid.push(canvas.caption);
            }
            if (item.label === "text" && item.text.trim() === "") {
                if (list?.textInput) invalid.push(list.textInput);
                if (canvas?.text) invalid.push(canvas.text);
            }
        }

        invalid.forEach((el) => {
            el.classList.add("jb-invalid");
        });
        return invalid.length === 0;
    }

    function submit(which) {
        if (!validate()) return;
        let prompt = null;

        try {
            prompt = compilePrompt(JSON.stringify(buildJson()));
        } catch (e) {
            alert(e);
            return;
        }

        if (state.summary.extra.trim() !== "") {
            prompt += "\n" + state.summary.extra;
        }

        const promptEl = which === "t2i" ? t2i_prompt : i2i_prompt;
        const widthEl = which === "t2i" ? t2i_width : i2i_width;
        const heightEl = which === "t2i" ? t2i_height : i2i_height;

        promptEl.value = prompt.replaceAll("\n", " ");
        widthEl.value = state.width;
        heightEl.value = state.height;
        updateInput(promptEl);
        updateInput(widthEl);
        updateInput(heightEl);
        if (which === "t2i") resPinned = false; // CUSTOM (Forge Neo): sizes match again, resume following txt2img

        if (which === "t2i") switch_to_txt2img();
        else {
            switch_to_img2img();
            sendImageToImg2img(); // CUSTOM (Forge Neo)
        }
    }

    sendT2I.addEventListener("click", () => submit("t2i"));
    sendI2I.addEventListener("click", () => submit("i2i"));

    // ----- init -----

    // CUSTOM (Forge Neo): bring back the layout from before the page was refreshed
    const savedLayout = jbSavedLayout(storeGet(LAYOUT_KEY));
    if (savedLayout) {
        const meta = savedLayout.summary.meta.trim();
        loadDraft({ ...savedLayout, summary: { ...savedLayout.summary, meta: meta ? [meta] : [] }, extra: savedLayout.summary.extra });
    }
    renderAll();
    undoHistory.reset(itemsSnapshot()); // CUSTOM (Forge Neo): the starting boxes are not an undo step
    updateUndoButtons();
    syncFromTxt2img(); // CUSTOM (Forge Neo)

    // CUSTOM (Forge Neo): keyboard shortcuts while the JSON Builder is showing and no field is being typed in
    stage.addEventListener("pointerdown", (ev) => {
        if (ev.button === 0 && !ev.target.closest(".jb-box")) selectBox(null);
    });

    function isTyping(t) {
        if (t.isContentEditable || t.tagName === "SELECT") return true;
        if (t.tagName === "TEXTAREA") return !t.readOnly;
        if (t.tagName === "INPUT") return !["radio", "checkbox", "range", "button", "file"].includes(t.type);
        return false;
    }

    document.addEventListener("keydown", (ev) => {
        if (!root.isConnected || root.offsetParent === null) return;
        // CUSTOM (Forge Neo): Esc closes an open window, even while typing in it
        if (ev.key === "Escape" && !loraModal.classList.contains("jb-hidden")) {
            closeLoraPicker();
            ev.preventDefault();
            return;
        }
        if (ev.key === "Escape" && !modal.classList.contains("jb-hidden")) {
            closeDialog();
            ev.preventDefault();
            return;
        }
        if (!modal.classList.contains("jb-hidden") || !loraModal.classList.contains("jb-hidden")) return;
        const t = ev.target;
        if (!(t === document.body || root.contains(t)) || isTyping(t)) return;
        const ctrl = ev.ctrlKey || ev.metaKey;
        const key = ev.key.toLowerCase();
        const item = state.items.find((it) => it.id === selectedId);

        if (ctrl && key === "z") {
            restoreItems(ev.shiftKey ? undoHistory.redo() : undoHistory.undo());
        } else if (ctrl && key === "y") {
            restoreItems(undoHistory.redo());
        } else if (ctrl && key === "d" && item) {
            duplicateItem(item.id);
        } else if (ev.key === "Delete" && item && !ctrl) {
            selectedId = null;
            removeItem(item.id);
        } else if (ev.key === "Escape" && selectedId !== null) {
            selectBox(null);
        } else if (ev.key.startsWith("Arrow") && item && !ctrl) {
            const step = ev.shiftKey ? 64 : 8;
            const dx = ev.key === "ArrowLeft" ? -step : ev.key === "ArrowRight" ? step : 0;
            const dy = ev.key === "ArrowUp" ? -step : ev.key === "ArrowDown" ? step : 0;
            item.bbox = jbMoveBox(item.bbox, dx, dy, state.width, state.height);
            updateBoxPosition(item);
            syncListNums(item);
            recordHistory(`move:${item.id}`);
        } else {
            return;
        }
        ev.preventDefault();
    });
    addGrowable(charDesc); // CUSTOM (Forge Neo): characters
    setFolded(storeGet("jb-char-folded") === "1");
    loadCharFiles();
    fitStage();
    requestAnimationFrame(fitStage);
    // CUSTOM (Forge Neo): re-read txt2img's resolution each time this tab is shown
    if (window.IntersectionObserver)
        new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) syncFromTxt2img();
        }).observe(tab);
    if (window.ResizeObserver) new ResizeObserver(fitStage).observe(canvasSection);
});
