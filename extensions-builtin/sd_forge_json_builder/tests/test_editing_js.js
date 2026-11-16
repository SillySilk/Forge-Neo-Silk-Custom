// CUSTOM (Forge Neo): tests for javascript/editing.js. Run: node tests/test_editing_js.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
// a top-level class is a global binding in the browser but not a context property here, so expose it
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", "fields.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", "editing.js"), "utf8") + "\nglobalThis.JbHistory = JbHistory;", ctx);
const { JbHistory, jbResizeBox, jbMoveBox, jbFixBox, jbSnap16, jbSnapOffset, jbSnapTargets, jbSavedLayout, jbBlankLayout } = ctx;
const eq = (a, b, msg) => assert.deepStrictEqual(Array.from(a), b, msg);

// ----- history -----
{
    const hst = new JbHistory(50);
    hst.reset("A");
    assert.strictEqual(hst.canUndo(), false);
    hst.commit("B", null, 0);
    hst.commit("C", null, 10);
    assert.strictEqual(hst.undo(), "B");
    assert.strictEqual(hst.undo(), "A");
    assert.strictEqual(hst.undo(), null, "nothing before the first state");
    assert.strictEqual(hst.redo(), "B");
    assert.strictEqual(hst.redo(), "C");
    assert.strictEqual(hst.redo(), null);
}
{
    // an unchanged state is not a new step
    const hst = new JbHistory(50);
    hst.reset("A");
    hst.commit("A", null, 0);
    assert.strictEqual(hst.canUndo(), false);
}
{
    // typing in one field is one step; a different field or a pause starts a new one
    const hst = new JbHistory(50);
    hst.reset("A");
    hst.commit("A1", "caption:1", 0);
    hst.commit("A12", "caption:1", 300);
    hst.commit("A123", "caption:1", 600);
    assert.strictEqual(hst.undo(), "A");
    hst.redo();
    hst.commit("X", "caption:2", 700);
    hst.commit("Y", "caption:2", 5000);
    assert.strictEqual(hst.undo(), "X");
    assert.strictEqual(hst.undo(), "A123");
}
{
    // a new change after an undo drops the redo branch
    const hst = new JbHistory(50);
    hst.reset("A");
    hst.commit("B", null, 0);
    hst.undo();
    hst.commit("C", null, 10);
    assert.strictEqual(hst.canRedo(), false);
    assert.strictEqual(hst.undo(), "A");
}
{
    // the oldest steps fall off past the limit
    const hst = new JbHistory(3);
    hst.reset("0");
    for (const s of ["1", "2", "3", "4"]) hst.commit(s, null, 0);
    assert.strictEqual(hst.undo(), "3");
    assert.strictEqual(hst.undo(), "2");
    assert.strictEqual(hst.undo(), "1");
    assert.strictEqual(hst.undo(), null);
}

// ----- resize -----
const W = 1000, H = 800, MIN = 16;
const box = [100, 100, 300, 200]; // 200 x 100
eq(jbResizeBox(box, "se", 50, 20, { maxW: W, maxH: H, min: MIN }), [100, 100, 350, 220], "corner moves both edges");
eq(jbResizeBox(box, "e", 50, 99, { maxW: W, maxH: H, min: MIN }), [100, 100, 350, 200], "side handle ignores the other axis");
eq(jbResizeBox(box, "n", 7, -40, { maxW: W, maxH: H, min: MIN }), [100, 60, 300, 200], "top edge");
eq(jbResizeBox(box, "nw", -20, -10, { maxW: W, maxH: H, min: MIN }), [80, 90, 300, 200], "top-left corner, opposite corner fixed");
eq(jbResizeBox(box, "w", 500, 0, { maxW: W, maxH: H, min: MIN }), [284, 100, 300, 200], "never smaller than min");
eq(jbResizeBox(box, "e", 5000, 0, { maxW: W, maxH: H, min: MIN }), [100, 100, 1000, 200], "never past the canvas");
eq(jbResizeBox(box, "nw", -500, -500, { maxW: W, maxH: H, min: MIN }), [0, 0, 300, 200], "never before 0");

// Shift keeps the shape (2:1 here), anchored at the opposite corner / edge
eq(jbResizeBox(box, "se", 100, 0, { maxW: W, maxH: H, min: MIN, keepAspect: true }), [100, 100, 400, 250], "corner keeps 2:1");
eq(jbResizeBox(box, "nw", -100, 0, { maxW: W, maxH: H, min: MIN, keepAspect: true }), [0, 50, 300, 200], "nw keeps 2:1");
eq(jbResizeBox(box, "s", 0, 50, { maxW: W, maxH: H, min: MIN, keepAspect: true }), [50, 100, 350, 250], "bottom side keeps 2:1, centred across");
eq(jbResizeBox(box, "se", 5000, 5000, { maxW: W, maxH: H, min: MIN, keepAspect: true }), [100, 100, 1000, 550], "kept shape still stops at the canvas");
{
    const r = jbResizeBox(box, "se", -1000, -1000, { maxW: W, maxH: H, min: MIN, keepAspect: true });
    assert.ok(r[2] - r[0] >= MIN && r[3] - r[1] >= MIN, "kept shape still respects min");
    assert.strictEqual((r[2] - r[0]) / (r[3] - r[1]), 2, "and keeps 2:1 at the minimum");
}

// ----- move (arrow keys) -----
eq(jbMoveBox(box, 8, 0, W, H), [108, 100, 308, 200]);
eq(jbMoveBox(box, -500, 0, W, H), [0, 100, 200, 200], "stops at the left edge, size kept");
eq(jbMoveBox(box, 0, 5000, W, H), [100, 700, 300, 800], "stops at the bottom edge, size kept");

// ----- typed box numbers (list inputs) -----
eq(jbFixBox([300, 200, 100, 50], W, H, MIN), [100, 50, 300, 200], "swapped corners are put in order");
eq(jbFixBox([-20, 100, 2000, 900], W, H, MIN), [0, 100, 1000, 800], "kept inside the canvas");
eq(jbFixBox([500, 100, 505, 300], W, H, MIN), [500, 100, 516, 300], "too thin grows to the minimum");
eq(jbFixBox([995, 100, 999, 300], W, H, MIN), [984, 100, 1000, 300], "at the edge it grows inward");
eq(jbFixBox([100.4, 50.6, 300, 200], W, H, MIN), [100, 51, 300, 200], "whole pixels");

// ----- resolution must be a multiple of 16 for the prompt -----
assert.strictEqual(jbSnap16(1000), 1008);
assert.strictEqual(jbSnap16(1080), 1088);
assert.strictEqual(jbSnap16(1024), 1024);
assert.strictEqual(jbSnap16(3), 16, "never below 16");
assert.strictEqual(jbSnap16(NaN), null, "not a number");

// ----- snapping while dragging -----
{
    // the nearest of the box's points (edges / centre) to any target, within the threshold
    const r = jbSnapOffset([100, 150, 200], [0, 196, 500], 8);
    assert.deepStrictEqual({ ...r }, { delta: -4, at: 196 }, "right edge 200 snaps to 196");
    assert.strictEqual(jbSnapOffset([100, 150, 200], [0, 300, 500], 8), null, "nothing close enough");
    const c = jbSnapOffset([100, 150, 200], [153, 205], 8);
    assert.deepStrictEqual({ ...c }, { delta: 3, at: 153 }, "the closest one wins");
}
{
    // targets: canvas edges and centre, plus every other box's edges and centre
    const t = jbSnapTargets([[10, 20, 110, 220]], 1000, 800);
    eq(t.x, [0, 500, 1000, 10, 60, 110]);
    eq(t.y, [0, 400, 800, 20, 120, 220]);
}

// ----- autosaved layout (read back after a page refresh) -----
{
    const good = { width: 1024, height: 768, summary: { caption: "a", meta: "m", extra: "x", canvas: "single" },
        items: [{ label: "text", caption: "c", text: "t", bbox: [1, 2, 30, 40] }] };
    const r = jbSavedLayout(JSON.stringify(good));
    assert.strictEqual(r.width, 1024);
    assert.strictEqual(r.items[0].text, "t");
    eq(r.items[0].bbox, [1, 2, 30, 40]);
    assert.strictEqual(jbSavedLayout(null), null, "nothing saved");
    assert.strictEqual(jbSavedLayout("{not json"), null, "damaged");
    assert.strictEqual(jbSavedLayout(JSON.stringify({ ...good, width: 1000 })), null, "size not a multiple of 16");
    assert.strictEqual(jbSavedLayout(JSON.stringify({ ...good, items: [] })), null, "no boxes");
    assert.strictEqual(jbSavedLayout(JSON.stringify({ ...good, items: [{ label: "x", caption: "", bbox: [0, 0, 1, 1] }] })), null, "bad label");
    assert.strictEqual(jbSavedLayout(JSON.stringify({ ...good, summary: { caption: "a" } })).summary.canvas, "single", "missing fields get defaults");
    const off = jbSavedLayout(JSON.stringify({ ...good, items: [{ label: "object", caption: "", bbox: [900, 0, 2000, 900] }] }));
    eq(off.items[0].bbox, [900, 0, 1024, 768], "a box past the edge is pulled inside");
}

// ----- a blank canvas is not saved over the last session -----
{
    const blank = { summary: { caption: "", meta: " ", extra: "" }, items: [{ caption: "", text: "" }] };
    assert.strictEqual(jbBlankLayout(blank), true, "fresh canvas");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "", text: "", tags: [], palette: [] }] }), true, "empty lists are still blank");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "", text: "", tags: ["hat"] }] }), false, "a box tag");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "", text: "", palette: ["#112233"] }] }), false, "a box colour");
    assert.strictEqual(jbBlankLayout({ ...blank, summary: { ...blank.summary, palette: ["#112233"] } }), false, "a summary colour");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "", text: "" }, { caption: " ", text: "" }] }), true, "empty boxes only");
    assert.strictEqual(jbBlankLayout({ ...blank, summary: { ...blank.summary, caption: "a park" } }), false, "summary caption");
    assert.strictEqual(jbBlankLayout({ ...blank, summary: { ...blank.summary, extra: "<lora:x:1>" } }), false, "extra");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "a dog", text: "" }] }), false, "a box caption");
    assert.strictEqual(jbBlankLayout({ ...blank, items: [{ caption: "", text: "SALE" }] }), false, "a box text");
}

// ----- tags and palette survive a page refresh -----
{
    const saved = { width: 512, height: 512, summary: { caption: "a", meta: "", extra: "", canvas: "single", palette: ["#112233", "blue"] },
        items: [{ label: "object", caption: "c", text: "", tags: ["hat", " hat "], palette: ["#abcdef"], bbox: [0, 0, 64, 64] }] };
    const r = jbSavedLayout(JSON.stringify(saved));
    eq(r.summary.palette, ["#112233"], "bad colour dropped");
    eq(r.items[0].tags, ["hat"], "tags cleaned");
    eq(r.items[0].palette, ["#ABCDEF"], "palette cleaned");
    const old = jbSavedLayout(JSON.stringify({ width: 512, height: 512, summary: { caption: "a" }, items: [{ label: "object", caption: "c", bbox: [0, 0, 64, 64] }] }));
    eq(old.summary.palette, [], "an old session has no palette");
    eq(old.items[0].tags, [], "an old session has no tags");
    eq(old.items[0].palette, [], "an old session has no box palette");
}

console.log("editing.js: all assertions passed");
