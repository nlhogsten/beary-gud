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
- Engine-owned `direct-atlas-v1` and `surface-sheet-v1` generation layouts on a fixed `1024x1024` canvas.
- Deterministic block-median reduction, surface packing, reserved transparency-key handling, and invalid-region restoration.
- Exact revision compositing that permits changes only inside the editable mask and copies protected texels from the baseline byte-for-byte.
- Actionable rejection of malformed candidate dimensions, damaged surface-sheet structure, and invalid or overlapping masks.
- A provider-independent engine descriptor with validate, render, and export capabilities.

The generation layouts are an offline adapter boundary, not a generator. They prepare an engine document for future managed image APIs and normalize a returned PNG into a candidate document. Run `bun run eval:representations` from the repository root to verify the complete simulated-output round trip without a provider, credentials, network access, billing, or entitlements.

Generative create/revise capabilities remain intentionally unadvertised until a provider and representation pass the complete evaluation gates. Conversational revision, 2D editing, and 3D editing are also not advertised by the engine contract yet.
