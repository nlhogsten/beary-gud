# VOXL build progress

This is the day-to-day source of truth for implementation progress. [The implementation plan](VOXL_IMPLEMENTATION_PLAN.md) explains the full work and why it is ordered this way; this tracker records what is actually complete.

## How to update this tracker

- `[x]` means the implementation exists, its relevant verification passed, and evidence is recorded below.
- `[ ]` means the work is not complete. Partially written or unverified work stays unchecked.
- Mark exit criteria separately from work items. A phase is complete only when every exit criterion is checked.
- Add the validating command and commit to the verification log when completing a meaningful slice.
- Never mark a future phase complete based only on documentation, scaffolding, or a mocked happy path.
- Preserve target-neutral names in every phase.

## Current focus

**Phase 3 — deterministic `voxl-humanoid-skin` core.** Phases 0–2 are complete. The next slice defines the target-neutral 64x64 document, export profiles, and deterministic validation before adding generation or 3D rendering.

## Phase 0 — baseline and decisions

Status: **complete**

### Work

- [x] Inventory and checkpoint the pre-VOXL working tree.
- [x] Record and run the current test, validation, render, and local-editor checks.
- [x] Document the engine/provider boundary, engine-specific schemas, immutable versions, asynchronous jobs, generative-first direction, and target-neutral naming in the research and implementation docs.
- [x] Set the minimum Node version to 22.13.0.
- [x] Convert the major architecture decisions into short, numbered decision records.
- [x] Decide and document the trigger for introducing npm workspaces.
- [x] Document the branch and review policy for migrations of current character code.

### Exit criteria

- [x] Existing tests pass from documented commands.
- [x] Rainbow Bear validates and renders.
- [x] The current local editor starts and serves its assets.
- [x] Numbered architecture decision records are accepted and indexed.

## Phase 1 — engine contracts and registry

Status: **complete**

### Work

- [x] Define engine descriptors and create, revise, validation, render, export, and job types.
- [x] Implement the in-process `EngineRegistry`.
- [x] Add engine discovery and capability listing.
- [x] Add an engine-neutral contract-test harness with two incompatible fake documents.
- [x] Define serializable public errors that omit prompts, internal paths, and provider payloads.
- [x] Enforce agreement between advertised capabilities and implemented handlers.
- [x] Return immutable normalized descriptors.

### Exit criteria

- [x] Two fake engines register and execute independently.
- [x] Duplicate IDs and unsupported capabilities are rejected.
- [x] Contract tests prove the platform assumes neither animation nor cuboid-humanoid document fields.

## Phase 2 — preserve and extract `transparent-character`

Status: **complete**

### Work

- [x] Move load, validate, raster, render, and export behavior behind the engine contract.
- [x] Preserve the safe Bash importer and prove supported source is parsed without execution.
- [x] Preserve `characters/<name>/`, `exports/<name>/`, and the existing npm commands.
- [x] Register animation-specific capabilities and output formats.
- [x] Discover and invoke the real engine through the engine-neutral CLI and registry harness.
- [x] Add stable geometry, transparency, and palette-pixel assertions for Rainbow Bear.
- [x] Keep browser editor state unchanged until the Phase 4 module integration has stronger editor tests.

### Exit criteria

- [x] Current commands remain functional.
- [x] Existing tests pass without behavior regression.
- [x] Existing character sources require no migration.
- [x] `transparent-character` is discovered and invoked through the shared registry.
- [x] Premiere-ready alpha exports remain valid and probe as ProRes with a `yuva444p` alpha pixel format.

## Phase 3 — deterministic `voxl-humanoid-skin` core

Status: **not started**

- [ ] Define the 64x64 RGBA document and sidecar schema.
- [ ] Implement `wide-arm-64` and `slim-arm-64` UV maps.
- [ ] Add base and outer-layer handling.
- [ ] Import, validate, and round-trip valid profile documents.
- [ ] Export byte-correct profile-valid PNGs.
- [ ] Render deterministic front/back previews.
- [ ] Add semantic-mask sidecars and valid/invalid fixtures.
- [ ] Pass all Phase 3 exit criteria from the implementation plan.

## Phase 4 — shared studio shell and engine UI modules

Status: **not started**

- [ ] Complete all Phase 4 work and exit criteria from the implementation plan.

## Phase 5 — generative-provider research spike

Status: **not started**

- [ ] Complete all Phase 5 work and exit criteria from the implementation plan.

## Phase 6 — generative creation and localized revision

Status: **not started**

- [ ] Complete all Phase 6 work and exit criteria from the implementation plan.

## Phase 7 — durable projects, files, and jobs

Status: **not started**

- [ ] Complete all Phase 7 work and exit criteria from the implementation plan.

## Phase 8 — web product and private library

Status: **not started**

- [ ] Complete all Phase 8 work and exit criteria from the implementation plan.

## Phase 9 — remote MCP service

Status: **not started**

- [ ] Complete all Phase 9 work and exit criteria from the implementation plan.

## Phase 10 — Codex and Claude plugins

Status: **not started**

- [ ] Complete all Phase 10 work and exit criteria from the implementation plan.

## Phase 11 — entitlements and web billing

Status: **not started**

- [ ] Complete all Phase 11 work and exit criteria from the implementation plan.

## Phase 12 — security, privacy, safety, and legal readiness

Status: **not started**

- [ ] Complete all Phase 12 work and exit criteria from the implementation plan.

## Phase 13 — private beta and product validation

Status: **not started**

- [ ] Complete all Phase 13 work and exit criteria from the implementation plan.

## Phase 14 — production inference and operational hardening

Status: **not started**

- [ ] Complete all Phase 14 work and exit criteria from the implementation plan.

## Phase 15 — public launch and plugin submission

Status: **not started**

- [ ] Complete all Phase 15 work and exit criteria from the implementation plan.

## Phase 16 — new-engine authoring kit

Status: **not started**

- [ ] Complete all Phase 16 work and exit criteria from the implementation plan.

## Verification log

| Date | Scope | Evidence | Result | Commit |
| --- | --- | --- | --- | --- |
| 2026-08-05 | Documentation and studio checkpoint | `npm test`, `npm run lint`, `npm run build`, target-brand scan | 5 tests passed; lint/build/scan passed | `c32c119` |
| 2026-08-05 | Phase 1 engine contracts | `npm test`, `npm run lint`, `npm run typecheck:engine-contracts`, `npm run build`, target-brand scan | 12 tests passed; lint/types/build/scan passed | `13e2451` |
| 2026-08-05 | Phase 0 decisions and Phase 2 extraction | `npm test`, `npm run lint`, `npm run typecheck:voxl`, `npm run build`, `npm run validate -- bear`, `npm run render -- bear`, `ffprobe`, target-brand scan | 20 tests passed; legacy and registry paths passed; ProRes alpha confirmed | `8bab1ef` |

## Next unchecked step

Define the `voxl.humanoid-skin/v1` document and sidecar schemas, then implement deterministic `wide-arm-64` and `slim-arm-64` profile validation with valid and invalid fixtures.
