# `@voxl/engine-transparent-character`

The registered VOXL engine for the repository's original Bash-derived transparent pixel-character workflow.

It owns loading, deterministic validation, rasterization, PNG encoding, contact sheets, ProRes alpha rendering, safe legacy import, and the engine descriptor. [`apps/character-cli/src/studio.mjs`](../../apps/character-cli/src/studio.mjs) supplies the local CLI behind the root Bun aliases.

The package preserves:

- `characters/<name>/character.json` and rectangular text frames.
- `0` as the transparent symbol.
- Palette-symbol validation.
- Parsing supported legacy Bash without executing it.
- `exports/<name>/` PNG, contact-sheet, cycle MOV, and loop MOV paths.
