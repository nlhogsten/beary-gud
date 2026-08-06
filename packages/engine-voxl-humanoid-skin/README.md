# `@voxl/engine-voxl-humanoid-skin`

The deterministic core for 64x64 RGBA cuboid-humanoid skins.

It currently provides:

- Target-neutral `wide-arm-64` and `slim-arm-64` profiles.
- Exact base and outer-layer UV face rectangles.
- A versioned in-memory document and JSON sidecar.
- Deterministic validation for dimensions, RGBA length, profile consistency, unused pixels, and base transparency.
- Non-interlaced 8-bit RGBA PNG import and export with checksum validation.
- Automatic arm-profile detection with explicit override support.
- Nearest-neighbor front and back PNG previews.
- A provider-independent engine descriptor with validate, render, and export capabilities.

Generation, conversational revision, 2D editing, and 3D editing are intentionally not advertised yet.
