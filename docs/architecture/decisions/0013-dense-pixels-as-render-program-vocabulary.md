# ADR 0013: Use dense pixels as the render-program creative vocabulary

Status: Accepted

Date: 2026-08-07

## Context

VOXL users will usually provide abstract natural-language prompts, reference images, or images without text. A render program centered on named traits or predefined motifs would turn that open-ended request into a constrained character customizer. A sparse list containing one RGBA object per texel is complete but unnecessarily verbose for whole-character authorship. Operations named after patterns can also misleadingly imply that the model is expected to assemble a character from a fixed catalog.

## Decision

- The managed multimodal model receives raw user inputs plus the selected profile's engine-owned surface and schema contract.
- The render-program path uses complete, surface-local, palette-indexed pixel grids as its primary creative output. Grid cells define pixels, not semantic traits.
- Sparse per-texel writes are primarily for localized revisions and corrections.
- Fill, copy, and small repeated-pattern operations are optional compression helpers. A model may ignore them, and they do not define the set of visuals VOXL can create.
- The fixed Phase 5 preflight must measure whether a model can translate abstract prompts and references into coherent dense grids across surfaces; offline expressiveness alone is not quality evidence.
- Validated document pixels remain authoritative. The render program remains attempt provenance and never becomes executable source code.

## Consequences

Adding a new visual concept does not require a new trait, pattern, or engine operation. The compact grid representation reduces output size when colors repeat while retaining arbitrary RGBA through the palette. Provider prompts and examples should demonstrate dense authorship and visual-feedback correction, not encourage whole characters assembled from checker, stripe, or fill commands. Managed image-generation paths remain comparison candidates under ADR 0011.
