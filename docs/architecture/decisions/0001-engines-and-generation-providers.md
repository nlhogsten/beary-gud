# ADR 0001: Separate visual engines from generation providers

Status: accepted

Date: 2026-08-05

## Context

VOXL needs exact visual-format behavior and replaceable generative compute. Treating a hosted model as the engine would make saved projects and editors depend on one provider.

## Decision

A visual engine owns its document, validation, rendering, editing, and export lifecycle. A generation provider supplies replaceable creative compute behind engine capabilities. Provider identity is recorded as provenance but does not become the engine ID or durable document schema.

## Consequences

Engines can switch between native host tools, APIs, hosted checkpoints, and procedural fixtures without migrating saved assets. Provider adapters must return engine-valid documents and remain outside engine-owned schema definitions.
