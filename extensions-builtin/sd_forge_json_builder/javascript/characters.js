// CUSTOM (Forge Neo): caption text for the JSON Builder's Characters section (used by main.js)

function jbCaptionLine(c) {
    return `(${c.abbr}) ${c.name}, ${c.description}`;
}

function jbCaptionHas(caption, abbr) {
    return caption.toLowerCase().includes(`(${abbr.toLowerCase()})`);
}

// the caption with the character's line added on a new line, or null if it is already there
function jbAppendCharacter(caption, c) {
    if (jbCaptionHas(caption, c.abbr)) return null;
    const head = caption.trimEnd();
    return head ? `${head}\n${jbCaptionLine(c)}` : jbCaptionLine(c);
}
