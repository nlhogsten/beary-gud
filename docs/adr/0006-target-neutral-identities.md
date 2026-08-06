# ADR 0006: Use target-neutral component and profile identities

Status: accepted

Date: 2026-08-05

## Context

Naming engines after external destinations creates legal, branding, and architectural coupling. The same visual format may be compatible with more than one destination over time.

## Decision

Engine, package, schema, API, UI, fixture, prompt, log, analytics, and plugin identities describe VOXL visual artifacts, geometry, dimensions, or capabilities. The first skin engine is `voxl-humanoid-skin`; its profiles are `wide-arm-64` and `slim-arm-64`. Destination-specific conformance evidence stays in restricted compliance records.

## Consequences

Compatibility is implemented behind neutral export-profile adapters. Adding a destination cannot rename or fork an engine solely for branding reasons.
