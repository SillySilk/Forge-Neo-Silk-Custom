// CUSTOM (Forge Neo): a prompt sent from the builder loads back as it was typed. Run: node tests/test_decompile_js.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
for (const f of ["compile.js", "decompile.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", f), "utf8"), ctx);
const { compilePrompt, decompilePrompt } = ctx;

const layout = {
    width: 1024, height: 768, bbox_coord_space: "abs", bbox_format: "xyxy",
    summary: { canvas: "single", caption: "a park\n(BS) Bart, (red:-1) shirt" },
    items: [{ label: "character", caption: "(BS) waving", bbox: [10, 20, 300, 400] }],
};
// as Send does: the compiled prompt, then Extra, on one line
const sent = (compilePrompt(JSON.stringify(layout)) + "\n<lora:x:1>").replaceAll("\n", " ");
assert.ok(sent.includes(String.raw`\(BS\)`),"brackets are escaped in the prompt itself");
const back = decompilePrompt(sent, 1024, 768);
assert.strictEqual(back.summary.caption, "a park\n(BS) Bart, (red:-1) shirt", "brackets come back as typed");
assert.strictEqual(back.items[0].caption, "(BS) waving");
assert.deepStrictEqual(Array.from(back.items[0].bbox), [10, 20, 300, 400]);
assert.strictEqual(back.extra, "<lora:x:1>");
// sending it again gives the same prompt
const again = { ...layout, summary: { canvas: back.summary.canvas, caption: back.summary.caption }, items: back.items.map((i) => ({ ...i, bbox: Array.from(i.bbox) })) };
assert.strictEqual((compilePrompt(JSON.stringify(again)) + "\n<lora:x:1>").replaceAll("\n", " "), sent, "a second send is identical");

console.log("decompile.js: all assertions passed");
