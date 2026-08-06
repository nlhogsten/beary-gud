# AI workflow

## Current `transparent-character` engine workflow

Use `$transparent-character-studio` from this repository. Ask naturally, for example:

- “Create a four-frame sleepy fox that blinks and emits blue smoke.”
- “Convert `old-character.sh`, make the smoke less dense, and export a 20-second alpha loop.”
- “Create a new scene where this character drifts upward with a rainbow trail.”

Codex should create or version source data, validate it, render it, inspect the generated alpha outputs, and return the exact export paths. It must not execute pasted animation scripts.

## Proposed componentized VOXL workflow

VOXL skin generation is not implemented by the current skill or character schema. Do not represent a fixed 64x64 cuboid-humanoid skin as the existing arbitrary palette-symbol animation grid. Do not remove or silently migrate the Bash-derived format; it remains the `transparent-character` engine with its own schema, editor capabilities, validation, renderer, and exports.

The intended workflow separates responsibilities:

1. Codex or Claude selects an artifact engine from the user's requested outcome.
2. The client passes raw text, reference files, existing documents, masks, and optional controls without reducing creativity to a fixed trait schema.
3. The selected engine chooses an appropriate generation provider and creates or revises its own document type.
4. Engine-specific deterministic code validates, renders, edits, and exports the result.
5. The user refines the result conversationally or in that engine's editor.
6. Validation runs before every production-ready export.

An artifact engine and a generation provider are different extension points. Initial engines are `transparent-character` and `voxl-humanoid-skin`. Providers may include native host tools, a hosted model, an external API, or a procedural test/fallback provider. An engine can replace providers without changing saved documents.

The VOXL humanoid-skin generator is intended to be generative-first and open-ended. Structured attributes such as hair color are optional metadata for control and localized revision; they are not the creation vocabulary. Procedural construction is a fixture/fallback, not the long-term creative core.

The first vertical slice should preserve `transparent-character`, build deterministic `voxl-humanoid-skin` import/edit/validate/render/export, and evaluate a real preview-to-atlas checkpoint using temporary GPU compute. Production GPU hosting comes only after that experiment establishes acceptable quality, latency, provenance, and cost.

All generated identifiers and user-facing references must follow the target-neutral naming policy: use visual geometry, dimensions, or capabilities (`voxl-humanoid-skin`, `wide-arm-64`, `slim-arm-64`, `cuboid-humanoid-renderer`), never an external product, platform, game, or publisher name. Put compatibility behavior behind export-profile adapters so a new target does not rename or fork an engine.

Read [the VOXL glossary](VOXL_GLOSSARY.md), [VOXL product research and architecture](VOXL_PRODUCT_RESEARCH.md), and [VOXL implementation plan](VOXL_IMPLEMENTATION_PLAN.md) before designing or implementing VOXL features. They define the vocabulary and record the engine/provider boundary, multimodal generation model, delivery phases, MCP/plugin boundary, monetization policies, competitors, technical references, legal considerations, and evaluation plan.
