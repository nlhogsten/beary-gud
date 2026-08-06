# Transparent Character Studio

Make crisp pixel characters and export transparent overlays for Premiere Pro. No screen recording, keying, or manual looping.

## VOXL direction

This repository began as a transparent pixel-character studio. It is now also the exploration space for **VOXL**, a proposed componentized AI-native asset studio. VOXL keeps the existing Bash-derived character workflow as the `transparent-character` engine and adds independent engines such as `voxl-humanoid-skin`, which combines open-ended multimodal generation, deterministic validation, 2D/3D refinement, and profile-valid export.

VOXL names engines, packages, APIs, and editor modules after the visual artifact they implement—not after any external application, game, platform, or publisher. Compatibility is represented by neutral export profiles such as `wide-arm-64` and `slim-arm-64`.

The existing animation workflow remains the current working product. The VOXL product experience and humanoid-skin engine are not implemented yet, but the platform foundation has started with [`@voxl/engine-contracts`](packages/engine-contracts/README.md). Start with [the plain-language VOXL glossary](docs/VOXL_GLOSSARY.md), read [the VOXL product research and architecture](docs/VOXL_PRODUCT_RESEARCH.md) for the product boundary and evidence, then use [the start-to-finish implementation plan](docs/VOXL_IMPLEMENTATION_PLAN.md) for engine contracts, delivery phases, gates, and the release definition of done.

## Start the local editor

```bash
cd /Users/natehogsten/Desktop/beary-gud
npm run dev
```

Open `http://localhost:4173`. The editor lets you create local draft characters, paint pixels, undo and redo edits, create custom colors, sample canvas colors, adjust preview settings, toggle effects, and export a still PNG, animated PNG, or sprite sheet. Drafts and activity history are saved in your browser.

The local editor is deliberately a small browser app served by `scripts/server.mjs`; the React/Next files in `app/` are a separate prototype and are not what `npm run dev` currently starts. Server requests and failures are appended to `logs/dev-server.log`, which survives restarts and is ignored by Git.

If port 4173 is already in use, the editor is probably already running; open the URL above. To restart it, stop the existing process with `Ctrl-C` in its original terminal, then run `npm run dev` once.

## Make or change a character

The local editor is for drafting. Production character data lives in `characters/<name>/`. Copy an existing character folder or create a new one, edit `character.json` and its frame files, then run:

```bash
npm run validate -- <name>
npm run render -- <name>
```

Production exports appear in `exports/<name>/`: a transparent PNG sequence, alpha MOV files, and a contact sheet. Import `<name>_loop_30s.mov` into Premiere for the ready-to-loop overlay. The editor's animated PNG is intended for quick previews and apps that support APNG; use the rendered MOV for Premiere.

For Codex-driven work, use the repo skill: `$transparent-character-studio`. See [the AI workflow](docs/AI_WORKFLOW.md).

## Old Bash animations

The safe importer supports a quoted canvas/palette/offset animation format. It reads source without executing it:

```bash
npm run import-bash -- /path/to/old-animation.sh new-character
npm run render -- new-character
```

Read [the usage guide](docs/USAGE_GUIDE.md), [animation guide](docs/ANIMATION_GUIDE.md), [Bash migration guide](docs/BASH_MIGRATION.md), [VOXL glossary](docs/VOXL_GLOSSARY.md), [VOXL research](docs/VOXL_PRODUCT_RESEARCH.md), and [VOXL implementation plan](docs/VOXL_IMPLEMENTATION_PLAN.md).
