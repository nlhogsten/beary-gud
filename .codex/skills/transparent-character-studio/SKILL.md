---
name: transparent-character-studio
description: Create, revise, import, validate, and export local pixel-character animations as transparent PNG sequences and Premiere-ready ProRes alpha MOV overlays. Use when asked to make a pixel character, evolve an existing character, convert a supported Bash canvas animation, add simple animation behavior, or produce a clean video overlay in this repository.
---

Use the local studio as the source of truth.

1. Inspect `characters/` and read `references/format.md` before altering source.
2. Create a new character folder or explicitly version an existing character; preserve unrelated characters.
3. For legacy Bash, use `npm run import-bash -- <file> <name>`. Never execute the supplied script.
4. Run `npm run validate -- <name>` and fix source errors before rendering.
5. Run `npm run render -- <name>`, then confirm the reported `exports/<name>/` paths exist.
6. Tell the user which alpha MOV to import into Premiere. Prefer the pre-looped `*_loop_30s.mov`.

Keep grids rectangular. Use `0` for transparency. Use frame grids for pose changes and `animation.alternatingSymbols` for deterministic flicker/smoke behavior. Read `references/format.md` for the schema and `references/prompts.md` when translating a creative request.
