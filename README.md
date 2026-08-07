# VOXL Studio

Build, refine, validate, and export visual characters through independent VOXL engines. The original transparent pixel-character workflow remains fully supported and can export Premiere-ready overlays without screen recording, keying, or manual looping.

## VOXL direction

This repository began as a transparent pixel-character studio. It is now the implementation workspace for **VOXL**, a componentized AI-native asset studio. VOXL keeps the existing Bash-derived character workflow as the `transparent-character` engine and adds independent engines such as `voxl-humanoid-skin`, which combines open-ended multimodal generation, deterministic validation, 2D/3D refinement, and profile-valid export.

VOXL names engines, packages, APIs, and editor modules after the visual artifact they implement—not after any external application, game, platform, or publisher. Compatibility is represented by neutral export profiles such as `wide-arm-64` and `slim-arm-64`.

The existing animation workflow remains the current working product. VOXL is organized as a Bun workspace monorepo: independent applications live in `apps/`, reusable visual engines live in `packages/`, database and cloud infrastructure live in `infra/`, and the root package only coordinates them. Development is localhost-only; future production targets an OpenTofu-managed AWS runtime. Start with the [documentation guide](docs/README.md), which points to the architecture, current generation method, implementation plan, progress tracker, local runbook, quality system, and glossary.

## Start the local editor

```bash
cd /Users/natehogsten/Desktop/beary-gud
bun install
bun run env:init
bun run dev
```

Open `http://127.0.0.1:5740`. This runs the Vite studio and Bun/Hono API together on the host. The API is available at `http://127.0.0.1:5741`; Vite proxies `/api` requests to it. VOXL uses its own ports so it can run alongside Hokudex.

Both current visual editors are native React engine modules in the shared studio shell. Run only one application with `bun run dev:studio` or `bun run dev:server`.

For the complete Docker/Supabase local stack, run `bun run docker:stack:up`. This starts the database services plus separate studio and server containers. No command publishes VOXL externally.

## Verify the studio

Run the deterministic repository gate first:

```bash
bun run check
```

For real-browser evidence, keep the localhost studio running and execute a committed Playwright journey in another terminal:

```bash
bunx playwright install chromium # first local setup only
bun run qa:smoke
bun run qa:walkthrough humanoid-2d-3d
```

Walkthrough evidence is written to the gitignored `.runs/<run-id>/` directory. A passing walkthrough means its required interactions completed without actionable browser errors; it does not by itself approve visual correctness. Review the screenshots and downloads against [`apps/quality-runner/rubrics/voxl-studio-review.json`](apps/quality-runner/rubrics/voxl-studio-review.json) before closing a visual milestone. See [the quality-system guide](docs/quality/studio-verification.md) for the four journeys, artifact format, and agent workflow.

## Make or change a character

The local editor is for drafting. Production character data lives in `characters/<name>/`. Copy an existing character folder or create a new one, edit `character.json` and its frame files, then run:

```bash
bun run validate -- <name>
bun run render -- <name>
```

Production exports appear in `exports/<name>/`: a transparent PNG sequence, alpha MOV files, and a contact sheet. Import `<name>_loop_30s.mov` into Premiere for the ready-to-loop overlay. The editor's animated PNG is intended for quick previews and apps that support APNG; use the rendered MOV for Premiere.

For Codex-driven work, use the repo skill: `$transparent-character-studio`. See [the AI workflow](docs/development/ai-workflow.md).

## Old Bash animations

The safe importer supports a quoted canvas/palette/offset animation format. It reads source without executing it:

```bash
bun run import-bash -- /path/to/old-animation.sh new-character
bun run render -- new-character
```

Read [the documentation guide](docs/README.md), [local development runbook](docs/development/local-development.md), [quality-system guide](docs/quality/studio-verification.md), [usage guide](docs/guides/usage.md), [animation guide](docs/guides/animation.md), and [Bash migration guide](docs/guides/bash-migration.md).
