# VOXL database workspace

This workspace owns the PostgreSQL schema, Drizzle migration artifacts, database client, and local Supabase lifecycle. Application queries stay in the application that uses them; shared table definitions live here.

```bash
bun run env:init
bun run supabase:start
bun run db:generate
bun run db:migrate
```

Local ports are deliberately isolated from the Hokudex defaults: API `56421`, PostgreSQL `56422`, and Studio `56423`.

`db:reset` is destructive and refuses non-local database URLs. No RLS policy is claimed yet because VOXL authentication and tenancy have not been implemented.
