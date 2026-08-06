---
name: verify-voxl-studio
description: Run evidence-producing browser walkthroughs and review VOXL Studio behavior. Use for UI implementation or regression work, 2D/3D interaction claims, downloads, responsive checks, release sign-off, or any progress item whose completion depends on observed browser behavior.
---

# Verify VOXL Studio

Read `docs/VOXL_QUALITY_SYSTEM.md` and `references/evidence-contract.md` completely before running or judging a walkthrough.

1. Inspect `docs/VOXL_PROGRESS.md` and identify the exact claim to verify. Do not turn a broad phase into an implied pass.
2. Run the fastest deterministic checks that cover the changed behavior, then run `bun run check` before claiming repository-wide completion.
3. Start the documented localhost stack. Keep services on loopback and do not deploy an external site as part of verification.
4. Select the smallest committed journey that proves the claim:
   - `studio-smoke`
   - `transparent-edit-export`
   - `humanoid-2d-3d`
   - `humanoid-import-export`
5. Run `bun run qa:walkthrough <journey>`. Use `--headed` only when visible debugging is useful; do not replace semantic waits with arbitrary sleeps.
6. Inspect the full run directory, including `state.json`, step and error logs, the manifest, report, screenshots, and downloads. A generated report is evidence to review, not automatic proof.
7. Compare expected and observed behavior step by step. Record console errors, page errors, failed requests, missing downloads, blocked steps, and manual-only checks honestly.
8. Review visual evidence separately from capture. Apply the rubric in the reference, especially to WebGL orientation, transparency, pixel sharpness, and 2D/3D synchronization.
9. Update `docs/VOXL_PROGRESS.md` only when the artifact supports the exact checkbox or exit criterion. Otherwise record the remaining gap and keep it open.

Never infer interactive correctness from source inspection, a build, or unit tests alone. Preserve `.runs/` as disposable local evidence and do not commit run artifacts unless the user explicitly requests a curated fixture.
