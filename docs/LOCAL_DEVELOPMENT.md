# VOXL local development

VOXL uses the same useful platform conventions as the committed Hokudex monorepo, adapted to VOXL's actual products. Bun coordinates workspaces; Vite belongs to the studio; Hono belongs to the server; Drizzle and Supabase belong to database infrastructure. Hokudex workflow, Redis, events, integration, and tunnel features were intentionally not copied because VOXL does not use them yet.

## Repository map

| Path | Owner |
| --- | --- |
| `apps/studio` | React 19, TypeScript, Vite, engine-specific editor modules, and browser compatibility assets |
| `apps/server` | Bun/Hono HTTP runtime and, later, remote MCP transport and application services |
| `apps/character-cli` | Local transparent-character and engine-registry commands |
| `packages/engine-*` | Reusable engine contracts, schemas, validation, rendering, and exports |
| `infra/db` | PostgreSQL schema, Drizzle migrations, database client, and local Supabase lifecycle |
| `infra/tofu` | Future AWS infrastructure declarations |
| `characters` | Compatibility source data for the current transparent-character engine |
| `evals` | Cross-workspace regression and contract tests |

Root configuration is limited to monorepo-wide concerns: workspace orchestration, shared TypeScript and ESLint policy, environment conventions, Docker Compose, and lockfiles. Product-specific configuration must stay in its owning workspace.

## Prerequisites

- Bun 1.3.10 or newer
- Node 22.13 or newer for the existing `node:test` evaluation harness
- FFmpeg for transparent-character MOV rendering
- Docker Desktop for the database or containerized stack
- OpenTofu only when validating or extending `infra/tofu`

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

```bash
bun run check
bun run validate -- bear
bun run render -- bear
tofu -chdir=infra/tofu fmt -check -recursive
tofu -chdir=infra/tofu validate
```
