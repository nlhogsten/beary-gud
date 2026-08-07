# VOXL generation research

Status: **offline representation gate complete; provider feasibility untested**. This directory records how creative output may be produced. It does not admit a provider or claim that an AI approach works.

## Current hypothesis

Test **template-conditioned managed image generation for fixed geometry** first.

The first visual type does not require arbitrary mesh generation. Its geometry, UV map, valid atlas regions, layers, densities, renderer, and export rules are already deterministic. A current managed image model may therefore be able to edit an engine-generated template or a human-readable surface sheet well enough for VOXL to pack, normalize, validate, render, and refine the result.

The two first representations are:

1. **Upscaled atlas template:** enlarge each logical texel into a model-visible block, edit the exact template, then deterministically reduce it to the engine density.
2. **Canonical surface sheet:** generate clearly ordered, flat body-surface panels, then deterministically pack them into the engine atlas.

Both representations now pass their deterministic offline contracts using simulated provider outputs: they render reproducibly, normalize into valid documents, preserve protected revision texels exactly, and reject malformed structure actionably. This proves VOXL's conversion machinery, not image-model quality. The [experiment and build gates](experiment-plan.md) define the remaining provider preflight.

## Why this is first

- It matches the fixed-shape problem without requiring a general 3D system.
- Current mainstream image APIs accept text and multiple references, support conversational editing, and are inexpensive enough for a small controlled preflight.
- Exact dimensions, invalid-region transparency, protected pixels, packing, validation, and export remain deterministic engine responsibilities.
- It keeps providers replaceable and requires no VOXL-owned GPU or model-serving infrastructure.

## Role of the conversational model

The LLM or multimodal conversational model is an optional orchestrator, not the assumed pixel generator. It may normalize a conversation into a visual brief, assign reference roles, select an engine representation, interpret revision intent, and explain validation failures. The initial feasibility test may call an image model directly so that conversational reasoning is not confused with visual-generation quality.

## Decision ladder

```text
mainstream managed image models
  on static atlas/surface templates
                |
                | only if the fixed preflight fails
                v
managed mesh-conditioned retexturing
  with original-UV preservation
                |
                | only if that also fails
                v
provider-side adaptation or fine-tuning
                |
                | only with measured justification,
                | a new ADR, and explicit approval
                v
specialized or self-hosted model research
```

An LLM-generated parameter plan, procedural constructor, or per-texel tool loop remains available as a baseline or deterministic editing aid. None is presumed to be the open-ended creative core.

## Canonical records

- [Method catalog](method-catalog.md): every approach discussed, its role, risks, and status.
- [Experiment and build gates](experiment-plan.md): the smallest decisive preflight, full evaluation, and ordered Phase 6 construction plan.
- [Fixed evaluation brief](../../../evaluations/voxl-humanoid-skin/v1/experiment-brief.md): immutable 36-case Phase 5 protocol.
- [Product and provider research](../product.md): official source links, commercial constraints, and provider snapshots.
- [ADR 0011](../../architecture/decisions/0011-managed-generation-apis-by-default.md): managed APIs by default; no automatic GPU/self-hosted fallback.
- [Current progress](../../planning/progress.md): checked work and next unfinished gate.

## Authority boundary

Documentation, offline template construction, deterministic normalization, catalog validation, and dry planning do not authorize credentials, network generation, or spend. A provider must pass the recorded provenance gate, an adapter must pass dry-run checks, and the user must explicitly approve the capped paid preflight before any billable call.
