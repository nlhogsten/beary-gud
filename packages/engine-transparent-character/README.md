# `@voxl/engine-transparent-character`

The registered VOXL engine for the repository's original Bash-derived transparent pixel-character workflow.

It owns loading, deterministic validation, rasterization, PNG encoding, contact sheets, ProRes alpha rendering, safe legacy import, and the engine descriptor. [`scripts/studio.mjs`](../../scripts/studio.mjs) remains the compatibility CLI for the existing npm commands.

The package preserves:

- `characters/<name>/character.json` and rectangular text frames.
- `0` as the transparent symbol.
- Palette-symbol validation.
- Parsing supported legacy Bash without executing it.
- `exports/<name>/` PNG, contact-sheet, cycle MOV, and loop MOV paths.
