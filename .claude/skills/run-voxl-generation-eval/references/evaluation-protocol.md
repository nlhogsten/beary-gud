# VOXL generation evaluation protocol

## Define the decision first

Write a short experiment brief containing:

- Engine and capability under evaluation.
- Provider candidates and provenance/license status.
- Fixed case-set version.
- Quality, latency, memory, and cost thresholds.
- Protected-region threshold for localized revision.
- Stop, continue, fine-tune, and reject conditions.

Do not change the rubric after viewing provider results without versioning the evaluation.

## Case-set coverage

Use at least 30 licensed or synthetic cases for the Phase 5 checkpoint. Include:

- Text-only concepts with simple and dense surface detail.
- One and multiple references with explicit reference roles.
- Front/back or multi-view consistency.
- Asymmetric details that reveal mirroring errors.
- Fine patterns, hard edges, transparency, and low-contrast regions.
- Wide-arm and slim-arm neutral geometry profiles where applicable.
- Localized revisions with protected and editable masks.
- Intentionally difficult or unsupported requests to measure honest failure.

Keep the same input ordering and normalization across providers.

## Attempt record

Store local experiment evidence under `.runs/evaluations/<run-id>/` unless the implemented evaluator defines a stricter compatible layout. Each attempt must record:

- Case ID and input/reference hashes.
- Engine ID/version, schema version, and export profile.
- Provider adapter, provider/model version, seed, and parameters.
- Start/end time, latency, peak memory when observable, and estimated/actual cost.
- Raw provider output retained according to license and privacy policy.
- Normalization or repair operations.
- Candidate document/output hash.
- Deterministic validation result and rejection reason.
- Comparable 2D and 3D evidence for accepted candidates.
- Automated rubric values, human preference, and reviewer notes.

Redact credentials and sensitive provider payloads. Do not commit private customer references or raw prompts.

## Comparison metrics

Report distributions and failure categories, not only averages:

- Valid-at-first-output and valid-after-normalization rates.
- Text and reference fidelity.
- Surface complexity and small-detail retention.
- Cross-view and geometry consistency.
- Transparency and boundary correctness.
- Localized-edit protected-region difference.
- Candidate diversity and reproducibility.
- Median and tail latency.
- Cost per attempt and cost per accepted candidate.
- Provider errors, safety refusals, and provenance/legal risk.

Keep automated scoring, AI visual review, and human preference as separate fields. None substitutes for deterministic format validation.

## Decision report

The final report must identify:

- Best supported option and why.
- Cases where another provider wins.
- Invalid-output and operational failure modes.
- Expected cost per accepted asset/revision.
- Evidence quality and known blind spots.
- Continue, fine-tune, change-provider, or stop recommendation.
- The smallest next experiment that would reduce the decisive uncertainty.

