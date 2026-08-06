# VOXL engine authoring checklist

## Identity and boundaries

- Name the engine after its artifact, geometry, dimensions, or capability.
- Keep destination, game, platform, publisher, and trademark names out of engine IDs, packages, schemas, APIs, UI modules, fixtures, prompts, logs, analytics, and plugin metadata.
- Represent compatibility through neutral export profiles and adapters.
- Keep provider identity as version provenance, not document meaning.
- Keep renderer dependencies replaceable and outside shared platform contracts.

## Engine package

An engine package should own only the pieces applicable to its artifact:

- Stable engine descriptor, capabilities, and version.
- Versioned document schema and types.
- Deterministic validation with actionable public errors.
- Explicit migrations between supported schema versions.
- Deterministic edits and import normalization.
- Render input/output contracts.
- Export-profile adapters and byte-level validation.
- Engine-specific evaluation fixtures.

Do not require unsupported operations merely for uniformity. Capability discovery must tell clients which operations exist.

## Providers

- Invoke generative compute through a provider adapter selected by capability.
- Keep credentials, endpoints, model payloads, retry behavior, and provider SDKs in provider/runtime ownership.
- Normalize provider output into an engine candidate, then run engine validation before accepting it.
- Record provider/model/seed/configuration as provenance without embedding a provider response in the durable document.
- Allow a deterministic procedural provider or fixture so engine tests do not require network or GPU access.

## Platform and clients

- Shared project, asset, version, file, job, and usage records remain engine-neutral.
- Every accepted create or revise operation writes a new immutable asset version linked to its parent.
- Web, HTTP, MCP, and future plugin UI call the same application services; no client owns a second project store.
- Asynchronous generation uses a durable client request ID. Retries return the same outcome and cannot duplicate versions, reservations, or charges.
- Keep Vite/editor configuration in `apps/studio`, Hono runtime configuration in `apps/server`, database configuration in `infra/db`, and package-specific configuration with its package.

## Required evidence

- Descriptor and registry discovery.
- Valid and invalid document fixtures.
- Schema-version rejection and supported migration.
- Deterministic edit repeatability.
- Render dimensions, alpha behavior, and orientation where relevant.
- Exact exported bytes/dimensions/profile rules.
- Provider failure and invalid-output rejection without an accepted version.
- UI isolation: switching engines does not lose or reinterpret another engine's draft.
- Canonical `bun run check` result and a relevant committed walkthrough for browser behavior.

