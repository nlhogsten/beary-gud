# VOXL implementation plan

Status: active start-to-finish delivery plan. Phases 0–3 were completed on August 5, 2026: decisions are recorded, the registry and original transparent-character runtime are verified, and the provider-independent humanoid-skin core supports both neutral profiles, PNG round-tripping, deterministic previews, and validation. Phase 4 is next. A phase is complete only when its exit criteria and verification evidence are checked in the progress tracker.

Read [the plain-language VOXL glossary](VOXL_GLOSSARY.md) for unfamiliar terms and [VOXL product research and architecture](VOXL_PRODUCT_RESEARCH.md) for research evidence, source links, product constraints, and the rationale for this plan.

Use [the VOXL build progress tracker](VOXL_PROGRESS.md) for checkboxes, current focus, verification evidence, and the next unfinished step. This implementation plan remains the detailed specification; the progress tracker is the status source of truth.

## Objective

Build VOXL as a componentized, generative-first asset platform that:

- Preserves the current Bash-derived transparent-character workflow as the `transparent-character` engine.
- Adds an independent `voxl-humanoid-skin` engine for open-ended multimodal creation, localized revision, synchronized 2D/3D editing, validation, and `wide-arm-64`/`slim-arm-64` PNG export.
- Lets Codex, ChatGPT, Claude, the web studio, and future clients operate the same engines through stable contracts.
- Allows each artifact engine to choose or replace generation providers without changing its document format or user-facing workflow.
- Supports additional asset types without forcing them into a cuboid-humanoid or transparent-animation schema.

## Mandatory target-neutral naming

All components and references must be named for a VOXL visual artifact, geometry, dimension, or capability—not an external application, game, destination platform, publisher, or model brand.

| Concern | Required neutral identity |
| --- | --- |
| Artifact engine | `voxl-humanoid-skin` |
| Document kind | `voxl.humanoid-skin/v1` |
| Geometry/export profiles | `wide-arm-64`, `slim-arm-64` |
| Renderer adapter | `cuboid-humanoid-renderer` |
| Generation provider | `preview-to-atlas` |
| Package | `engine-voxl-humanoid-skin` |

The rule covers code, packages, tool schemas, MCP methods, database values, prompts, fixtures, logs, analytics, UI, plugin metadata, docs, and public copy. Destination compatibility is implemented and tested behind neutral export-profile adapters. Exact destination-specific instructions, trademarks, and source links remain in restricted legal/compliance records outside the product namespace.

## Definition of the architecture

### Artifact engine

An artifact engine owns one kind of creative document and its lifecycle:

- Document schema and migrations.
- Supported inputs and output formats.
- Creation and revision semantics.
- Validation.
- Rendering and preview.
- Editor integration.
- Export.
- Engine-specific evaluation fixtures.

Initial engines:

| Engine ID | Purpose | Primary source | Primary exports |
| --- | --- | --- | --- |
| `transparent-character` | Existing palette-grid pixel animations descended from the Bash workflow | `character.json` plus frame text files | PNG sequence, APNG/sprite sheet where supported, ProRes alpha MOV |
| `voxl-humanoid-skin` | Open-ended multimodal character skins mapped to `wide-arm-64`/`slim-arm-64` UV geometry | 64x64 RGBA texture plus semantic/version metadata | Profile-valid 64x64 PNG and rendered previews |

### Generation provider

A generation provider is a replaceable compute implementation used by an engine:

- Native host capabilities available inside Codex or another client.
- Hosted image APIs.
- Self-hosted checkpoints such as a preview-to-atlas model.
- Deterministic procedural generation for tests and fallback.
- Future fine-tuned or visual-format-specialized models.

Provider code must not own the durable asset schema. An engine should be able to replace a provider without invalidating saved projects.

### Shared platform

The shared platform owns concerns that should not be rebuilt per engine:

- Users and organizations.
- Projects and assets.
- File uploads and downloads.
- Immutable versions and provenance.
- Generation/revision jobs.
- Provider selection and cost records.
- Authentication and authorization.
- Entitlements and billing ledger.
- MCP transport and OAuth.
- Observability, rate limiting, support, and deletion.

### UI module

Each engine registers an editor/viewer module with the shared studio shell. The shell owns project navigation, file selection, chat, job status, history, and account controls. The engine module owns format-specific controls.

The transparent-character module can expose frames, palettes, effects, animation preview, and alpha-video export. The VOXL humanoid-skin module can expose the UV atlas, `wide-arm-64`/`slim-arm-64` geometry, base/overlay layers, 3D painting, semantic masks, and profile-valid export.

## Proposed repository shape

Introduce this structure incrementally. Do not move working files until tests cover the compatibility path.

```text
apps/
  studio/                         # web shell and engine UI modules
  mcp/                            # remote MCP server and optional UI resources
  worker/                         # HTTP/API entry point if kept separate

packages/
  engine-contracts/               # shared TypeScript contracts and registry
  engine-transparent-character/   # extracted current engine
  engine-voxl-humanoid-skin/       # new skin document and lifecycle
  provider-procedural/             # deterministic fixtures/fallback
  provider-preview-to-atlas/       # experimental model adapter
  platform-projects/               # project/version/file abstractions
  platform-jobs/                   # async generation orchestration
  platform-auth/                   # identity and authorization
  platform-entitlements/           # usage ledger and policy
  test-fixtures/                    # licensed/synthetic cross-engine fixtures

plugins/
  codex/                           # Codex skills and MCP configuration
  claude/                          # Claude skills and MCP configuration

characters/                        # compatibility path during extraction
exports/                           # current local export path
docs/
```

The final layout may differ after implementation spikes. The boundary is more important than the folder names.

## Core contracts to settle first

### Engine descriptor

```ts
type EngineDescriptor = {
  id: string;
  version: string;
  title: string;
  documentTypes: string[];
  inputTypes: string[];
  outputFormats: string[];
  capabilities: {
    create: boolean;
    revise: boolean;
    validate: boolean;
    render: boolean;
    export: boolean;
    edit2d: boolean;
    edit3d: boolean;
    animate: boolean;
  };
};
```

### Multimodal generation request

```ts
type GenerationRequest = {
  engineId: string;
  prompt: string;
  references: FileReference[];
  existingDocument?: AssetDocumentReference;
  editMask?: FileReference;
  preserveMasks?: FileReference[];
  controls?: Record<string, unknown>;
  desiredOutputs: string[];
  clientRequestId: string;
};
```

References are first-class binary assets. Do not collapse them into a fixed list of character traits.

### Job result

```ts
type EngineJobResult = {
  jobId: string;
  engineId: string;
  engineVersion: string;
  providerId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  document?: AssetDocumentReference;
  outputs: ExportedArtifact[];
  validation?: ValidationResult;
  usage?: ProviderUsage;
  error?: PublicJobError;
};
```

Creation and revision must be asynchronous and idempotent. Retrying one `clientRequestId` must not create duplicate charges or versions.

### Versioned documents

Every saved document records:

- `engineId` and `engineVersion`.
- Schema version.
- Parent version, if any.
- Input file references and retention status.
- Provider and model provenance.
- User instruction and normalized operation summary.
- Validation result.
- Immutable output hashes.

Engine migrations must be explicit, reversible where practical, and tested against fixtures.

## Delivery principles

- Preserve working behavior before reorganizing it.
- Build one vertical slice through the contracts before generalizing them further.
- Treat arbitrary text and files as primary creative inputs.
- Use structured metadata for control, revision, and search—not as a closed creation vocabulary.
- Keep model providers replaceable.
- Validate every engine output deterministically before presenting it as production-ready.
- Keep public sharing out of the first release to reduce moderation and privacy scope.
- Purchase paid digital service on the VOXL website; plugins authenticate existing accounts.
- Do not turn temporary inference experiments into production infrastructure without measured evidence.

## Phase 0: Baseline and decision records

### Goal

Create a safe starting point and record the decisions that should survive implementation details.

### Work

- Inventory the current working tree and separate unrelated user changes from VOXL work.
- Run and record the current test, validation, render, and local-editor commands.
- Add architecture decision records for:
  - Artifact engine versus generation provider.
  - Engine-specific document schemas.
  - Immutable asset versions.
  - Asynchronous jobs and idempotency.
  - Generative-first `voxl-humanoid-skin` creation with procedural fallback only.
  - Target-neutral component naming and export-profile isolation.
- Decide the minimum supported Node version and whether to introduce npm workspaces.
- Establish a branch/PR strategy that never requires destructive migration of current characters.

### Exit criteria

- Existing tests pass from a clean documented command sequence.
- The Rainbow Bear source still validates and renders.
- The current local editor still starts.
- Decision records are reviewed before package extraction begins.

## Phase 1: Engine contracts and registry

### Goal

Prove that two unrelated artifact types can coexist without sharing one document schema.

### Work

- Create the engine descriptor, requests, results, validation, render, and export types.
- Implement an in-process `EngineRegistry`.
- Add engine discovery and capability listing.
- Add contract tests using two fake engines with incompatible documents.
- Define public errors that do not leak prompts, secrets, internal paths, or provider payloads.
- Add an engine-neutral CLI or test harness for create, revise, validate, render, and export.

### Exit criteria

- Two fake engines can register and execute independently.
- The registry rejects duplicate IDs and unsupported capabilities.
- Contract tests prove that the platform never assumes a cuboid-humanoid or animation schema.

## Phase 2: Preserve and extract `transparent-character`

### Goal

Make the current Bash-derived format the first real registered engine with no behavior regression.

### Work

- Move or wrap current load, validate, raster, render, and export behavior behind the engine contract.
- Preserve the safe Bash importer rule: parse supported source and never execute supplied scripts.
- Preserve `characters/<name>/` and current npm commands through compatibility adapters.
- Register animation-specific capabilities and output formats.
- Extract editor state and rendering logic only where tests make the move safe.
- Add golden hashes or pixel assertions for representative outputs where platform codecs allow stable comparison.

### Exit criteria

- Current commands remain functional or have documented compatibility replacements.
- Existing tests pass unchanged or with behavior-equivalent updates.
- Existing character sources do not require migration.
- `transparent-character` can be discovered and invoked through the engine-neutral harness.
- Premiere-ready alpha exports remain valid.

## Phase 3: Build deterministic `voxl-humanoid-skin` core

### Goal

Create a complete, model-independent document lifecycle for valid 64x64 cuboid-humanoid skins.

### Work

- Define the 64x64 RGBA document and sidecar schema.
- Implement UV-region maps for the `wide-arm-64` and `slim-arm-64` profiles.
- Add base and outer-layer handling.
- Import valid modern skins and detect/select model geometry.
- Validate dimensions, color mode, transparency, unused regions, and model-specific arm constraints.
- Export byte-correct profile-valid PNGs without smoothing or accidental palette conversion.
- Render deterministic front/back preview images.
- Define semantic masks as optional sidecar data rather than destructive changes to the texture.
- Add fixtures for `wide-arm-64`, `slim-arm-64`, overlays, transparency, asymmetry, and invalid files.

### Exit criteria

- Valid `wide-arm-64` and `slim-arm-64` fixtures round-trip without unintended pixel changes.
- Invalid fixtures produce actionable validation errors.
- Exported fixtures pass a documented neutral export-profile import smoke test.
- The engine works without any generation provider.

## Phase 4: Shared studio shell and engine UI modules

### Goal

Use one application shell while keeping format-specific editors independent.

### Work

- Add project and engine selection.
- Load engine-specific editor modules from the registry.
- Keep current transparent-character editing behavior available.
- Build the VOXL humanoid-skin 2D atlas editor.
- Integrate a permissively licensed 3D viewer behind `cuboid-humanoid-renderer` after license verification.
- Implement 3D click/raycast to UV-pixel mapping.
- Synchronize 2D and 3D painting.
- Add base/overlay and body-part visibility.
- Add undo/redo, local versions, compare, import, validate, and export.
- Make the editor work locally before server accounts exist.

### Exit criteria

- A user can switch between the two engines without state or schema leakage.
- Both editors load through the shared shell.
- A VOXL humanoid skin can be painted from both 2D and 3D views and exported validly.
- Existing transparent-character drafting still works.

## Phase 5: Generative provider research spike

### Goal

Prove or reject an open-ended generation path before building permanent inference infrastructure.

### Work

- Create a licensed or synthetic evaluation set of at least 30 cases:
  - Text-only requests.
  - Photos and drawings.
  - Multiple content/style references.
  - Existing-skin remixes.
  - Asymmetric details.
  - Patterns continuing across front, sides, and back.
  - Outer-layer clothing and accessories.
  - `wide-arm-64` and `slim-arm-64` profiles.
  - Localized edits with explicit preserve constraints.
- Define scoring for prompt fidelity, reference fidelity, UV correctness, front/back consistency, pixel sharpness, edit preservation, and human preference.
- Build a `preview-to-atlas` provider adapter for the best provenance-acceptable candidate.
- Run it with temporary local, notebook, or rented GPU compute.
- Test alternate canonical-preview generation paths, including native host generation where accessible and API-backed generation where needed.
- Record cold start, warm latency, peak memory, failure rate, and compute cost.
- Perform a model and dataset provenance review before choosing a commercial candidate.
- Keep all inference calls behind the provider interface.

### Exit criteria

- The full input-to-atlas experiment is reproducible from documented commands.
- Complex references demonstrate genuinely open-ended output rather than template assembly.
- Every candidate output passes through deterministic validation.
- Quality and cost results identify a provider to continue, a clear fine-tuning need, or a decision to test another approach.
- No production hosting commitment is made without passing this gate.

## Phase 6: Generative creation and localized revision

### Goal

Turn the successful research provider into an engine capability with controlled editing.

### Work

- Connect prompt, references, existing document, masks, and preserve constraints to `voxl-humanoid-skin.create` and `voxl-humanoid-skin.revise`.
- Generate multiple candidates without silently charging for failed validation.
- Add deterministic postprocessing and repair only where it does not overwrite creative content unexpectedly.
- Add semantic region analysis and user-editable masks.
- Implement masked image-to-image revisions.
- Preserve immutable prior versions and enable restoration.
- Expose seed/provider metadata sufficient for debugging and reproducibility.
- Add negative and adversarial tests for malformed uploads, unsupported content, hidden metadata, and prompt injection inside referenced files.

### Exit criteria

- A complex multimodal request creates a valid skin.
- A user can change one selected region while preserving protected regions within the evaluation threshold.
- Failed jobs do not create final versions or consume a paid entitlement.
- The transparent-character engine remains independent and passing.

## Phase 7: Durable projects, files, and jobs

### Goal

Move from a local prototype to a reliable multi-user service foundation.

### Work

- Implement users, projects, assets, versions, files, jobs, provider attempts, and usage records.
- Store large binaries in object storage and metadata in the database.
- Use signed, scoped uploads and downloads.
- Add job queueing, cancellation, retries, timeout policy, and dead-letter handling.
- Make job and billing transitions transactional/idempotent.
- Strip image metadata during ingestion.
- Add retention and deletion states for references and generated outputs.
- Add per-user authorization checks on every project/file/job path.
- Instrument provider latency, failure, validation, and cost.

### Exit criteria

- A project survives restart and can be accessed only by its owner.
- Job retries cannot duplicate versions or usage charges.
- Reference deletion is verifiable.
- Operational dashboards expose generation success, latency, validation failures, and cost.

## Phase 8: Web product and private library

### Goal

Deliver the complete experience without depending on an AI-chat host.

### Work

- Add authentication and account recovery through an established identity provider.
- Build private project/library navigation.
- Add upload, prompt composer, reference roles, candidate comparison, job progress, editor handoff, and export.
- Add engine-aware empty states and examples.
- Add explicit retention controls and project deletion.
- Keep public galleries and social sharing out of scope.
- Add accessibility, responsive behavior, keyboard editing, and failure recovery.

### Exit criteria

- A new adult beta user can create, revise, edit, validate, and download without operator intervention.
- Users can understand which references are uploaded and when they are deleted.
- Both initial engines remain usable in the same product shell.

## Phase 9: Remote MCP service

### Goal

Expose the same platform safely to conversational clients.

### Work

- Add OAuth 2.1 through an established provider and validate issuer, audience, expiry, and scopes.
- Expose engine-neutral discovery and lifecycle tools:
  - `list_engines`
  - `get_engine_capabilities`
  - `create_asset`
  - `revise_asset`
  - `get_job`
  - `get_asset`
  - `validate_asset`
  - `render_asset`
  - `export_asset`
- Use file references for multimodal inputs; do not request broad conversation history.
- Annotate every tool accurately for read/write/destructive/open-world behavior.
- Return structured results without leaking internal provider payloads or secrets.
- Keep data tools separate from optional render/editor UI resources.
- Add engine-specific MCP Apps UI only where the host supports it and where it improves the workflow.
- Test retry, disconnect, OAuth expiration, multiple concurrent UI instances, and long-running jobs.

### Exit criteria

- An authenticated MCP client can complete the same create/revise/export lifecycle as the web app.
- Unauthorized access tests fail closed.
- Long-running generation uses jobs rather than an indefinitely blocked tool call.
- Tools remain useful when custom UI is unavailable.

## Phase 10: Codex and Claude plugins

### Goal

Provide host-specific workflow guidance without duplicating the engine implementation.

### Work

- Package a Codex plugin with:
  - Engine-selection skill.
  - Transparent-character workflow skill or compatibility integration.
  - VOXL humanoid-skin generation/refinement skill.
  - Remote MCP connection.
  - Local-only fallback instructions where appropriate.
- Package a Claude plugin with equivalent MCP-backed skills and clearly documented surface limitations.
- Let skills pass raw reference files and user intent rather than reducing them to a closed trait schema.
- Use native host image generation opportunistically only when the surface exposes it.
- Build a capability matrix and fallback behavior for each client.
- Test local/private marketplace installation before public submission.

### Exit criteria

- Representative prompts trigger the correct engine and tools.
- The same VOXL project can be continued from web and supported chat clients.
- Claude does not depend on nonexistent native raster generation.
- Plugin code contains no secret model credentials or irreplaceable proprietary inference logic.

## Phase 11: Entitlements and web billing

### Goal

Charge predictably for VOXL-hosted compute without charging for free local editing or failed jobs.

### Work

- Measure provider cost per accepted asset and revision.
- Choose creation-session, credit, or subscription entitlements from real beta usage.
- Implement an append-only usage ledger.
- Reserve entitlement at job start, settle on validated success, and release on failure/cancellation.
- Add web checkout, invoices/receipts where required, refunds, and customer support tooling.
- Keep pricing and checkout on the VOXL website.
- Let plugins authenticate accounts that already have entitlements; do not present prohibited digital upsells in plugin UI.
- Add per-account limits and abuse controls.

### Exit criteria

- Replayed requests cannot double-charge.
- Failed validation and provider errors follow the documented settlement policy.
- Reported revenue, ledger usage, and provider cost reconcile.
- Plugin commerce behavior passes current marketplace-policy review.

## Phase 12: Security, privacy, safety, and legal readiness

### Goal

Resolve launch-blocking risks before inviting a broad audience.

### Work

- Complete threat modeling for uploads, model endpoints, MCP tools, OAuth, object storage, job workers, and plugin distribution.
- Scan uploads, enforce content types and limits, decode images safely, and strip metadata.
- Add moderation appropriate to text, images, outputs, and public support channels.
- Establish reference retention, deletion, backup expiry, and training opt-in policy.
- Keep training on customer uploads disabled by default.
- Document subprocess and sandbox boundaries for provider workers.
- Audit licenses and provenance for models, datasets, renderers, fonts, templates, and fixtures.
- Enforce target-neutral naming and a generic independent/unaffiliated disclaimer through branding and legal review.
- Keep destination-specific compatibility, trademark, and conformance evidence in restricted compliance records outside the product namespace.
- Prepare privacy policy, terms, support URL, incident response, and abuse reporting.
- Decide age strategy with qualified counsel; do not assume an adult-only label alone resolves likely youth access.

### Exit criteria

- Critical/high security issues are resolved or formally accepted with owners.
- Commercial model/data provenance is approved.
- Privacy, retention, deletion, and support flows match the product.
- Required independent/unaffiliated language appears in launch materials without making a destination brand part of the VOXL product identity.
- Legal review determines the allowed beta audience and regions.

## Phase 13: Private beta and product validation

### Goal

Establish that users value open-ended generation and controlled refinement enough to pay.

### Work

- Recruit a small group of adult voxel-avatar creators and existing transparent-character users.
- Run the fixed evaluation set plus real user requests.
- Measure:
  - Valid upload rate.
  - Time to first accepted asset.
  - Revision rounds.
  - Prompt/reference fidelity.
  - Front/back consistency.
  - Masked-edit preservation.
  - Provider cost per accepted asset.
  - Web-to-plugin continuation.
  - Second-session purchase intent or actual conversion.
- Review failures weekly and classify them by engine, provider, orchestration, UI, or user expectation.
- Avoid adding a new engine during this phase unless required to fix platform coupling.

### Exit criteria

- Quantitative launch thresholds are defined before reading final beta results.
- The selected provider meets the agreed quality, latency, and cost thresholds.
- Users can complete the workflow without routine manual rescue.
- The Bash-derived engine has not regressed while VOXL humanoid-skin development advanced.
- There is sufficient demand evidence to fund production inference and support.

## Phase 14: Production inference and operational hardening

### Goal

Turn the successful model experiment into a supportable production service.

### Work

- Select GPU/runtime topology from measured load rather than assumptions.
- Package model weights, dependencies, safety filters, and deterministic decoder reproducibly.
- Add autoscaling or bounded concurrency, warm capacity policy, health checks, and graceful degradation.
- Cache only when privacy and request identity make it safe.
- Add provider failover or a clear degraded-mode response.
- Add budgets, cost alerts, capacity alerts, SLOs, dashboards, tracing, and on-call runbooks.
- Test restore, rollback, data deletion, regional failure, queue backlog, and provider unavailability.
- Load test web, MCP, job, storage, and inference paths separately.

### Exit criteria

- The service meets defined success, latency, capacity, and cost targets under load.
- Rollback and restore drills succeed.
- A provider outage produces a controlled user-visible state rather than lost work or duplicate charges.
- Support can trace a job from client request through provider attempt, validation, version, export, and ledger settlement.

## Phase 15: Public launch and plugin submission

### Goal

Publish a complete product and approved conversational clients.

### Work

- Finalize website, onboarding, support, privacy, terms, status, and documentation.
- Prepare plugin listing, verified publisher identity, domain verification, OAuth review credentials, content security policy, starter prompts, and release notes.
- Prepare at least five positive and three negative plugin review cases.
- Submit only after the web/MCP service is complete; public plugin guidelines do not accept a trial/demo as the finished submission.
- Launch by region according to legal and operational readiness.
- Monitor acquisition, activation, accepted-asset rate, retention, refunds, abuse, inference cost, and support volume.

### Exit criteria

- Web launch is stable with support coverage.
- Plugin submissions are approved or any rejection has an owned remediation plan.
- Usage remains within capacity and cost budgets.
- Users can identify VOXL as an independent, unofficial product.

## Phase 16: New-engine authoring kit

### Goal

Prove that componentization enables expansion rather than merely adding abstraction.

### Work

- Extract an engine starter package and conformance tests from the first two engines.
- Document engine registration, schemas, migrations, providers, UI modules, validation, exports, eval fixtures, and MCP discovery.
- Add a third small internal engine without changing existing engine packages.
- Add compatibility policy for engine and provider versions.
- Decide whether third-party engines are ever allowed; keep them internal initially.

### Exit criteria

- A third engine registers through documented extension points.
- Existing engine code requires no format-specific changes.
- Shared platform migrations remain engine-neutral.
- Conformance tests catch missing validation, export, and authorization behavior.

## Critical path

The shortest path to evidence is:

```text
Phase 0 baseline
  -> Phase 1 contracts
  -> Phase 2 preserve transparent-character
  -> Phase 3 voxl-humanoid-skin core
  -> Phase 4 local editor
  -> Phase 5 model research spike
  -> Phase 6 generative create/revise
  -> Phase 13 small concierge-style validation
```

Phases 7 through 12 productize a validated workflow. Phases 14 and 15 scale and launch it. Phase 16 proves the broader engine platform after the first commercial engine is working.

Do not build billing, public plugin submissions, multi-region inference, a public gallery, or third-party engine support before the critical path demonstrates a valuable accepted asset.

## Cross-cutting test matrix

Every phase should add tests at the lowest useful layer:

| Layer | Required coverage |
| --- | --- |
| Engine contracts | Registration, capability negotiation, incompatible schemas, version dispatch |
| Transparent character | Safe import rejection, rectangular grids, palette validation, alpha rendering, current export paths |
| VOXL humanoid skin | `wide-arm-64`/`slim-arm-64` UV maps, overlay/transparency, PNG round-trip, invalid inputs, export-profile import smoke test |
| Providers | Multimodal inputs, timeouts, invalid outputs, retries, cost capture, provenance metadata |
| Revision | Mask alignment, preservation threshold, immutable parent version, restoration |
| Jobs | Idempotency, cancellation, retry, settlement, concurrent requests |
| Authorization | Cross-user project/file/job denial, OAuth scope/audience/expiry |
| MCP | Schema conformance, annotations, OAuth challenge, headless operation, long jobs |
| UI | Engine switching, unsaved changes, accessibility, responsive layout, failure recovery |
| Privacy | Metadata stripping, retention expiry, deletion, backup expiry verification |

## Explicit non-goals for the first release

- Generating arbitrary 3D meshes.
- Supporting every external destination or voxel format.
- A public skin marketplace or social network.
- Training on customer references.
- Letting third parties run arbitrary engine code.
- Building a foundation image model from scratch.
- Replacing the current transparent-character/Premiere workflow.
- Using one universal document schema for unrelated asset types.

## Final release definition of done

VOXL v1 is complete when:

- `transparent-character` preserves the current safe import, edit, validate, render, and alpha-export workflow.
- `voxl-humanoid-skin` accepts open-ended text and image references through a generative provider.
- Voxel-avatar creators can generate, revise with masks/preservation, edit in synchronized 2D/3D views, validate, and download a profile-valid PNG.
- The web studio and supported chat clients operate the same projects through authenticated engine-neutral APIs.
- Providers can be replaced without migrating durable engine documents.
- Hosted usage is metered idempotently and purchased through policy-compliant web checkout.
- Security, privacy, model/data provenance, target-neutral branding, support, and operational launch gates are satisfied.
- A third internal engine can be added through the documented registry without modifying either initial engine.
