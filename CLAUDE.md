# VOXL agent router

Use this file as the always-on repository contract. Keep operational detail in the skills it routes to.

## Start here

- Treat `docs/VOXL_PROGRESS.md` as the status source of truth and `docs/VOXL_IMPLEMENTATION_PLAN.md` as the delivery specification.
- Read `docs/VOXL_ARCHITECTURE.md` and relevant `docs/adr/` records before changing system boundaries.
- Preserve unrelated user changes. Root configuration coordinates workspaces; runtime configuration belongs to its owning package or app.
- Treat `.codex/skills/` as canonical and keep the matching `.claude/skills/` files byte-identical for cross-editor discovery.

## Route work to skills

- Use `.claude/skills/verify-voxl-studio/` for browser walkthroughs, UI claims, release evidence, and progress sign-off.
- Use `.claude/skills/add-voxl-engine/` when creating, registering, or materially changing a visual engine.
- Use `.claude/skills/run-voxl-generation-eval/` for model/provider experiments, candidate comparisons, and generation-quality decisions.
- Use `.codex/skills/transparent-character-studio/` for the original transparent pixel-animation workflow until it receives a Claude mirror.

## Non-negotiable architecture rules

- Use target-neutral VOXL artifact, geometry, dimension, and capability names. Keep destination, game, platform, publisher, and trademark names out of public component identities.
- Keep visual engines, generation providers, renderers, and clients separate. Engines own document meaning, validation, migration, editing, rendering contracts, and export; providers supply replaceable creative compute.
- Keep app and tool configuration with its owning workspace. The root may orchestrate but must not become an application runtime.
- Route web, HTTP, and MCP entry points through the same authorized application services and durable project/version store.
- Call generative compute only through a provider adapter. Provider payloads and identities must not become engine document schemas.
- Deterministically validate every imported or generated result before acceptance or export.
- Save accepted creations and revisions as immutable versions; never overwrite an accepted durable version.
- Make asynchronous generation and paid-usage transitions idempotent. Retried client request IDs must not duplicate versions or charges.
- Mark progress complete only after its stated evidence passes. Do not infer browser behavior from source or unit tests alone.
- Remove obsolete implementations and compatibility paths in the same change once replacement parity is proven.
- Run the canonical repository gate, `bun run check`, plus the focused engine, database, infrastructure, or walkthrough gate required by the change.
