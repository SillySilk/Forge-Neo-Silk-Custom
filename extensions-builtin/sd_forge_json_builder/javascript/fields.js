// CUSTOM (Forge Neo): MOSS-Image "tags" and "palette" lists for the JSON Builder (used by main.js and decompile.js)

const JB_MAX_TAGS = 16;
const JB_MAX_COLOURS = 8;

// a list with blanks and case-insensitive repeats removed, cut at max
function jbMergeList(a, b, max) {
    const out = [];
    const seen = new Set();
    for (const v of [...a, ...b]) {
        const key = v.toLowerCase();
        if (seen.has(key) || out.length >= max) continue;
        seen.add(key);
        out.push(v);
    }
    return out;
}

function jbCleanTags(list) {
    if (!Array.isArray(list)) return [];
    const tags = list.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean);
    return jbMergeList(tags, [], JB_MAX_TAGS);
}

// typed text: tags are separated by commas or new lines
function jbParseTags(text) {
    return jbCleanTags(String(text || "").split(/[,\n]/));
}

// only #rrggbb, written in capitals
function jbCleanPalette(list) {
    if (!Array.isArray(list)) return [];
    const colours = list.filter((c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c.trim())).map((c) => c.trim().toUpperCase());
    return jbMergeList(colours, [], JB_MAX_COLOURS);
}
