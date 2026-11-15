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

// Box moved by dx, dy, kept whole inside the canvas.
function jbMoveBox(bbox, dx, dy, maxW, maxH) {
    const [x1, y1, x2, y2] = bbox;
    const w = x2 - x1;
    const h = y2 - y1;
    const nx1 = jbClampNum(x1 + dx, 0, Math.max(0, maxW - w));
    const ny1 = jbClampNum(y1 + dy, 0, Math.max(0, maxH - h));
    return [nx1, ny1, nx1 + w, ny1 + h];
}
