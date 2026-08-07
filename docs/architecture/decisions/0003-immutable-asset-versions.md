# ADR 0003: Store revisions as immutable asset versions

Status: accepted

Date: 2026-08-05

## Context

Generative and manual edits can be difficult to reproduce exactly. Users need comparison, restoration, provenance, and confidence that one revision will not destroy accepted work.

## Decision

Every accepted creation or revision produces a new immutable asset version linked to its parent. A version records its engine and schema versions, inputs, operation summary, provider provenance, validation result, and output hashes.

## Consequences

Edits consume additional storage but enable restoration and auditing. Mutable editor drafts may exist locally, but saving an accepted revision creates a new durable version rather than overwriting its parent.
