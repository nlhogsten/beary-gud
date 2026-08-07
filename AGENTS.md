# VOXL agent router

Use this file as the always-on repository contract. Keep operational detail in the skills it routes to.

## Start here

- Treat `docs/planning/progress.md` as the status source of truth and `docs/planning/implementation-plan.md` as the delivery specification.
- Read `docs/architecture/system.md` and relevant `docs/architecture/decisions/` records before changing system boundaries.
- Preserve unrelated user changes. Root configuration coordinates workspaces; runtime configuration belongs to its owning package or app.
- Treat `harness/skills/` as the editable source for Seek-managed skills. Seek generates `.agents/skills/` for Codex; never edit that projection directly.
- Treat the existing `.codex/skills/` and `.claude/skills/` trees as unmanaged compatibility copies. Local Seek management does not prove Claude parity; reconcile those copies deliberately before claiming cross-editor support.

## Route work to skills

- Use `$verify-voxl-studio` for browser walkthroughs, UI claims, release evidence, and progress sign-off.
- Use `$add-voxl-engine` when creating, registering, or materially changing a visual engine.
- Use `$run-voxl-generation-eval` for model/provider experiments, candidate comparisons, and generation-quality decisions.
- Use `$transparent-character-studio` for the original transparent pixel-animation workflow.
- Prefer the local Seek path when repository-local skills are sufficient. Do not require a remote registry, authentication, MCP connection, or hosted service unless the requested outcome actually needs organization sharing or another remote capability.

## Non-negotiable architecture rules

- Use target-neutral VOXL artifact, geometry, dimension, and capability names. Keep destination, game, platform, publisher, and trademark names out of public component identities.
- Keep visual engines, generation providers, renderers, and clients separate. Engines own document meaning, validation, migration, editing, rendering contracts, and export; providers supply replaceable creative compute.
- Keep app and tool configuration with its owning workspace. The root may orchestrate but must not become an application runtime.
- Route web, HTTP, and MCP entry points through the same authorized application services and durable project/version store.
- Call generative compute only through a provider adapter. Provider payloads and identities must not become engine document schemas.
- Use managed external generation APIs by default. VOXL workers orchestrate, validate, render, and persist; they do not host model weights or require GPUs. Do not add local, rented-GPU, or self-hosted inference as a fallback without a new ADR and explicit approval.
- Deterministically validate every imported or generated result before acceptance or export.
- Save accepted creations and revisions as immutable versions; never overwrite an accepted durable version.
- Make asynchronous generation and paid-usage transitions idempotent. Retried client request IDs must not duplicate versions or charges.
- Mark progress complete only after its stated evidence passes. Do not infer browser behavior from source or unit tests alone.
- Remove obsolete implementations and compatibility paths in the same change once replacement parity is proven.
- Run the canonical repository gate, `bun run check`, plus the focused engine, database, infrastructure, or walkthrough gate required by the change.
