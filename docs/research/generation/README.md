# VOXL generation research

Status: **offline generation-path gates complete; provider feasibility untested**. This directory records how creative output may be produced. It does not admit a provider or claim that an AI approach works.

## Current hypothesis

Compare **LLM-authored safe render programs** with **template-conditioned managed image generation** for the same fixed geometry first.

The first visual type does not require arbitrary mesh generation. Its geometry, UV map, valid atlas regions, layers, densities, renderer, and export rules are already deterministic. A current managed image model may therefore be able to edit an engine-generated template or a human-readable surface sheet well enough for VOXL to pack, normalize, validate, render, and refine the result.

The three first paths are:

1. **Safe render program:** give a multimodal conversational model the versioned engine tool contract, prompt, references, and rendered feedback; execute its bounded JSON program locally and validate the result.
2. **Upscaled atlas template:** enlarge each logical texel into a model-visible block, edit the exact template, then deterministically reduce it to the engine density.
3. **Canonical surface sheet:** generate clearly ordered, flat body-surface panels, then deterministically pack them into the engine atlas.

All three paths now pass their deterministic offline contracts. The program interpreter exposes every mapped texel through safe local coordinates, reproduces arbitrary fixture pixels exactly, preserves protected revisions, and rejects code-like or over-budget input. Both image representations render reproducibly, normalize simulated outputs into valid documents, preserve protected revision texels exactly, and reject malformed structure actionably. This proves VOXL's execution/conversion machinery, not model quality. The [experiment and build gates](experiment-plan.md) define the remaining provider preflight.

## Why this is first

- It matches the fixed-shape problem without requiring a general 3D system.
- Current mainstream multimodal and image APIs accept text and references, support tool use or conversational editing, and are inexpensive enough for a small controlled preflight.
- Exact dimensions, invalid-region transparency, protected pixels, packing, validation, and export remain deterministic engine responsibilities.
- It keeps providers replaceable and requires no VOXL-owned GPU or model-serving infrastructure.

## How the model learns the VOXL tool

No model is expected to infer VOXL's engine from its name. The provider adapter sends the engine-owned `render-program/v1` contract: legal surfaces and dimensions, five operation schemas, resource limits, coordinate semantics, and a few fixed examples. The model emits only JSON. VOXL validates and executes it, renders the result, and can return visual and validation feedback for a bounded correction turn. This is ordinary in-context tool use, not training.

Fine-tuning is deliberately deferred. It becomes a candidate only if controlled evaluation shows a stable failure pattern that better prompts, examples, tool design, and feedback do not solve—and only after VOXL has enough accepted program/correction pairs to justify it.

## Decision ladder

```text
managed multimodal LLM       managed image models
  -> safe render program       -> atlas/surface templates
             \                 /
              \ measured first /
               v             v
             passing fixed-geometry path
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

No path is presumed to win. The safe render program is open-ended at the pixel level, but a managed model still must prove it can compose those pixels well. The image paths must separately prove they can preserve UV structure and detail after normalization.

## Canonical records

- [Method catalog](method-catalog.md): every approach discussed, its role, risks, and status.
- [Experiment and build gates](experiment-plan.md): the smallest decisive preflight, full evaluation, and ordered Phase 6 construction plan.
- [Fixed evaluation brief](../../../evaluations/voxl-humanoid-skin/v1/experiment-brief.md): immutable 36-case Phase 5 protocol.
- [Product and provider research](../product.md): official source links, commercial constraints, and provider snapshots.
- [ADR 0011](../../architecture/decisions/0011-managed-generation-apis-by-default.md): managed APIs by default; no automatic GPU/self-hosted fallback.
- [Current progress](../../planning/progress.md): checked work and next unfinished gate.

## Authority boundary

Documentation, offline template construction, deterministic normalization, catalog validation, and dry planning do not authorize credentials, network generation, or spend. A provider must pass the recorded provenance gate, an adapter must pass dry-run checks, and the user must explicitly approve the capped paid preflight before any billable call.
