# Thing-o-Matic Neo — Forge reskin

A drop-in speakeasy reskin for **Forge-Neo-Silk** (sd-webui-forge-classic).
Ink-black rooms, a single gold bulb, ember accents, brand fonts, subtle
grain + spotlight texture, a branded header banner, a "pull the lever"
placeholder in the empty output, plus a matching tab title and favicon.
Accents run on a hand-tuned deep **old-gold** palette, and selected radio
buttons glow as lit **ember dots** (gold core → burnt-red edge).

**No layout changes. No Python edits. Fully reversible.**

---

## Where the theme lives

The theme is **active in this repo** and consists of exactly three files at
their live locations (there is no separate "package" copy — these ARE the
source of truth; the old duplicated `thing-o-matic-neo-theme/` folder was
removed 2026-07-02):

```
user.css                          Forge root (loaded after style.css)
favicon.svg                       Forge root (optional; the .js already embeds the icon)
javascript/thing-o-matic-neo.js   sets tab title + favicon (all .js in javascript/ auto-load)
```

## Installing into a different Forge

Copy those three files from this repo into the other Forge's root (keeping
`thing-o-matic-neo.js` inside its `javascript/` folder). Forge auto-loads
`user.css` and every `.js` in `javascript/` — nothing else to configure.

## Editing / activating changes

The look lives entirely in `user.css`. Edit it in place, then hard-refresh the
browser tab (**Ctrl+F5**) — no Forge restart needed for CSS/JS-only changes
(use in-app **Reload UI** if the refresh isn't enough).

## Uninstall

Delete `user.css`, `favicon.svg`, and `javascript/thing-o-matic-neo.js`, then
hard-refresh. You're back to stock.

---

*a neo-based custom Anima build — heretics only.*
