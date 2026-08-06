---
name: run-voxl-generation-eval
description: Design, execute, and compare reproducible VOXL visual-generation experiments across provider adapters. Use for text/reference-image generation spikes, managed-API or host-native provider selection, candidate-quality comparisons, localized-revision preservation tests, API cost studies, and Phase 5 or later generation evidence.
---

# Run a VOXL generation evaluation

Read `references/evaluation-protocol.md` completely before collecting inputs or invoking a provider.

1. State the decision the evaluation must support and the thresholds that would change that decision.
2. Use only licensed, user-authorized, or synthetic references. Record provenance and hashes without placing destination branding in public engine identities or prompts committed to the repository.
3. Build a fixed case set before comparing providers. Phase 5 requires at least 30 cases spanning text-only, single-reference, multiple-reference, front/back, transparency, dense patterns, asymmetry, and difficult silhouettes.
4. Evaluate managed external APIs first. VOXL workers may orchestrate, validate, render, and persist, but must not host model weights or require GPUs. Treat local, notebook, rented-GPU, or self-hosted execution as separately approved research that requires a new ADR before becoming product architecture.
5. Call each model only through a provider adapter. Keep credentials, raw payloads, endpoints, and provider-specific retries outside the engine and its durable document schema.
6. Preserve every attempt as an immutable evaluation record: inputs, provider/model/configuration, seed when supported, timing, observable memory when available, cost, raw output, normalized candidate, validation, and output hashes.
7. Reject invalid candidates with deterministic engine validation before rendering or human preference scoring. Never repair one provider manually without recording the repair and applying an equivalent policy to all candidates.
8. Load valid candidates in the real studio and capture comparable atlas and rotated views with `$verify-voxl-studio`. Separate capture from visual judgment.
9. Score acceptance rate, prompt/reference fidelity, geometry consistency, protected-region preservation, editability, latency, cost, and provenance risk. Include failures and variance, not only best samples.
10. Run focused tests and `bun run check` for code changes. Record whether the evidence supports continuing, provider-side adaptation/fine-tuning, changing API providers, or stopping; do not promote a provider from a small aesthetic demo.
11. Update progress only with links or paths to the reproducible record and a plain statement of remaining uncertainty.

Research runs must not charge product entitlements. When the same provider later enters a paid path, generation must use asynchronous idempotent jobs: reserve once per client request ID, settle only after validated acceptance, and release on failure or cancellation.
