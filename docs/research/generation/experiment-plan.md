# Current generation experiment and build gates

Status: **offline Stage 1 implemented for all three paths; provider execution not authorized**.

This plan answers two different questions in order:

1. Can a current managed multimodal LLM author useful fixed-geometry textures through a safe render program and bounded visual-feedback loop?
2. Can current mainstream managed image models produce better candidates from static visual templates?
3. If either approach works, what is the smallest production system VOXL must build around it?

The experiment must answer the first question before Phase 6 implements the second.

## Decision under test

Continue a managed generation path only if a safe render program, upscaled atlas template, or canonical surface sheet produces valid, recognizable, editable candidates across simple, dense, asymmetric, reference-driven, outer-layer, and localized-revision cases at the precommitted quality and cost floor.

If all three paths fail, use the failure evidence to improve the bounded program contract or test managed mesh-conditioned retexturing next. Do not jump directly to fine-tuning, a custom model, or self-hosted inference.

## Fixed feasibility preflight

The preflight reuses eight already frozen Phase 5 cases; it does not create a new aesthetic sample after seeing outputs:

| Case | Purpose |
| --- | --- |
| `v1-001` | text-only, hard edges |
| `v1-003` | outer-layer transparency |
| `v1-005` | dense cross-surface pattern |
| `v1-007` | one synthetic photo reference |
| `v1-013` | multiple references with distinct roles |
| `v1-017` | front/rear reconciliation and wraparound detail |
| `v1-027` | localized color revision with protected details |
| `v1-030` | slim profile, transparent outer-layer revision |

Evaluate admitted candidates only on paths their documented interfaces actually support:

- `render-program-v1` for a managed multimodal conversational model with structured tool output and image inputs
- `direct-atlas-v1`
- `surface-sheet-v1`

For each image path, request one output per case. For the render-program path, allow at most three model turns per case: an initial program and up to two corrections using deterministic validation plus engine-rendered views. The prompt, ordered references, initial document, masks, output density, and scoring rubric remain identical across compatible paths. The combined preflight retains the existing **USD 5 total hard cap**; allocation by candidate/path must be frozen in the dry plan before calls. This is a feasibility screen, not a provider-quality conclusion. A path that passes proceeds to the complete immutable 36-case evaluation and its required candidate counts.

## Generation-path contracts

### `render-program-v1`

1. Supply the selected profile's compact engine-owned contract, not engine source: program kind/version, valid surfaces and local dimensions, dense-grid/sparse-patch schemas, optional compression helpers, coordinate semantics, and budgets.
2. Supply the unchanged case prompt, authorized ordered references, optional baseline/masks, and a small fixed example set.
3. Ask the model to author complete palette-indexed pixel grids for the surfaces it is creating. Use sparse texel writes for localized corrections. Treat fills, copies, and tiny repeated patterns only as optional compression—not as the prompt vocabulary or expected whole-character construction method.
4. Require structured JSON output matching `voxl.humanoid-skin.render-program/v1`; never execute model-authored shell, JavaScript, Python, templates, filesystem actions, network calls, or dynamic expressions.
5. Validate the program before execution, including exact grid dimensions and palette indexes; enforce program/operation/texel-write budgets and execute operations deterministically in array order.
6. Construct and validate the candidate document, render the standard views, and—within the turn limit—return only sanitized validation issues and those renders for correction.
7. For revisions, composite only editable texels and restore protected, immutable, and all other non-editable pixels byte-for-byte from the baseline.
8. Persist accepted pixels as the authoritative version and retain the program hash/program as reproducible attempt provenance; a later edit does not depend on replaying the program.

### `direct-atlas-v1`

1. Start from the engine's valid `64x64` blank or existing atlas.
2. Expand every logical texel to a fixed block on a model-supported canvas without interpolation.
3. Overlay an engine-owned guide that distinguishes mapped faces, outer layer, and invalid regions without destination branding.
4. Supply prompt and authorized synthetic references in their fixed order.
5. Decode the provider output, restore the expected canvas geometry, and reduce each block deterministically.
6. Force invalid regions to the engine-required transparency and never infer new geometry.

### `surface-sheet-v1`

1. Render an engine-owned sheet of ordered flat surface panels at a fixed scale.
2. Preserve panel bounds, face orientation, layer identity, and logical resolution as machine-readable metadata outside the image.
3. Supply the same prompt and references used by `direct-atlas-v1`.
4. Crop each expected panel deterministically, reduce it to logical texels, and pack it through the engine's UV map.
5. Reject missing, perspective-distorted, swapped, or unparseable panels rather than repairing them manually.

## Deterministic acceptance pipeline

Every output follows the same steps:

1. Decode and hash the raw provider bytes.
2. Check dimensions, media type, and configured representation.
3. Validate and execute only the declared safe render-program operations, or normalize only through the declared image-representation operations.
4. For revisions, composite generated pixels only inside the editable mask; copy protected and immutable pixels byte-for-byte from the baseline.
5. Force invalid atlas regions to the profile-required value.
6. Construct an engine document and run deterministic validation.
7. Render atlas, front, rear, sides, top, and bottom in the real renderer.
8. Record automated results separately from implementing-agent review and human review.
9. Store immutable attempt evidence, including failures.

No candidate-specific manual repainting, face swapping, cleanup, or prompt revision is allowed during the comparison.

## Preflight thresholds

A path may advance to the full evaluation only when:

- Every accepted result passes deterministic engine validation after only the declared normalization.
- At least six of eight cases are judged usable without manual rescue.
- Neither accepted dense/wraparound case contains a critical face swap, mirror, or front/rear contradiction.
- Both revision cases have `0%` changed texels in immutable regions and no more than the full experiment's protected-region threshold; deterministic compositing should make this exact.
- Prompt fidelity and reference fidelity each have a median of at least `3.5/5` for applicable accepted cases.
- Pixel sharpness and face-boundary correctness pass for at least `90%` of accepted candidates.
- The render-program path uses no more than three model turns per case and executes no arbitrary code; reaching either the turn or resource budget stops that attempt.
- Observed output cost remains within a **USD 5 hard cap for the combined complete preflight**, including retries; reaching the cap stops execution.
- No provider retention, provenance, or commercial-use gate is bypassed.

Passing preflight authorizes only the full research evaluation, not Phase 6 or production selection.

## Pre-call authority gates

All boxes must be checked in `planning/progress.md` before a network generation call:

- [x] The safe render-program specification, validator, bounded interpreter, and feedback-ready tool contract are implemented and tested offline.
- [x] The two image-representation specifications and normalizers are implemented and tested offline.
- [ ] The chosen provider/model/configuration has completed the required provenance admission.
- [ ] The adapter is registered and its dry plan binds the case, representation, model, configuration, reference hashes, masks, and spending ceiling.
- [ ] Only committed project-authored synthetic inputs are in the request set.
- [ ] Credentials are available through the approved external runtime path and are absent from manifests, logs, plans, and evidence.
- [ ] The user has explicitly authorized the provider, credentials, network access, and USD 5 preflight cap.
- [ ] Attempt storage is immutable and records actual usage and cost.

## Ordered implementation sequence

The following sequence is the build plan. A later stage does not start until the previous stage's evidence passes.

### Stage 0 — documentation and decision freeze

- Maintain the method catalog, current hypothesis, representations, thresholds, authority requirements, stop conditions, and provider evidence.
- Align the architecture, implementation plan, evaluation brief, and progress tracker.

**Exit:** repository documentation names one current experiment without claiming one selected provider or production method.

### Stage 1 — offline generation-path harness

- Add the engine-owned safe render-program schema, compact model-facing contract, dense palette-indexed surface grids, sparse corrections, optional compression helpers, validator, bounded interpreter, and deterministic provenance hash.
- Add engine-owned generation-template and surface-sheet renderers.
- Add exact packing, block reduction, palette/alpha policy, invalid-region restoration, and protected-mask compositing.
- Create deterministic fixtures that simulate provider outputs.
- Prove no network, credentials, provider adapter, or billing path is used.

**Exit:** fixture programs and simulated image outputs deterministically become valid engine documents or actionable rejections.

Implemented evidence: `bun run eval:representations` exercises both representations across the fixed wide/slim `64` evaluation profiles. It reports four exact creation round trips, four protected revision checks, four actionable malformed-output rejections, and explicit zero provider/network/credential/paid-call/entitlement use. This is conversion evidence only; neither representation has passed the AI-quality preflight.

Implemented evidence: `bun run eval:render-programs` exercises the safe program across the same profiles. It reports two complete tool-contract checks, two deterministic creation checks, two all-mapped-texel addressability checks, two protected revision checks, and two code-like-operation rejections, with zero provider/network/credential/paid-call/entitlement/arbitrary-code use. This is interpreter expressiveness and safety evidence only; no LLM has demonstrated visual authorship yet.

### Stage 2 — provider-neutral planning and adapter boundary

- Extend provider requests only as necessary to declare path identity, bounded feedback-turn policy, and public controls; do not leak provider payloads into engine documents.
- Implement provenance-admitted managed adapters only for the candidates needed by the frozen comparison: a multimodal structured-output adapter for `render-program-v1` and an image adapter for the static image paths.
- Add timeouts, sanitized errors, usage capture, and explicit network/spend authorization.
- Keep execution disabled by default and prove dry planning remains non-billable.

**Exit:** the full preflight can be planned and hashed without reading credentials or making calls.

### Stage 3 — capped feasibility preflight

- Execute the eight cases on the three compatible paths only after every authority gate passes.
- Capture raw outputs, normalized candidates, validation, views, latency, failure category, and actual cost.
- Stop automatically at the spending ceiling.

**Exit:** a versioned report says advance one path, revise the safe program contract from measured failures, test mesh-conditioned retexturing, or stop.

### Stage 4 — complete Phase 5 evaluation

- Run the immutable 36-case protocol with required candidate counts for methods that passed preflight.
- Compare distributions rather than best samples.
- Complete independent visual review and the full provenance, latency, acceptance, preservation, and cost decision.

**Exit:** Phase 5 identifies a method/provider to continue, a narrow adaptation hypothesis, another managed approach to test, or a stop decision.

### Stage 5 — Phase 6 creation capability

- Connect the accepted generation path and adapter to engine create operations.
- Generate multiple candidates through asynchronous idempotent research/product jobs.
- Validate before acceptance and create immutable versions only for accepted candidates.
- Add Studio prompt/reference submission, progress, candidate comparison, rejection explanations, and manual refinement.

**Exit:** one complex multimodal request creates an accepted, editable document without routine manual rescue.

### Stage 6 — Phase 6 localized revision

- Convert a user's semantic or painted selection into an engine mask.
- Generate only the requested patch or candidate revision.
- Composite protected regions deterministically, validate, and append an immutable child version.
- Measure requested-region fidelity and protected-region preservation.

**Exit:** the fixed revision gates pass for both geometry profiles and transparent outer-layer cases.

### Stage 7 — Phase 7 durability and service integration

- Move projects, files, versions, attempts, and jobs behind authorized application services.
- Add durable object storage, database records, idempotency, cancellation, retry, and recovery.
- Route web and future MCP clients through the same services.

**Exit:** a restart or retry cannot lose an accepted version, duplicate a charge, or cross an ownership boundary.

## Explicitly deferred

- Custom model training or VOXL-hosted inference.
- GPU infrastructure.
- Provider fine-tuning before a measured concentrated quality gap exists.
- Billing entitlements before research usage and acceptance costs are measured.
- Public plugin submission before the standalone service is complete.
- A second target geometry until the first method passes its engine-specific evaluation.
