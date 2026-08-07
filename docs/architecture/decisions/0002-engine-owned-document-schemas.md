# ADR 0002: Let each engine own its document schema

Status: accepted

Date: 2026-08-05

## Context

Transparent animations, cuboid-humanoid skins, voxel props, and future visuals do not share the same geometry, editing operations, validation rules, or exports.

## Decision

Every engine owns and versions its document schema. Shared platform records refer to documents through engine ID, engine version, document kind, and an asset-version reference. The platform contract defines lifecycle operations without defining universal visual fields.

## Consequences

Adding an engine requires registration and conformance tests, not fields in a universal asset object. Cross-engine platform code must not inspect format-specific document properties.
