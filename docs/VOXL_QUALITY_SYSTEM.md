# VOXL quality and walkthrough system

VOXL uses three complementary forms of evidence. None is a substitute for the others:

1. Deterministic gates establish code, engine, schema, and artifact correctness.
2. Playwright walkthroughs establish that an actual localhost browser can perform a user journey without required-step or runtime failures.
3. Independent visual review judges the screenshots and downloads for properties that DOM assertions cannot prove.

This separation prevents source inspection from being reported as browser success and prevents a successful click sequence from being reported as visual correctness.

The evidence-bundle and capture-versus-review design is adapted from the local [Bayze Agents walkthrough system](https://github.com/bayzeinc/Bayze-Agents). VOXL reimplements the useful pattern in its own Bun/TypeScript workspace with repository-owned journeys and rubrics; it does not import Bayze-specific cross-repository orchestration, desktop-runtime, authentication, or Python infrastructure.

## Evidence pipeline

```text
Deterministic checks
        ↓
Localhost Playwright journey
        ↓
Immutable run evidence in .runs/
        ↓
Independent rubric review
        ↓
Progress tracker update
```

If any applicable layer fails or has not run, the corresponding product exit criterion remains unchecked.

## Layer 1: deterministic gates

Run the canonical repository gate before browser work:

```bash
bun run check
```

This covers unit and contract tests, lint, TypeScript, and production builds. Engine and infrastructure changes can require additional focused checks:

```bash
bun run validate -- bear
bun run render -- bear
bun run db:generate
tofu -chdir=infra/tofu fmt -check -recursive
tofu -chdir=infra/tofu validate
```

These checks are the authority for deterministic behavior such as UV mappings, PNG bytes and dimensions, transparency, engine contracts, database schema generation, and compilation. They do not prove pointer mapping, WebGL rendering, responsive composition, or browser download behavior.

## Layer 2: Playwright walkthrough evidence

The repository-owned runner lives in `apps/quality-runner`. Its JSON journey definitions use accessible roles and labels where possible so visual styling can change without invalidating the workflow.

Install the local browser once after dependencies are installed:

```bash
bunx playwright install chromium
```

Start the local studio and API:

```bash
bun run dev
```

Then run a journey in a second terminal:

```bash
bun run qa:smoke
bun run qa:walkthrough <journey-id>
```

Add `--headed` to watch the browser or `--base-url http://127.0.0.1:5740` to state the local destination explicitly. The default is already `http://127.0.0.1:5740`.

The runner executes each journey in every declared viewport. Each viewport receives a new browser context, so saved drafts from another viewport or run do not become hidden prerequisites. It records console errors, uncaught page errors, failed requests, HTTP error responses, required and optional step outcomes, screenshots, and downloads. A run fails when a required step fails or an actionable runtime error is observed.

### Committed journeys

| Journey | What it establishes | Viewports |
| --- | --- | --- |
| `studio-smoke` | The standalone studio loads both native React engines, exposes the 2D atlas and 3D preview, and retains its VOXL identity. | Desktop and mobile |
| `transparent-edit-export` | Transparent-character painting, undo/redo, an effect toggle, export-mode selection, current-frame PNG export, and sprite-sheet export. | Desktop |
| `humanoid-2d-3d` | Mapped atlas painting, transparent outer-layer picking, direct WebGL painting, shared undo history, and side/rear/top/bottom rotation evidence without accidental painting. | Desktop |
| `humanoid-import-export` | Wide/slim profile conversion, validation, a valid named PNG download, and safe re-import of that same-run artifact. | Desktop |

The runner action language includes `navigate`, `click`, `fill`, `select`, `wait`, `assert-visible`, `screenshot`, `canvas-click`, `canvas-drag`, `download`, and `upload`. Canvas positions use normalized coordinates so the same journey works across viewport sizes; drags use real stepped pointer movement to distinguish rotation from painting. Upload paths are deliberately limited to a safe filename already captured in the current run's `downloads/` directory. The `humanoid-import-export` journey therefore proves a deterministic export/re-import round trip without allowing a journey to read arbitrary host files. Invalid-file fixtures remain a separate follow-up in the rubric.

### Run artifacts

Every execution creates a gitignored directory:

```text
.runs/<run-id>/
  state.json
  manifest.json
  steps.jsonl
  errors.jsonl
  report.md
  screenshots/
  downloads/
```

- `state.json` is the resumable summary: running/passed/failed state and totals.
- `manifest.json` records the journey definition, viewports, base URL, and artifact paths used for this run.
- `steps.jsonl` records each step, observation, duration, requirement level, result, and evidence path.
- `errors.jsonl` records browser, request, response, and runner observations, including whether an allowlisted observation was ignored.
- `report.md` is the human-readable walkthrough report.
- `screenshots/` contains evidence for every successful step and best-effort full-page evidence for failures.
- `downloads/` contains files captured by download steps after expected-name and non-empty checks.

The `.runs` tree is local evidence, not application state and not a source directory. Do not move screenshots into tracked product folders or commit run artifacts unless a future policy explicitly establishes a small sanitized fixture set.

## Layer 3: independent visual review

The review rubric is `apps/quality-runner/rubrics/voxl-studio-review.json`. It covers:

- actionable runtime errors and missing evidence;
- target-neutral public language and filenames;
- nearest-neighbor pixel sharpness;
- cuboid face orientation and mirroring;
- transparent outer-layer spacing and visibility;
- wide and slim profile geometry;
- synchronization between atlas and 3D edits;
- accessible names and status feedback;
- desktop and mobile layout behavior;
- downloaded file names, sizes, dimensions, decoding, and alpha behavior;
- invalid-dimension and unreadable-file import fixtures when that evidence becomes available.

The walkthrough runner does not automatically approve these visual properties. After a run, a reviewer other than the implementing agent should inspect `report.md`, applicable screenshots, errors, and downloads, then record `pass`, `fail`, or `needs-review` for every applicable required criterion. The rubric defines the required review fields; until review automation is implemented, store the result as `review.json` beside the run evidence if the run is being used to close a milestone.

A run can support progress only when all applicable required criteria pass and no automatic failure condition is present. Ambiguous evidence is `needs-review`, not a pass.

## Agent workflow

AI editors follow the same gates as human contributors:

1. Read the relevant architecture, engine contract, and current `VOXL_PROGRESS.md` items.
2. Run `bun run check` and any focused deterministic commands for the changed subsystem.
3. Start or confirm the localhost stack; never replace the local destination with an external site.
4. Select the smallest committed journey that covers the change. Use `studio-smoke` for shell/responsive work and a format-specific journey for editor behavior.
5. Report the exact run directory and distinguish required-step results from visual-review results.
6. Have a separate agent or person apply the rubric for visual milestones. The implementing agent may capture evidence but must not be the sole visual approver.
7. Fix failures and create a new run; do not edit prior evidence to make it appear successful.
8. Update `VOXL_PROGRESS.md` only after the relevant deterministic, walkthrough, and review evidence exists.

Repository-local skills route recurring work:

- `$verify-voxl-studio` runs the appropriate verification and evidence workflow.
- `$add-voxl-engine` applies engine boundaries, neutral naming, registry wiring, fixtures, and quality coverage when a new visual engine is introduced.
- `$run-voxl-generation-eval` governs repeatable generation-provider experiments and will reuse the same evidence model for candidate review.
- `$transparent-character-studio` remains the source workflow for transparent-character source, validation, rendering, and Premiere-ready overlays.

Skills guide the workflow; they do not weaken the evidence requirements or authorize external deployment.

## Generation evaluation foundation

Phase 5 uses a separate evidence path from browser walkthroughs:

- `bun run eval:check` validates the fixed case-set, rubric, and immutable-attempt schemas and reports execution-readiness blockers.
- `bun run eval:adapters` lists sanitized managed-API candidate metadata, provenance status, and executable-adapter counts. Pending metadata is visible but does not count as admission or execution readiness.
- `bun run eval:plan -- --adapter <id> --case <id>` produces a deterministic local-only plan bound to complete case/rubric, provider descriptor/configuration, provenance, revision-policy, and input hashes. It reads no credentials, invokes no adapter, performs no network or paid call, and writes no attempt evidence.
- `bun run eval:replay -- --case <id> --candidate <png>` sends an existing PNG through deterministic engine validation, canonical export, hashing, and immutable evidence storage. Replay performs no inference and is excluded from provider metrics.

The evaluator uses [Ajv](https://www.npmjs.com/package/ajv) for local JSON Schema 2020-12 validation and [ajv-formats](https://www.npmjs.com/package/ajv-formats) for RFC 3339 date-time validation. Attempts live under ignored `.runs/evaluations/`; a manifest detects later file mutation. Provider failures may have no raw artifact, and replay evidence records `provider: null`, `networkUsed: false`, and `paidCall: false` rather than inventing provider metadata.

## Reading results honestly

- `bun run check` passing means deterministic repository checks passed.
- A walkthrough reporting `passed` means required browser steps passed and no actionable runtime error was captured.
- A rubric review reporting `pass` means the recorded evidence supports the applicable visual criteria.
- None of these statements implies model-generation quality, server persistence, authentication, billing, MCP behavior, or production deployment unless a journey and rubric explicitly cover that subsystem.

The quality runner and five Phase 4 journeys are implemented and verified in a real localhost browser. The authoritative evidence includes passing desktop/mobile full-page smoke, transparent edit/export, wide/slim export/re-import, synchronized humanoid editing with directional rotation, and named-version compare/restore/isolation. Independent reviews are stored beside the final run evidence; future changes must create new evidence rather than treating these runs as permanently valid.
