# Format

`characters/<name>/character.json` has `pixelScale`, `fps`, `loopDuration`, `palette`, and optional `animation.alternatingSymbols` plus `animation.frameCount`. Frames are numbered `.txt` files in `frames/`; each character is a palette key or `0` for transparent.

Run `npm run validate -- <name>` before `npm run render -- <name>`.
