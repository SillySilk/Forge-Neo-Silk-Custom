// CUSTOM (Forge Neo): tests for javascript/characters.js. Run: node tests/test_characters_js.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", "characters.js"), "utf8"), ctx);
const { jbCaptionLine, jbCaptionHas, jbAppendCharacter } = ctx;

const c = { abbr: "LS", name: "Lisa Simpson", description: "star hair" };

assert.strictEqual(jbCaptionLine(c), "(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("", c), "(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("   ", c), "(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("a park", c), "a park\n(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("a park\n", c), "a park\n(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("a park\n\n  ", c), "a park\n(LS) Lisa Simpson, star hair");
assert.strictEqual(jbAppendCharacter("(ls) x", c), null);
assert.strictEqual(jbCaptionHas("(LS) x", "LS"), true);
assert.strictEqual(jbCaptionHas("(LS) x", "L"), false);
assert.strictEqual(jbCaptionHas("LS waves", "LS"), false);
assert.strictEqual(jbAppendCharacter("(LS) Lisa", { abbr: "L", name: "Lou", description: "d" }), "(LS) Lisa\n(L) Lou, d");

console.log("characters.js: all assertions passed");
