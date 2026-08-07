# ADR 0011: Use managed generation APIs by default

Status: Accepted

Date: 2026-08-05

## Context

VOXL needs open-ended image generation and revision, but owning the visual engine does not require owning the model runtime. Earlier research listed local notebooks, rented accelerators, self-hosted checkpoints, native host tools, and external APIs as equivalent experiment paths. That made optional model research sound like planned infrastructure.

Current managed image APIs can accept text and reference images, create and edit images, and in some cases accept masks. The unresolved VOXL problem is whether their outputs can be converted into consistently valid, editable engine documents at acceptable quality and cost—not whether VOXL can operate accelerators.

## Decision

- Managed external generation APIs are VOXL's default server-side generation path.
- VOXL application workers orchestrate jobs, call provider APIs, normalize and deterministically validate results, render evidence, and persist immutable versions. They are ordinary CPU application workers; they do not serve model weights and do not require GPUs.
- A compatible chat host may supply native generation when its tool contract, user authorization, evidence capture, and output quality satisfy the same provider and engine boundaries.
- Local, notebook, rented-GPU, or self-hosted checkpoint execution is outside the accepted product architecture. It may be proposed only as a separately approved research comparison.
- Production self-hosting requires a new ADR, measured evidence that managed APIs cannot meet product requirements, an operations/security/cost review, and explicit user approval. It is never an automatic fallback.
- Provider API usage may be metered through VOXL entitlements. A user's chat subscription is not assumed to include VOXL's server-side API calls.

## Consequences

- The current AWS target contains no GPU instances, accelerator endpoints, model weights, or model-serving services.
- Phase 5 evaluates API-accessible candidates first. A downloadable checkpoint without managed API access is a research lead, not an admissible default candidate.
- Evaluation records measure observable provider latency, errors, acceptance rate, output quality, retention/provenance risk, and API cost. Accelerator memory remains `null` when a managed API does not expose it.
- Provider adapters remain replaceable and do not become engine schemas.
- A provider outage degrades generation jobs, not deterministic editing, validation, rendering, saved versions, or export.

## Superseded interpretation

ADR 0001 still defines the engine/provider boundary, and ADR 0009 still defines localhost development and the AWS application runtime. Any wording in those records or older research that treated self-hosting as an ordinary fallback is superseded by this decision.
