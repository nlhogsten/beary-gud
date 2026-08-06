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

**Phase 4 — shared studio shell and engine UI modules.** Phases 0–3 are complete. The next slice adds engine selection and loads independent editor modules while preserving the current transparent-character editor.

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

Status: **complete**

- [x] Define the 64x64 RGBA document and versioned sidecar schemas.
- [x] Implement complete, non-overlapping `wide-arm-64` and `slim-arm-64` UV maps.
- [x] Add base and outer-layer handling.
- [x] Import, validate, automatically detect, and byte-exact round-trip both profiles.
- [x] Export checksummed, non-interlaced 8-bit RGBA PNGs without smoothing.
- [x] Render deterministic nearest-neighbor front/back previews.
- [x] Add semantic-region sidecars and valid/invalid fixture cases.
- [x] Reject visible unused-profile pixels with actionable issue codes.
- [x] Register validate, render, and export without a generation provider.

### Exit criteria

- [x] Valid wide and slim fixtures round-trip without pixel changes.
- [x] Invalid fixtures produce actionable validation errors.
- [x] Exported fixtures pass an independent PNG import probe as 64x64 RGBA.
- [x] The engine validates, renders, and exports with no generation provider.

## Phase 4 — shared studio shell and engine UI modules

Status: **not started**

### Work

- [ ] Add engine selection to the shared studio shell.
- [ ] Load format-specific editor modules from the registry.
- [ ] Keep the current transparent-character editor behavior available.
- [ ] Build the VOXL humanoid-skin 2D atlas editor.
- [ ] Integrate a permissively licensed viewer behind `cuboid-humanoid-renderer`.
- [ ] Map 3D face clicks to UV pixels.
- [ ] Synchronize 2D and 3D painting.
- [ ] Add base/outer and body-part visibility controls.
- [ ] Add undo/redo, local versions, compare, import, validate, and export.
- [ ] Keep the complete editor usable locally before accounts exist.

### Exit criteria

- [ ] Users can switch engines without state or schema leakage.
- [ ] Both editor modules load through the shared shell.
- [ ] A humanoid skin can be painted in synchronized 2D/3D views and exported validly.
- [ ] Existing transparent-character drafting still works.

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
| 2026-08-05 | Phase 3 deterministic humanoid-skin core | `npm test`, `npm run lint`, `npm run typecheck:voxl`, `npm run build`, independent PNG `ffprobe`, target-brand scan | 28 tests passed; both profiles round-tripped; 64x64 RGBA import confirmed | `e4f56dc` |

## Next unchecked step

Add shared-shell engine selection and load the current transparent-character editor plus a new humanoid-skin 2D atlas module without sharing their document state.
