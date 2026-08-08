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
- A versioned safe render-program schema whose primary operation authors complete surface-local pixel grids with compact palette indexes.
- Sparse `paint-texels` revisions plus optional `fill`, `checker`, `stripes`, and `copy-surface` compression helpers that are never required for generation.
- A compact profile-specific tool description that exposes valid surface names and dimensions without exposing engine source.
- Strict render-program validation, operation/write/size budgets, deterministic execution and hashing, and rejection of unknown code-like operations.
- A provider-independent engine descriptor with validate, render, and export capabilities.

The generation layouts are an offline adapter boundary, not a generator. They prepare an engine document for future managed image APIs and normalize a returned PNG into a candidate document. Run `bun run eval:representations` from the repository root to verify the complete simulated-output round trip without a provider, credentials, network access, billing, or entitlements.

The render program is also an offline adapter boundary, not an LLM. A future managed multimodal provider may emit its JSON, but this package alone validates and executes the bounded operations and stores validated pixels as the authoritative document. Run `bun run eval:render-programs` to prove deterministic creation, all-mapped-texel expressiveness, exact revision preservation, and code-like-operation rejection without a provider, arbitrary code, credentials, network access, billing, or entitlements.

Generative create/revise capabilities remain intentionally unadvertised until a provider and representation pass the complete evaluation gates. Conversational revision, 2D editing, and 3D editing are also not advertised by the engine contract yet.
