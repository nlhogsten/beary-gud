# ADR 0007: Delay workspaces and protect compatibility migrations

Status: Superseded in part by ADR 0010

Date: 2026-08-05

## Context

The repository began as one small Node application. Package boundaries are now useful, but introducing workspace tooling and moving character sources simultaneously would add risk without immediate product evidence.

## Decision

Keep Node 22.13.0 as the minimum runtime. Use dependency-free local packages and explicit relative imports during the first extraction slices. Reconsider npm workspaces when a third runtime package needs package-name resolution, independent scripts, or external distribution. Existing character paths and npm commands remain compatibility interfaces. Any migration that touches them requires validation, render, safe-import, editor-serving, registry, and export checks before merge or direct push.

## Consequences

The repository temporarily used package folders without workspace management. ADR 0010 records that the trigger was reached and adopts Bun workspaces. The compatibility requirements in this record remain active: character migrations stay small, reversible through Git, and protected by legacy and engine-contract tests.
