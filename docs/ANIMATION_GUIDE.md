# Animation guide

Characters are reusable pixel sprites. A character has grid frames, a palette, and optional deterministic rules. `0` is transparent. All frames must have identical dimensions.

Use frame grids for hand-authored poses. The local editor timeline changes the preview frame; its effects are visual drafting controls. For production renders, represent repeatable motion with source animation rules: alternating cells, palette cycling, particles, trails, blinking, and drift.

Start with a readable base sprite, animate only the cells that need to change, then use a scene/effect layer for motion and atmosphere. Preserve nearest-neighbor scaling to keep the art crisp.
