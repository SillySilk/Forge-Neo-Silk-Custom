// CUSTOM (Forge Neo): tests for javascript/fields.js (tags and palette). Run: node tests/test_fields_js.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "javascript", "fields.js"), "utf8"), ctx);
const { jbParseTags, jbCleanTags, jbCleanPalette, jbMergeList } = ctx;
const eq = (a, b, msg) => assert.deepStrictEqual(Array.from(a), b, msg);

eq(jbParseTags(" old man, , Old Man,hat\nscarf "), ["old man", "hat", "scarf"], "split, trim, drop empties, dedupe ignoring case");
eq(jbParseTags(""), [], "empty text");

eq(jbCleanTags(["a", " a ", 3, "", "B"]), ["a", "B"], "non-strings and blanks dropped");
assert.strictEqual(jbCleanTags(Array.from({ length: 20 }, (_, i) => "t" + i)).length, 16, "at most 16 tags");
eq(jbCleanTags(null), [], "not a list");

eq(jbCleanPalette(["#1b9aaa", "red", "#abc", "#12345G", "#1B9AAA", "#ffffff"]), ["#1B9AAA", "#FFFFFF"], "only #rrggbb, uppercased, deduped");
assert.strictEqual(jbCleanPalette(Array.from({ length: 10 }, (_, i) => "#00000" + i)).length, 8, "at most 8 colours");
eq(jbCleanPalette(null), [], "not a list");

eq(jbMergeList(["a", "B"], ["b", "c"], 16), ["a", "B", "c"], "keeps order, skips case-insensitive duplicates");
eq(jbMergeList(["a", "b"], ["c"], 2), ["a", "b"], "respects the cap");

console.log("fields.js: all assertions passed");
