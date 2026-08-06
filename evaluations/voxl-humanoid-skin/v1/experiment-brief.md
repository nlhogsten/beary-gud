# VOXL humanoid-skin generation evaluation v1

Status: specification only; no provider runs or results exist.

## Decision

This experiment will decide whether a provenance-acceptable generation adapter can create and locally revise open-ended `voxl.humanoid-skin/v1` documents well enough to justify a Phase 6 integration spike. It does not select a provider or authorize permanent inference infrastructure.

The comparison must use the immutable `cases.v1.json` ordering, `rubric.v1.json`, deterministic engine validation, and `attempt-record.schema.v1.json`. Any semantic change after outputs are viewed requires a new evaluation version.

## Candidate admission

No provider or model is selected in this specification. Managed external APIs are the default candidate class; the provider operates its models and accelerators, while VOXL records requests, validates outputs, and stores evidence. A future candidate may enter the experiment only after its adapter boundary, model/version identity, commercial-use terms, model and dataset provenance, data-retention policy, and reference-use permissions are recorded. A candidate with unresolved commercial provenance is ineligible regardless of visual quality.

Native host generation may enter only when it can be invoked and measured through a reproducible provider contract. Local, notebook, rented-GPU, or self-hosted execution is not a Phase 5 requirement and requires separate explicit approval as comparative research. It cannot become product architecture without a new ADR.

All committed cases are project-authored synthetic specifications. No customer content, destination branding, trademarked character, copied artwork, or third-party reference is included. Reference-bearing cases are not executable until their synthetic image assets are deterministically materialized, SHA-256 hashed, license/provenance records are completed, and the case-set lock remains identical for every candidate.

An `artifact-replay` attempt is allowed only to test the evaluator, deterministic engine validation, evidence hashing, and immutable storage. It performs no model inference, records `provider: null`, `networkUsed: false`, and `paidCall: false`, receives no quality or preference scores, and is excluded from every provider quality, latency, failure-rate, and cost aggregate.

## Fixed inputs

- Engine: `voxl-humanoid-skin`
- Document kind: `voxl.humanoid-skin/v1`
- Export profiles: `wide-arm-64` and `slim-arm-64`
- Case set: `voxl-humanoid-skin-cases/v1`, 36 ordered cases
- Rubric: `voxl-humanoid-skin-rubric/v1`
- Candidate count per create case: 4 normalized candidates
- Candidate count per localized-revision case: 3 normalized candidates
- Seed policy: use the same ordered seed list for every candidate when supported; otherwise record `null` and classify reproducibility as unsupported
- Normalization policy: deterministic decoding, color-mode normalization, and engine-declared validation only; no manual repainting or candidate-specific repair

## Precommitted gates

Hard gates apply to every candidate option:

- Commercial provenance and reference-use review: approved, with no unresolved blocking risk.
- Accepted outputs: 100% pass deterministic engine validation; invalid outputs are never visually promoted as accepted.
- Valid after allowed normalization: at least 90% overall and at least 80% in every required category.
- Valid at first provider output: at least 70% overall.
- Prompt fidelity: median at least 4.0/5 and tenth percentile at least 3.0/5.
- Reference fidelity for reference-bearing cases: median at least 4.0/5.
- UV/geometry consistency: median at least 4.25/5, with no critical face swap, mirror, or profile mismatch in an accepted candidate.
- Front/back and cross-view consistency: median at least 4.0/5.
- Pixel sharpness and boundary correctness: at least 95% of accepted candidates pass automated checks; median visual score at least 4.5/5.
- Localized revision: protected-region changed-texel rate no greater than 0.5% per case and 0% change in explicitly immutable regions; requested-region fidelity median at least 4.0/5.
- Warm latency: median no greater than 45 seconds and p95 no greater than 120 seconds.
- Cold latency: p95 no greater than 300 seconds.
- Peak observable accelerator memory, only for a candidate that exposes it: no greater than 24 GiB for the evaluated configuration. Managed APIs record this field as `null`; hidden provider hardware is not an admission gate.
- Estimated cost: no greater than USD 1.00 per deterministically accepted creation and USD 0.50 per accepted localized revision.

All distributions include every attempt, including provider errors, refusals, invalid files, and timeouts. Automated scoring, AI visual review, and blinded human preference remain separate fields.

## Decision rules

- **Continue to Phase 6 spike:** at least one provenance-approved candidate passes every hard gate and shows non-template diversity across the dense, asymmetric, multi-reference, and difficult-silhouette cases.
- **Fine-tuning investigation:** a provenance-approved candidate passes operational, validation, and cost gates but misses a fidelity or cross-view gate by no more than 0.5 rubric points, with concentrated and diagnosable failures.
- **Change candidate or approach:** provenance fails, deterministic validity is below 90%, a critical geometry defect reaches accepted output, latency/cost exceeds a hard gate by more than 25%, or failures are not localized enough to support a credible fine-tuning hypothesis.
- **Stop the generation path:** no admitted candidate reaches 80% valid-after-normalization or 3.0/5 median prompt fidelity, or provenance-safe approaches cannot meet the core open-ended and localized-preservation requirements.

No provider is promoted from a small aesthetic sample, and no production hosting decision follows from this specification alone.

## Future execution protocol

1. Materialize and hash every synthetic reference and baseline document; freeze a case-set lock.
2. Record admitted candidate provenance before any generation call; evaluate API-accessible candidates first.
3. Invoke each candidate only through a provider adapter using identical ordered inputs.
4. Persist each immutable attempt under `.runs/evaluations/<run-id>/` using the attempt schema.
5. Reject invalid candidates through deterministic engine validation before rendering or preference scoring.
6. Load valid candidates in the real studio and capture comparable atlas plus front, rear, side, top, and bottom views.
7. Score all attempts, publish distributions and failure categories, and identify the smallest next experiment that reduces the decisive uncertainty.

Research runs must not charge product entitlements.

## Known pre-run gaps

- Synthetic image references, baseline documents, and deterministic editable/protected/immutable revision masks have specifications but have not been materialized or hashed.
- The neutral managed-API candidate dossier remains pending because no provider or model has been selected or reviewed.
- The evaluator can catalogue and dry-plan managed-API candidates, but no executable provider adapter, credential loading, network invocation, or paid-call path exists.
- Thresholds are research commitments, not measured performance claims.
