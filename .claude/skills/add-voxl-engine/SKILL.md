---
name: add-voxl-engine
description: Create, register, or materially extend a VOXL visual engine while preserving package, schema, provider, renderer, and client boundaries. Use for new artifact types, engine capabilities, engine-owned schemas or migrations, validators, exports, render adapters, and engine-specific studio modules.
---

# Add a VOXL engine

Read `references/engine-checklist.md` completely before choosing files or public names.

1. Read the progress tracker, architecture, engine/provider ADR, engine-owned-schema ADR, target-neutral naming ADR, and workspace-boundary ADR.
2. Inspect `@voxl/engine-contracts` and at least one current engine before extending a shared contract. Prefer a capability addition over assuming every engine shares one shape.
3. Choose a stable, target-neutral engine ID describing the VOXL artifact. Define geometry and export profiles independently of destination brands.
4. Put the document schema, schema version, validation, migrations, deterministic operations, and export logic in `packages/engine-<id>/`.
5. Put generative compute in a separate provider adapter. An engine may request provider capabilities but must not import provider-specific payloads into its durable document.
6. Put browser UI and renderer implementation in the owning studio module. Do not make the shared shell inspect engine-specific document fields.
7. Register the engine explicitly in server and studio registries. Keep HTTP, future MCP, and web clients on the same application-service operations and authorization boundary.
8. Add fixtures and conformance tests for valid/invalid documents, migration, deterministic edits, render/export, registry discovery, and failure behavior.
9. Run focused tests and `bun run check`. Run the smallest relevant browser journey with `$verify-voxl-studio` for any interactive claim.
10. Delete a replaced compatibility path after parity is proven. Update architecture/progress documentation only with the evidence produced.

Do not add engine-specific columns or conditionals to shared platform records. Shared code may use engine ID, engine version, document kind, capabilities, and asset-version references; the engine owns the visual fields.

