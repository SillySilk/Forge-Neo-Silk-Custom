// CUSTOM (Forge Neo): editing helpers for the JSON Builder canvas (used by main.js):
// undo/redo history, resizing a box from any side or corner, and moving it with the keys.

// Undo/redo over snapshots (strings). Changes with the same key in quick succession,
// such as typing in one field, are merged into one step.
class JbHistory {
    constructor(limit = 100, mergeMs = 1500) {
        this.limit = limit;
        this.mergeMs = mergeMs;
        this.reset("");
    }

    reset(snapshot) {
        this.steps = [snapshot];
        this.index = 0;
        this.lastKey = null;
        this.lastTime = -Infinity;
    }

    current() {
        return this.steps[this.index];
    }

    commit(snapshot, key = null, now = Date.now()) {
        if (snapshot === this.current()) return;
        const merge = key !== null && key === this.lastKey && now - this.lastTime < this.mergeMs && this.index > 0;
        this.steps.length = this.index + 1;
        if (merge) {
            this.steps[this.index] = snapshot;
        } else {
            this.steps.push(snapshot);
            if (this.steps.length > this.limit + 1) this.steps.shift();
            this.index = this.steps.length - 1;
        }
        this.lastKey = key;
        this.lastTime = now;
    }

    canUndo() {
        return this.index > 0;
    }

    canRedo() {
        return this.index < this.steps.length - 1;
    }

    undo() {
        if (!this.canUndo()) return null;
        this.index -= 1;
        this.lastKey = null;
        return this.current();
    }

    redo() {
        if (!this.canRedo()) return null;
        this.index += 1;
        this.lastKey = null;
        return this.current();
    }
}

function jbClampNum(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// New [x1, y1, x2, y2] after dragging handle `dir` (n, s, e, w, ne, nw, se, sw) by dx, dy.
// opts: maxW, maxH (canvas size), min (smallest side), keepAspect (Shift held).
function jbResizeBox(bbox, dir, dx, dy, opts) {
    const { maxW, maxH, min = 16, keepAspect = false } = opts;
    const [x1, y1, x2, y2] = bbox;
    const fx = dir.includes("e") ? 1 : dir.includes("w") ? -1 : 0;
    const fy = dir.includes("s") ? 1 : dir.includes("n") ? -1 : 0;

    if (!keepAspect) {
        let [nx1, ny1, nx2, ny2] = [x1, y1, x2, y2];
        if (fx > 0) nx2 = jbClampNum(x2 + dx, x1 + min, maxW);
        if (fx < 0) nx1 = jbClampNum(x1 + dx, 0, x2 - min);
        if (fy > 0) ny2 = jbClampNum(y2 + dy, y1 + min, maxH);
        if (fy < 0) ny1 = jbClampNum(y1 + dy, 0, y2 - min);
        return [nx1, ny1, nx2, ny2].map(Math.round);
    }

    const w0 = x2 - x1;
    const h0 = y2 - y1;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    // room to grow along each axis, measured from the edge or centre that stays put
    const roomX = fx > 0 ? maxW - x1 : fx < 0 ? x2 : 2 * Math.min(cx, maxW - cx);
    const roomY = fy > 0 ? maxH - y1 : fy < 0 ? y2 : 2 * Math.min(cy, maxH - cy);

    let s;
    if (fx && fy) {
        const sx = (w0 + fx * dx) / w0;
        const sy = (h0 + fy * dy) / h0;
        s = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy;
    } else if (fx) {
        s = (w0 + fx * dx) / w0;
    } else {
        s = (h0 + fy * dy) / h0;
    }
    const maxS = Math.min(roomX / w0, roomY / h0);
    const minS = Math.max(min / w0, min / h0);
    s = Math.min(Math.max(s, minS), maxS);

    const nw = w0 * s;
    const nh = h0 * s;
    const nx1 = fx > 0 ? x1 : fx < 0 ? x2 - nw : cx - nw / 2;
    const ny1 = fy > 0 ? y1 : fy < 0 ? y2 - nh : cy - nh / 2;
    return [nx1, ny1, nx1 + nw, ny1 + nh].map(Math.round);
}

// A box typed in by hand, made valid: corners in order, inside the canvas, at least `min` a side.
function jbFixBox(bbox, maxW, maxH, min = 16) {
    const axis = (a, b, max) => {
        let lo = jbClampNum(Math.round(Math.min(a, b)), 0, max);
        let hi = jbClampNum(Math.round(Math.max(a, b)), 0, max);
        if (hi - lo < min) {
            hi = Math.min(max, lo + min);
            lo = Math.max(0, hi - min);
        }
        return [lo, hi];
    };
    const [x1, x2] = axis(bbox[0], bbox[2], maxW);
    const [y1, y2] = axis(bbox[1], bbox[3], maxH);
    return [x1, y1, x2, y2];
}

// The nearest size the prompt accepts (a multiple of 16, at least 16), or null for a non-number.
function jbSnap16(v) {
    if (!Number.isFinite(v)) return null;
    return Math.max(16, Math.round(v / 16) * 16);
}

// Box moved by dx, dy, kept whole inside the canvas.
function jbMoveBox(bbox, dx, dy, maxW, maxH) {
    const [x1, y1, x2, y2] = bbox;
    const w = x2 - x1;
    const h = y2 - y1;
    const nx1 = jbClampNum(x1 + dx, 0, Math.max(0, maxW - w));
    const ny1 = jbClampNum(y1 + dy, 0, Math.max(0, maxH - h));
    return [nx1, ny1, nx1 + w, ny1 + h];
}

// Snapping while dragging. `points` are a box's edges and centre on one axis; the result moves
// them by `delta` so the closest one lands on target `at`, or null when none is within `threshold`.
function jbSnapOffset(points, targets, threshold) {
    let best = null;
    for (const p of points) {
        for (const t of targets) {
            const d = t - p;
            if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: t };
        }
    }
    return best;
}

// What a dragged box snaps to: the canvas edges and centre, and the other boxes' edges and centres.
function jbSnapTargets(otherBoxes, maxW, maxH) {
    const x = [0, maxW / 2, maxW];
    const y = [0, maxH / 2, maxH];
    for (const [x1, y1, x2, y2] of otherBoxes) {
        x.push(x1, (x1 + x2) / 2, x2);
        y.push(y1, (y1 + y2) / 2, y2);
    }
    return { x, y };
}

// The layout saved in the browser (so a page refresh keeps it), checked and made valid, or null.
function jbSavedLayout(text) {
    let v;
    try {
        v = JSON.parse(text);
    } catch {
        return null;
    }
    const size = (n) => Number.isInteger(n) && n >= 16 && n % 16 === 0;
    if (!v || typeof v !== "object" || !size(v.width) || !size(v.height)) return null;
    if (!Array.isArray(v.items) || !v.items.length) return null;
    const str = (s) => (typeof s === "string" ? s : "");
    const items = [];
    for (const it of v.items) {
        if (!it || !["object", "character", "text"].includes(it.label)) return null;
        if (!Array.isArray(it.bbox) || it.bbox.length !== 4 || !it.bbox.every(Number.isFinite)) return null;
        items.push({ label: it.label, caption: str(it.caption), text: str(it.text), tags: jbCleanTags(it.tags), palette: jbCleanPalette(it.palette), bbox: jbFixBox(it.bbox, v.width, v.height, 16) }); // tags/palette: fields.js
    }
    const s = v.summary && typeof v.summary === "object" ? v.summary : {};
    const canvas = ["single", "multi_panel", "collage"].includes(s.canvas) ? s.canvas : "single";
    return { width: v.width, height: v.height, summary: { caption: str(s.caption), meta: str(s.meta), extra: str(s.extra), canvas, palette: jbCleanPalette(s.palette) }, items };
}

// CUSTOM (Forge Neo): true when a layout holds no words at all (a fresh canvas, or one just cleared).
// Such a layout is not autosaved, so opening the builder blank never wipes the last session.
function jbBlankLayout(layout) {
    const empty = (s) => typeof s !== "string" || s.trim() === "";
    const s = layout.summary || {};
    const none = (list) => !Array.isArray(list) || list.length === 0; // CUSTOM (Forge Neo): tags / palette count as content
    return empty(s.caption) && empty(s.meta) && empty(s.extra) && none(s.palette) && layout.items.every((it) => empty(it.caption) && empty(it.text) && none(it.tags) && none(it.palette));
}
