# ADR 0010: Use Bun workspaces and keep runtime configuration with its owner

Status: Accepted

Date: 2026-08-05

## Context

VOXL crossed the workspace trigger recorded in ADR 0007 when it gained a standalone studio, an API/MCP service direction, a local character CLI, multiple engine packages, database infrastructure, and cloud infrastructure. Keeping Vite, server, and database configuration at the repository root made these products appear to be one runtime and would make future workers or plugin UI difficult to isolate.

The committed Hokudex monorepo demonstrates a proven local pattern for the same developer environment: Bun workspaces, an application directory per runtime, infrastructure-owned Drizzle and Supabase files, root environment coordination, and scriptable host/Docker workflows.

## Decision

- Adopt Bun 1.3.10 workspaces. The root package coordinates workspace commands and owns no application runtime.
- Put the React/Vite browser application in `apps/studio`.
- Put the Bun/Hono API runtime in `apps/server`. Remote MCP transport will call the same application services from this boundary or a later independently scalable service.
- Put local character commands in `apps/character-cli` while retaining root convenience aliases.
- Keep reusable visual behavior in `packages/engine-*`.
- Put PostgreSQL schema, Drizzle configuration and migrations, database client code, and local Supabase configuration in `infra/db`.
- Keep future AWS declarations in `infra/tofu`.
- Keep monorepo-wide TypeScript, ESLint, environment, Compose, and lockfile configuration at root.
- Reuse Hokudex's organizational conventions, but do not copy unrelated event, Redis, tunnel, provider, authentication, or workflow domain code.

## Consequences

- Product-specific tools are discoverable from the directory that owns them.
- The studio, server, CLI, database, engines, and future worker can evolve and deploy independently.
- Local host mode and Docker/Supabase mode share root environment conventions and commands.
- The package manager changes from npm to Bun; documented active commands use `bun run`.
- Node remains required temporarily for the existing evaluation harness and FFmpeg subprocess workflow.
- ADR 0007's delayed-workspace decision is superseded because its adoption trigger has been met; its compatibility safeguards remain in force.
