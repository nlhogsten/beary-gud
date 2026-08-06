# ADR 0005: Make humanoid-skin creation generative-first

Status: accepted

Date: 2026-08-05

## Context

A fixed trait customizer cannot express the open-ended patterns, asymmetry, reference combinations, and localized revisions required by the product vision.

## Decision

`voxl-humanoid-skin` accepts raw multimodal inputs and uses image generation as its primary creative path. Structured controls and semantic masks improve precision but do not define the creative vocabulary. Procedural construction remains a deterministic fixture and fallback.

## Consequences

The engine must evaluate real preview-to-atlas generation before production GPU infrastructure is selected. Deterministic validation and repair remain mandatory around every generative output.
