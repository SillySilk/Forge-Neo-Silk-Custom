# Thing-o-Matic Neo — Forge reskin

A drop-in speakeasy reskin for **Forge-Neo-Silk** (sd-webui-forge-classic).
Ink-black rooms, a single gold bulb, ember accents, brand fonts, subtle
grain + spotlight texture, a branded header banner, a "pull the lever"
placeholder in the empty output, plus a matching tab title and favicon.
Accents run on a hand-tuned deep **old-gold** palette, and selected radio
buttons glow as lit **ember dots** (gold core → burnt-red edge).

**No layout changes. No Python edits. Fully reversible.**

---

## Files in this package

```
user.css                          -> Forge ROOT (next to webui.bat / style.css)
favicon.svg                       -> Forge ROOT (optional; the .js already embeds the icon)
javascript/thing-o-matic-neo.js   -> Forge's  javascript/  folder (sets tab title + favicon)
```

The folder layout above **mirrors the Forge root**, so the simplest install is:
extract this package's contents directly into your Forge root and let the
`javascript/` folder merge.

---

## Install (for Claude Code, run from the Forge root)

Copy the two files into place (favicon is optional):

```bash
# from the Forge root (the folder containing webui.bat and style.css)
cp /path/to/thing-o-matic-neo-theme/user.css ./user.css
cp /path/to/thing-o-matic-neo-theme/favicon.svg ./favicon.svg          # optional
mkdir -p javascript
cp /path/to/thing-o-matic-neo-theme/javascript/thing-o-matic-neo.js ./javascript/thing-o-matic-neo.js
```

Windows PowerShell equivalent:

```powershell
Copy-Item .\thing-o-matic-neo-theme\user.css .\user.css -Force
Copy-Item .\thing-o-matic-neo-theme\favicon.svg .\favicon.svg -Force        # optional
New-Item -ItemType Directory -Force .\javascript | Out-Null
Copy-Item .\thing-o-matic-neo-theme\javascript\thing-o-matic-neo.js .\javascript\thing-o-matic-neo.js -Force
```

Forge auto-loads `user.css` (after `style.css`) and every `.js` in `javascript/`.
Nothing else to configure — no changes to `webui.settings.bat` are needed.

## Activate

Hard-refresh the browser tab: **Ctrl+F5** (no need to restart the Forge process
for CSS/JS-only changes; use in-app **Reload UI** if the refresh isn't enough).

## Updating (after editing the template)

The look lives entirely in `user.css`. Tune it in the package
(`thing-o-matic-neo-theme/user.css`), then re-copy that one file into the Forge
root and hard-refresh — no need to touch the `.js` or favicon:

```powershell
Copy-Item .\thing-o-matic-neo-theme\user.css .\user.css -Force   # then Ctrl+F5
```

## Uninstall

Delete `user.css`, `favicon.svg`, and `javascript/thing-o-matic-neo.js`, then
hard-refresh. You're back to stock.

---

*a neo-based custom Anima build — heretics only.*
