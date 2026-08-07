# 0012 — Separate model geometry from texture density

Status: Accepted

Date: 2026-08-05

## Context

A cuboid-humanoid skin has at least two independent compatibility concerns: the physical model geometry and the number of texture texels mapped onto that geometry. Treating the atlas size as the body shape caused the browser renderer to duplicate engine geometry, encouraged fixed `64x64` assumptions, and made higher-density textures look like a different character body.

Some destinations accept more than one atlas density for the same model proportions. Separately, some extensions change how the outer texture layer is rendered in three dimensions without increasing atlas density. These are different capabilities and must not be collapsed into one profile flag.

## Decision

The humanoid-skin engine owns both exact model-unit geometry and scale-aware UV regions.

- Arm geometry is an independent axis: `wide-arm` or `slim-arm`.
- Texture density is an independent axis: initially `64` or `128` square texels.
- A concrete export profile binds both axes, such as `wide-arm-64` or `slim-arm-128`.
- Increasing texture density scales every UV rectangle but does not scale or otherwise change the body cuboids.
- The Studio renderer consumes engine-owned geometry instead of maintaining a second set of body proportions.
- Density conversion uses deterministic nearest-neighbor resampling. Upscaling does not claim to invent detail; downscaling warns that detail can be lost.
- Three-dimensional outer-layer presentation is a renderer capability, not evidence of a higher-density document.

Destination-specific names, claims, and evidence remain in the restricted compatibility dossier required by ADR 0006. They do not become engine, schema, UI, or provider identities.

## Consequences

- The engine and Studio can validate, edit, preview, import, and export `64x64` and `128x128` atlases with the same physical proportions.
- New density variants can reuse the same logical UV specification instead of copying coordinate tables.
- A new body geometry or truly different destination format still requires an explicit engine/profile change and conformance evidence.
- The Phase 5 generation evaluation remains locked to its precommitted `64x64` cases. Higher-density generation quality requires a separately versioned evaluation change; deterministic engine support alone is not evidence that a provider creates more detail.

