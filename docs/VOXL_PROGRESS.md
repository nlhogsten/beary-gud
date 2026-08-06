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

**Phase 5 — generative-provider research spike.** Phases 0–4 are complete. The studio, synchronized 2D/3D editor, profile-valid export, and named local versions are verified. The fixed evaluation specification, offline harness, managed-API candidate catalog, and no-call dry-run planner exist. Current work is materializing the synthetic reference/baseline assets and completing provenance review for an API-accessible candidate. VOXL does not plan to rent or manage GPUs.

## Platform and repository foundation

These checkpoints record the organizational/sidebar work that makes later product work independently maintainable. They are implementation progress, but they do not by themselves complete a user-facing product phase.

- [x] Record localhost-only development and remove ChatGPT Sites from the intended workflow.
- [x] Record the standalone React/Vite client, shared Bun/Hono API/MCP application layer, and OpenTofu-managed AWS target.
- [x] Record managed external generation APIs as the default and exclude GPU/model-serving infrastructure unless a future ADR and explicit approval authorize an exception.
- [x] Record that optional in-chat UI uses the same account, projects, versions, database, object storage, and APIs as the standalone studio.
- [x] Add a resource-free OpenTofu bootstrap that does not require invented AWS identifiers.
- [x] Adopt Bun workspaces and move runtime-specific configuration into `apps/studio`, `apps/server`, `apps/character-cli`, and `infra/db`.
- [x] Add Hono health/engine-discovery routes, an initial Drizzle schema and migration, isolated local Supabase configuration, and host/Docker management commands.
- [x] Keep the repository root limited to shared orchestration while each app, engine package, database package, and infrastructure target owns its runtime configuration.
- [x] Verify the host and Docker localhost workflows, the first four-table migration, and a production Bun/Hono image running as a non-root user.
- [x] Upgrade exposed high-severity toolchain dependencies, pin the remaining Drizzle Kit loader chain to the audited esbuild release, and reach a zero-vulnerability `bun audit`.
- [x] Define four target-neutral localhost browser journeys for studio smoke, transparent editing/export, synchronized humanoid editing, and humanoid profile/file boundaries.
- [x] Define an independent review rubric for runtime integrity, target-neutral language, pixel rendering, cuboid orientation, layers, profiles, 2D/3D synchronization, accessibility, responsiveness, and downloads.
- [x] Complete actual Playwright runs of the journey set and retain their `.runs/<run-id>/` evidence; the authoritative replacements pass every required step with no runtime errors.
- [x] Complete independent rubric reviews of the applicable browser evidence, including full-page mobile containment and side/rear/top/bottom 3D views.
- [x] Complete and validate the repository-local agent skills that route studio verification, new-engine work, and generation evaluation.
- [ ] Connect authenticated server application services to the database; the current schema and local runtime are foundation only.
- [ ] Select AWS accounts, region, DNS, certificates, remote state, environment isolation, and recovery policy.
- [ ] Provision or deploy any AWS infrastructure.

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

Status: **complete**

### Work

- [x] Migrate the verified static/iframe frontend to one React 19 + TypeScript + Vite application without storage or export regressions.
- [x] Make standard Vite the canonical localhost development path, with a separate Bun/Hono server and container definition.
- [x] Add a typed React engine-UI registry and port the humanoid 2D editor to canvas-based React with compatible draft persistence.
- [x] Add engine selection to the shared studio shell.
- [x] Load format-specific editor modules from the React engine-UI registry.
- [x] Keep the current transparent-character editor behavior available.
- [x] Build the VOXL humanoid-skin 2D atlas editor.
- [x] Integrate a permissively licensed viewer behind `cuboid-humanoid-renderer`.
- [x] Map 3D face clicks to UV pixels.
- [x] Synchronize 2D and 3D painting through the same draft buffer, tools, visibility state, and undo history.
- [x] Add base/outer and body-part visibility controls.
- [x] Add skin undo/redo, local draft persistence, PNG import, deterministic validation, and valid PNG export.
- [x] Add repository-owned Playwright journey definitions and a review rubric for the remaining browser and visual checks.
- [x] Execute the required Playwright journeys and independently review their captured screenshots, runtime observations, and downloads.
- [x] Add immutable named local versions, engine-owned snapshot adapters, restore, and side-by-side comparison.
- [x] Keep the complete editor usable locally before accounts exist.

### Exit criteria

- [x] Users can switch engines without state or schema leakage.
- [x] Both editor modules load through the shared shell.
- [x] A humanoid skin can be painted in synchronized 2D/3D views and exported validly.
- [x] Existing transparent-character drafting still works.

## Phase 5 — generative-provider research spike

Status: **in progress**

### Research foundation

- [x] Freeze a 36-case synthetic/licensed-safe evaluation set before viewing provider output.
- [x] Cover text-only, single/multiple reference, synthetic photo/drawing, remix, asymmetry, cross-surface pattern, outer-layer, both export profiles, localized revision, preserve constraints, and honest unsupported requests.
- [x] Define a weighted rubric, hard gates, failure taxonomy, case schema, rubric schema, and immutable attempt schema.
- [x] Add engine-neutral generation-provider contracts and registry behavior without installing a production provider.
- [x] Add an offline evaluation runner that validates the specification, reports readiness blockers, replays existing PNGs through deterministic engine validation, and stores checksummed immutable evidence.
- [x] Keep artifact replay explicitly separate from provider/model results, network activity, paid calls, scores, latency, failure-rate, and cost aggregates.
- [x] Recheck the preview-to-atlas paper, specialized checkpoint, base-model requirements, and current hosted-access boundary against primary sources.
- [x] Record the API-first/no-VOXL-GPU architecture decision and research current hosted generation/editing candidates from official sources without selecting one.
- [x] Add schemas and a metadata-only catalog for managed-API candidates with explicit provenance decisions, provider-managed compute, secret rejection, integrity hashes, and separate executable-adapter counts.
- [x] Add deterministic `eval:plan` output that binds the complete case, rubric, provider descriptor/configuration, provenance dossier, revision policy, and materialized-input hashes while proving it reads no credentials, invokes no adapter, uses no network, makes no paid call, and writes no provider attempt evidence.

### Remaining experiment gate

- [ ] Materialize and SHA-256 lock 25 synthetic reference assets used by 18 cases.
- [ ] Materialize and SHA-256 lock four revision baselines plus editable/protected masks.
- [ ] Complete model, dataset, commercial-use, reference-use, and retention provenance review for at least one candidate.
- [ ] Implement and admit a real API-accessible `preview-to-atlas` provider adapter only after provenance review.
- [ ] Run the fixed experiment through managed-provider APIs and reproducible host-native compute where available, without charging product entitlements.
- [ ] Record provider latency, failure/refusal rate, validation/acceptance rate, quality distributions, retention/provenance risk, and actual/estimated API cost. Record accelerator memory only if exposed.
- [ ] Decide from measured evidence whether to continue a managed provider, investigate provider-side adaptation/fine-tuning, change API approach, or stop.
- [ ] Complete all Phase 5 exit criteria from the implementation plan; no provider is selected or admitted, and no GPU rental or self-hosting decision is authorized.

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

## Phase 14 — production provider operations and hardening

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
| 2026-08-05 | Phase 4 shared shell and 2D atlas slice | `npm test`, `npm run lint`, `npm run typecheck:voxl`, `npm run build`, `npm run validate -- bear`, `npm run render -- bear`, target-brand scan | 34 tests passed; both editor modules and separate storage boundaries passed; browser/package UV parity passed | `33d26c1` |
| 2026-08-05 | React/Vite consolidation slice and Seek pilot | `npm test`, `npm run lint`, scoped React `tsc`, `npm run typecheck:voxl`, `npx vite build`, target-brand scan; Seek setup/status audit and 24 focused source tests | 36 VOXL tests passed; native React skin module compiled; Seek CLI refreshed and remaining pilot findings recorded | `c7813d0` |
| 2026-08-05 | Local-only Vite/Express runtime and AWS architecture | `npm run check`, Vite and Express localhost smoke tests, `npm audit --omit=dev`, `tofu fmt -check`, `tofu validate`, `npm run validate -- bear`, `npm run render -- bear`, target-brand scan | 38 tests passed; lint/types/build passed; 0 production vulnerabilities; OpenTofu bootstrap valid; no AWS resources provisioned | `e24ee3f` |
| 2026-08-05 | Bun workspace, Hono server, and local database foundation | `bun run check`, host and Docker localhost smoke tests, production-image boot, `bun run db:generate`, `bun run db:migrate`, four-table PostgreSQL probe, `bun audit`, `tofu fmt -check`, `tofu validate`, `bun run validate -- bear`, `bun run render -- bear`, target-brand scan | 39 tests passed; lint/types/build passed; local and container routes healthy; migration applied; high-severity advisories resolved; one moderate development-only Drizzle Kit transitive advisory remains | `0d77be9` |
| 2026-08-05 | Native editor consolidation and synchronized 3D slice | `bun run check`, motion state/history parity tests, raycast UV mapping test, frozen install, `bun run db:generate`, `bun audit`, Docker localhost studio/API smoke tests, `tofu fmt -check`, `tofu validate`, `bun run validate -- bear`, `bun run render -- bear`, target-brand scan | 43 tests passed; iframe/static split removed; both editors lazy-load natively; 2D/3D paint state is shared; 0 vulnerabilities; real-browser WebGL orientation QA remains the next gate because no browser backend was available | `6a04a68` |
| 2026-08-05 | Browser quality system and Phase 4 interaction sign-off | `bun run check`, four Playwright journeys, independent rubric reviews, official skill validation, `bun audit`, `tofu fmt -check`, `tofu validate`, `bun run validate -- bear`, `bun run render -- bear`, target-brand scan | 48 repository tests plus 9 runner tests passed; 84/84 final browser steps passed with 0 runtime errors; responsive, import/export, transparent-layer, synchronized editing, and directional rotation reviews passed; 0 vulnerabilities | `fc67261` |
| 2026-08-05 | Phase 4 local versions and Phase 5 evaluation foundation | `bun run check`, `local-version-compare` desktop/mobile Playwright journey, independent rubric review, evidence audit, `bun run eval:check`, `bun run eval:adapters`, `bun audit`, `bun run db:generate`, `tofu fmt -check`, `tofu validate`, localhost studio/API probes, target-brand scan | 80 automated tests passed; 74/74 browser steps passed with 0 runtime errors; immutable compare/restore and Skin/Motion isolation passed; 36-case evaluation specification validates; 0 admitted providers, 25 reference assets and 4 revision baselines remain explicit blockers; 0 vulnerabilities | `1ef2d8a` |

## Next unchecked step

Materialize and SHA-256 lock the synthetic Phase 5 reference assets, revision baselines, and masks, then complete provenance review for the first API-accessible candidate.
