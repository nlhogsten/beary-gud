# `@voxl/engine-voxl-humanoid-skin`

The deterministic core for density-aware RGBA cuboid-humanoid skins.

It currently provides:

- Target-neutral `wide-arm-64`, `slim-arm-64`, `wide-arm-128`, and `slim-arm-128` profiles.
- Engine-owned model-unit geometry that remains stable when texture density changes.
- Exact base and outer-layer UV face rectangles.
- Deterministic selection masks for exact UV faces, region-local rectangular crops, unions, and unused atlas pixels.
- A versioned in-memory document and JSON sidecar.
- Deterministic validation for dimensions, RGBA length, profile consistency, unused pixels, and base transparency.
- Non-interlaced 8-bit RGBA PNG import and export with checksum validation.
- Automatic arm-and-density profile detection with explicit override support.
- Nearest-neighbor front and back PNG previews.
- A provider-independent engine descriptor with validate, render, and export capabilities.

Generation, conversational revision, 2D editing, and 3D editing are intentionally not advertised yet.
