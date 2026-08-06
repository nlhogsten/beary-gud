# VOXL Studio

Build, refine, validate, and export visual characters through independent VOXL engines. The original transparent pixel-character workflow remains fully supported and can export Premiere-ready overlays without screen recording, keying, or manual looping.

## VOXL direction

This repository began as a transparent pixel-character studio. It is now the implementation workspace for **VOXL**, a componentized AI-native asset studio. VOXL keeps the existing Bash-derived character workflow as the `transparent-character` engine and adds independent engines such as `voxl-humanoid-skin`, which combines open-ended multimodal generation, deterministic validation, 2D/3D refinement, and profile-valid export.

VOXL names engines, packages, APIs, and editor modules after the visual artifact they implement—not after any external application, game, platform, or publisher. Compatibility is represented by neutral export profiles such as `wide-arm-64` and `slim-arm-64`.

The existing animation workflow remains the current working product. The platform now has [`@voxl/engine-contracts`](packages/engine-contracts/README.md), the registered [`transparent-character` engine](packages/engine-transparent-character/README.md), the deterministic [`voxl-humanoid-skin` core](packages/engine-voxl-humanoid-skin/README.md), and a React/Vite shared shell with a native humanoid 2D editor. Development is localhost-only; future production targets an OpenTofu-managed AWS runtime. Start with [the system architecture](docs/VOXL_ARCHITECTURE.md), [plain-language glossary](docs/VOXL_GLOSSARY.md), [product research](docs/VOXL_PRODUCT_RESEARCH.md), [implementation plan](docs/VOXL_IMPLEMENTATION_PLAN.md), and [checked progress tracker](docs/VOXL_PROGRESS.md).

## Start the local editor

```bash
cd /Users/natehogsten/Desktop/beary-gud
npm run dev
```

Open `http://localhost:5173`. Vite serves the canonical React application. The native humanoid editor supports local painting, undo/redo, profile conversion, visibility controls, validation, PNG import/export, and browser draft persistence.

The preserved transparent-character editor remains available inside the React shell at `/compatibility/index.html` while it is migrated from imperative browser code. To run only that older surface, use `npm run dev:compatibility` and open `http://localhost:4173`.

For a production-shaped local smoke test, run `npm run build` followed by `npm start`, then open `http://localhost:3000`. The Express server exposes `/api/health` and serves the built single-page application. No command publishes VOXL externally.

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

Read [the usage guide](docs/USAGE_GUIDE.md), [animation guide](docs/ANIMATION_GUIDE.md), [Bash migration guide](docs/BASH_MIGRATION.md), [VOXL glossary](docs/VOXL_GLOSSARY.md), [VOXL research](docs/VOXL_PRODUCT_RESEARCH.md), [VOXL implementation plan](docs/VOXL_IMPLEMENTATION_PLAN.md), [VOXL progress tracker](docs/VOXL_PROGRESS.md), and [Seek pilot notes](docs/SEEK_PILOT_NOTES.md).
