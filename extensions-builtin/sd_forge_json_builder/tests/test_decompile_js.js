// CUSTOM (Forge Neo): a prompt sent from the builder loads back as it was typed. Run: node tests/test_decompile_js.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
for (const f of ["fields.js", "compile.js", "decompile.js"]) vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", f), "utf8"), ctx);
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
const again = { ...layout, summary: { canvas: back.summary.canvas, caption: back.summary.caption }, items: back.items.map(({ tags, palette, ...i }) => ({ ...i, bbox: Array.from(i.bbox) })) }; // empty lists are left out, as main.js buildJson does
assert.strictEqual((compilePrompt(JSON.stringify(again)) + "\n<lora:x:1>").replaceAll("\n", " "), sent, "a second send is identical");

// tags and palette go out in the prompt and come back on load
{
    const rich = {
        width: 512, height: 512, bbox_coord_space: "abs", bbox_format: "xyxy",
        summary: { canvas: "single", caption: "a harbour", palette: ["#112233"] },
        items: [
            { label: "object", caption: "a boat", tags: ["boat", "wooden"], palette: ["#445566"], bbox: [0, 0, 128, 128] },
            { label: "text", caption: "sign", text: "OPEN", tags: ["sign"], bbox: [200, 200, 300, 260] },
        ],
    };
    const back = decompilePrompt(compilePrompt(JSON.stringify(rich)), 512, 512);
    assert.deepStrictEqual(Array.from(back.summary.palette), ["#112233"]);
    assert.deepStrictEqual(Array.from(back.items[0].tags), ["boat", "wooden"]);
    assert.deepStrictEqual(Array.from(back.items[0].palette), ["#445566"]);
    assert.deepStrictEqual(Array.from(back.items[1].tags), ["sign"]);
    assert.deepStrictEqual(Array.from(back.items[1].palette), [], "no palette given");
    const old = decompilePrompt(sent, 1024, 768);
    assert.deepStrictEqual(Array.from(old.summary.palette), [], "an old prompt has no palette");
    assert.deepStrictEqual(Array.from(old.items[0].tags), [], "an old prompt has no tags");
}

console.log("decompile.js: all assertions passed");
