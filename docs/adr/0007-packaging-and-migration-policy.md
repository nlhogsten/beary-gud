# ADR 0007: Delay workspaces and protect compatibility migrations

Status: accepted

Date: 2026-08-05

## Context

The repository began as one small Node application. Package boundaries are now useful, but introducing workspace tooling and moving character sources simultaneously would add risk without immediate product evidence.

## Decision

Keep Node 22.13.0 as the minimum runtime. Use dependency-free local packages and explicit relative imports during the first extraction slices. Reconsider npm workspaces when a third runtime package needs package-name resolution, independent scripts, or external distribution. Existing character paths and npm commands remain compatibility interfaces. Any migration that touches them requires validation, render, safe-import, editor-serving, registry, and export checks before merge or direct push.

## Consequences

The repository temporarily has package folders without workspace management. This is intentional and must be revisited at the stated trigger. Character migrations remain small, reversible through Git, and protected by both legacy and engine-contract tests.
