# JSON Builder: working notes

This folder is part of a **public** repo. Before anything here is committed, pushed,
screenshotted or written up, check it for personal material.

## Public vs personal: always check

The owner uses this builder for personal prompts and keeps a personal character roster.
None of that belongs in public. On every change, check:

- **Screenshots and GIFs:** the Characters file dropdown must show `examples.jbcast`, and the
  editor must show an example character. Captions, Summary, Meta and Extra must hold neutral
  sample text written for the shot, never a prompt that was already on the page. Look at the
  finished image before saving it. An open dropdown lists every personal file name, so keep
  dropdowns closed in shots.
- **Example data:** `characters/examples.jbcast` holds made-up, neutral characters only (marked
  `"example": true`). Never copy a personal character into it.
- **Commits:** `git diff --cached --stat` before committing. A personal `.jbcast`, a saved
  layout, an exported prompt JSON or a test image must never be staged. Every `.jbcast` except
  `examples.jbcast` is gitignored; keep it that way.
- **Tests and docs:** sample prompts, character names and descriptions in tests, README,
  CHANGELOG and commit messages are generic and made up.
- **Upstream PRs and forum posts:** same rules. They are public too.

If something personal has already gone public, stop and tell the owner. Don't quietly rewrite history.

## Where things are

The full feature notes (layout, editing, characters, LoRA picker, tests) live in the repo's
root `CLAUDE.md` under "JSON Builder follows txt2img resolution". Read them before changing code here.
