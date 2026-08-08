# ADR 0005: Make humanoid-skin creation generative-first

Status: Accepted; provider interpretation refined by ADR 0013

Date: 2026-08-05

## Context

A fixed trait customizer cannot express the open-ended patterns, asymmetry, reference combinations, and localized revisions required by the product vision.

## Decision

`voxl-humanoid-skin` accepts raw multimodal inputs and uses image generation as its primary creative path. Structured controls and semantic masks improve precision but do not define the creative vocabulary. Procedural construction remains a deterministic fixture and fallback.

## Consequences

The engine must evaluate real, API-accessible preview-to-atlas generation before a provider is integrated. Deterministic validation and repair remain mandatory around every generative output. ADR 0011 keeps GPU and model-serving infrastructure outside the accepted architecture.

## Refined interpretation

ADR 0013 preserves the generative-first and open-ended decision while removing the assumption that an image-producing model must be the sole primary path. Phase 5 compares managed image generation with a managed multimodal LLM authoring dense surface-local pixel grids. Neither path is selected until measured evaluation passes.
