# VOXL local development

VOXL uses the same useful platform conventions as the committed Hokudex monorepo, adapted to VOXL's actual products. Bun coordinates workspaces; Vite belongs to the studio; Hono belongs to the server; Drizzle and Supabase belong to database infrastructure. Hokudex workflow, Redis, events, integration, and tunnel features were intentionally not copied because VOXL does not use them yet.

## Repository map

| Path | Owner |
| --- | --- |
| `apps/studio` | React 19, TypeScript, Vite, and engine-specific editor modules |
| `apps/server` | Bun/Hono HTTP runtime and, later, remote MCP transport and application services |
| `apps/character-cli` | Local transparent-character and engine-registry commands |
| `apps/quality-runner` | Playwright journey execution, runtime observation, downloads, screenshots, and run reports |
| `packages/engine-*` | Reusable engine contracts, schemas, validation, rendering, and exports |
| `infra/db` | PostgreSQL schema, Drizzle migrations, database client, and local Supabase lifecycle |
| `infra/tofu` | Future AWS infrastructure declarations |
| `characters` | Compatibility source data for the current transparent-character engine |
| `evals` | Cross-workspace regression and contract tests |
| `.runs` | Gitignored local walkthrough evidence; never production source or committed fixtures |

Root configuration is limited to monorepo-wide concerns: workspace orchestration, shared TypeScript and ESLint policy, environment conventions, Docker Compose, and lockfiles. Product-specific configuration must stay in its owning workspace.

## Prerequisites

- Bun 1.3.10 or newer
- Node 22.13 or newer for the existing `node:test` evaluation harness
- FFmpeg for transparent-character MOV rendering
- Docker Desktop for the database or containerized stack
- OpenTofu only when validating or extending `infra/tofu`
- Playwright Chromium for browser walkthroughs; install it once with `bunx playwright install chromium`

## Host-mode development

```bash
bun install
bun run env:init
bun run dev
```

Local endpoints:

- Studio: `http://127.0.0.1:5740`
- Hono API: `http://127.0.0.1:5741`
- API health: `http://127.0.0.1:5741/api/health`
- Engine discovery: `http://127.0.0.1:5741/api/engines`

These ports are intentionally different from Hokudex so both repositories can run locally at the same time.

`bun run dev` runs both applications. Use `bun run dev:studio` and `bun run dev:server` in separate terminals when independent logs are preferable.

## Local database

```bash
bun run supabase:start
bun run db:migrate
```

Local database endpoints:

- Supabase API: `http://127.0.0.1:56421`
- PostgreSQL: `127.0.0.1:56422`
- Supabase Studio: `http://127.0.0.1:56423`

Drizzle schema changes follow this sequence:

```bash
# edit infra/db/src/schema/index.ts
bun run db:generate
bun run db:migrate
```

Migration SQL under `infra/db/drizzle` is reviewed and committed. `bun run db:reset` destroys only a local database and requires confirmation; use `bun run db:reset -- --yes` only when local data loss is intended.

The schema currently establishes projects, assets, immutable asset versions, and idempotent generation jobs. The server does not yet persist requests because authentication, tenancy, and the application-service layer belong to later phases.

## Docker-managed local stack

```bash
bun run docker:stack:up
bun run docker:stack:ps
bun run docker:stack:logs
bun run docker:stack:down
```

The stack manager starts local Supabase first, then separate `studio` and `server` containers. Other useful commands are `docker:apps:build`, `docker:server:logs`, `docker:studio:logs`, and `docker:stack:restart`.

Docker is a development option, not a requirement for ordinary frontend or engine work. The future ECS image is owned by `apps/server/Dockerfile`; no AWS deployment exists yet.

## Verification

### Deterministic gate

```bash
bun run check
bun run validate -- bear
bun run render -- bear
tofu -chdir=infra/tofu fmt -check -recursive
tofu -chdir=infra/tofu validate
```

`bun run check` runs unit/contract tests, lint, TypeScript checks, and production builds. It deliberately does not launch a browser. Use it for deterministic code, engine, schema, and build regressions; do not treat it as evidence that a canvas, WebGL interaction, responsive layout, or download works in a real browser.

### Browser walkthroughs

Start the localhost applications in one terminal:

```bash
bun run dev
```

Run a journey in another terminal:

```bash
bun run qa:smoke
bun run qa:walkthrough transparent-edit-export
bun run qa:walkthrough humanoid-2d-3d
bun run qa:walkthrough humanoid-import-export
```

Useful options:

```bash
bun run qa:walkthrough studio-smoke --headed
bun run qa:walkthrough humanoid-2d-3d --base-url http://127.0.0.1:5740
```

The default destination is `http://127.0.0.1:5740`. Journeys contain only local paths and must not navigate to external services. Each viewport receives an isolated browser context. The runner captures every step, browser console/page errors, failed requests and error responses, expected downloads, and a Markdown report under `.runs/<run-id>/`.

A runner result is only the interaction and runtime layer of verification. Visual approval is a separate review of the evidence against `apps/quality-runner/rubrics/voxl-studio-review.json`. Follow [the complete quality workflow](VOXL_QUALITY_SYSTEM.md) before checking a visual exit criterion in `VOXL_PROGRESS.md`.
