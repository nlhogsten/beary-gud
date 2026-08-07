# AI workflow

## Repository skill routing

The repository's four operational skills are locally managed by Seek for Codex. Their editable source is `harness/skills/`, and Seek's generated projection is `.agents/skills/`. Invoke a skill by name and outcome rather than teaching an agent a file path; `AGENTS.md` performs the always-on routing.

Use local management for repository-only work. It does not require a remote connection, Seek authentication, an MCP provider, or a hosted registry. Add a remote or organization workflow only when reviewed skills must be distributed across repositories or coding-tool surfaces.

The older `.codex/skills/` and `.claude/skills/` directories remain user-owned compatibility copies. They are not evidence that Seek manages those surfaces. In particular, the current local selection is Codex-only; an agent must report Claude or Cursor parity as unsupported instead of silently adding a proprietary service or broadening the configuration.

Edit `harness/skills/`, then use Seek to rebuild/activate and run `seek check`. Never edit `.agents/skills/` directly.

## Current `transparent-character` engine workflow

Use `$transparent-character-studio` from this repository. Ask naturally, for example:

- “Create a four-frame sleepy fox that blinks and emits blue smoke.”
- “Convert `old-character.sh`, make the smoke less dense, and export a 20-second alpha loop.”
- “Create a new scene where this character drifts upward with a rainbow trail.”

Codex should create or version source data, validate it, render it, inspect the generated alpha outputs, and return the exact export paths. It must not execute pasted animation scripts.

The implementation lives in `packages/engine-transparent-character/`; its local command adapter lives in `apps/character-cli/`. The root `bun run validate`, `bun run render`, and `bun run import-bash` aliases remain compatibility interfaces. Use `bun run voxl -- engines` for engine-neutral discovery.

## Proposed componentized VOXL workflow

VOXL generative skin creation is not implemented by the current skill. The deterministic `voxl-humanoid-skin` document, profiles, PNG lifecycle, validation, and front/back previews now live in `packages/engine-voxl-humanoid-skin/`. Do not represent that fixed 64x64 cuboid-humanoid skin as the existing arbitrary palette-symbol animation grid. Do not remove or silently migrate the Bash-derived format; it remains the `transparent-character` engine with its own schema, editor capabilities, validation, renderer, and exports.

The intended workflow separates responsibilities:

1. Codex or Claude selects an artifact engine from the user's requested outcome.
2. The client passes raw text, reference files, existing documents, masks, and optional controls without reducing creativity to a fixed trait schema.
3. The selected engine chooses an appropriate generation provider and creates or revises its own document type.
4. Engine-specific deterministic code validates, renders, edits, and exports the result.
5. The user refines the result conversationally or in that engine's editor.
6. Validation runs before every production-ready export.

An artifact engine and a generation provider are different extension points. Initial engines are `transparent-character` and `voxl-humanoid-skin`. Managed external APIs are the default generative providers; native host tools may be evaluated when available, and procedural providers remain useful for tests and fallback behavior. An engine can replace providers without changing saved documents.

The VOXL humanoid-skin generator is intended to be generative-first and open-ended. Structured attributes such as hair color are optional metadata for control and localized revision; they are not the creation vocabulary. Procedural construction is a fixture/fallback, not the long-term creative core.

The first vertical slice preserves `transparent-character`, builds deterministic `voxl-humanoid-skin` import/edit/validate/render/export, and evaluates API-accessible `preview-to-atlas` paths. VOXL does not plan to rent or operate GPUs. A local or self-hosted checkpoint comparison is optional research that requires a separate proposal and explicit approval.

All generated identifiers and user-facing references must follow the target-neutral naming policy: use visual geometry, dimensions, or capabilities (`voxl-humanoid-skin`, `wide-arm-64`, `slim-arm-64`, `cuboid-humanoid-renderer`), never an external product, platform, game, or publisher name. Put compatibility behavior behind export-profile adapters so a new target does not rename or fork an engine.

Read [the VOXL glossary](../reference/glossary.md), [VOXL product research](../research/product.md), [generation research](../research/generation/README.md), [system architecture](../architecture/system.md), and [VOXL implementation plan](../planning/implementation-plan.md) before designing or implementing VOXL features. They define the vocabulary and record the engine/provider boundary, current generation hypothesis, delivery phases, MCP/plugin boundary, monetization policies, competitors, technical references, legal considerations, and evaluation plan.
