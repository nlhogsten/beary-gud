# Generation method catalog

This catalog preserves every generation approach discussed so that the current hypothesis is visible without erasing alternatives. A method being documented does not mean it is selected, admitted, or implemented.

## Summary

| ID | Method | Creative output source | Expected role | Current status |
| --- | --- | --- | --- | --- |
| M0 | Manual and deterministic editing | User plus engine tools | Required refinement and fallback | Implemented in Studio |
| M1 | Procedural constructor | Engine-owned algorithms | Fixtures, simple patterns, safe fallback | Useful but not open-ended |
| M2 | LLM semantic parameters | Conversational model plus finite controls | Briefs and simple edits | Rejected as the sole creative vocabulary |
| M3 | LLM-authored safe render program | Multimodal conversational model plus engine feedback | Open-ended co-primary preflight path | **Test first** |
| M4 | Direct atlas image generation | Mainstream managed image model | Current preflight representation A | **Test first** |
| M5 | Canonical surface-sheet generation | Mainstream managed image model plus deterministic packer | Current preflight representation B | **Test first** |
| M6 | Concept or multiview then atlas | Image model pipeline plus deterministic or learned conversion | Fallback for reference consistency | Not selected |
| M7 | Mesh-conditioned retexturing | Managed 3D-aware texture API | Fixed-mesh fallback | Test only if M4/M5 fail |
| M8 | Specialized UV diffusion | UV-aware research or hosted model | High-consistency specialized fallback | Research only |
| M9 | Provider-side adaptation/fine-tuning | Managed provider tuned to VOXL examples | Later quality improvement | Requires measured need |
| M10 | VOXL-hosted custom model | VOXL-operated weights and accelerators | Last-resort research | Outside accepted architecture |
| M11 | Native chat-host generation | User-authorized host image capability | Optional client/provider path | Must meet the same evidence gates |

## M0 — manual and deterministic editing

The user paints, imports, converts density, applies palettes, copies regions, masks layers, and uses undo/redo in the deterministic Studio. This is not generative, but it is indispensable for refinement and graceful degradation when providers are unavailable.

**Keep:** exactness, editability, validation, and export do not depend on AI.

## M1 — procedural constructor

Engine code creates known forms such as fills, borders, stripes, gradients, palette substitutions, and repeatable synthetic fixtures.

**Strengths:** deterministic, cheap, testable, and useful for evaluation assets.

**Limit:** an ever-growing semantic art library would become a constrained character customizer rather than open-ended generation.

## M2 — LLM semantic parameters

An LLM emits fields such as garment colors, hair shape, motifs, and region choices. The engine interprets those fields.

**Strengths:** explainable and easy to validate.

**Limit:** creativity is bounded by the schema we implement.

**Decision:** use a small structured brief for orchestration, never as the complete visual vocabulary.

## M3 — LLM-authored safe render program

An LLM emits a versioned JSON render program containing bounded operations such as `fill`, `checker`, `stripes`, `copy-surface`, and `paint-texels`. VOXL executes the program deterministically, validates the resulting pixels, renders views, and may return those views and validation feedback for another model turn. Function calling lets a model request schema-defined application actions while the application remains the executor and policy authority. [OpenAI function-calling guide](https://developers.openai.com/api/docs/guides/function-calling)

The model does not need the engine source code or a fine-tune to begin. Each request supplies a compact, engine-owned tool contract: program kind/version, selected profile, valid surface names and dimensions, operation schemas, limits, the user's prompt and references, and—after an attempt—render/validation feedback. A small set of accepted examples may be cached with the system prompt. The per-texel operation is a universal output vocabulary: it can express any valid mapped texture, while the higher-level operations shorten common geometric patterns. The validated pixels remain the durable source of truth; the program and its hash are provenance.

**Strengths:** directly tests the Bash-character inspiration; keeps exact geometry and safety in the engine; uses a general managed multimodal API rather than a specialized model or VOXL GPU; supports deterministic correction loops; and is not constrained to a finite list of semantic character properties.

**Risks:** models may still struggle with dense composition, wraparound consistency, reference translation, long JSON, or preserving details across correction turns. The language is expressively open but does not guarantee that a model can author a good program. That is an evaluation question, not a reason to assume success or failure.

**Current contract:** `voxl.humanoid-skin.render-program/v1` is implemented offline with five operations, strict unknown-field rejection, local surface coordinates, operation/program/write budgets, deterministic execution, exact revision compositing, and no arbitrary JavaScript, shell, filesystem, network, environment, or model access. `bun run eval:render-programs` proves both `64` profiles expose every mapped texel and reproduce arbitrary fixture pixels exactly.

**Fine-tuning trigger:** do not fine-tune first. Consider provider-side adaptation only after a representative managed-model evaluation reveals a repeated, concentrated error pattern, prompt/tool-contract and feedback improvements plateau, and accepted program/correction pairs form a provenance-safe training set.

**Status:** co-primary preflight path alongside M4 and M5.

## M4 — direct upscaled-atlas image generation

The engine expands a `64x64` logical atlas to a model-visible generation canvas, supplies the exact atlas guide plus references, and asks a managed image model to edit within it. VOXL then block-reduces, restores invalid-region transparency, validates, and renders the result.

Current general APIs make this plausible rather than guaranteed. GPT Image 2 documents high-fidelity image inputs, multiple references, editing, masks, and flexible output sizes; masks remain prompt guidance rather than exact boundaries. [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation) Gemini 3.1 Flash Image documents multi-turn editing, 512px through 4K output, and multiple high-fidelity references. [Gemini image-generation guide](https://ai.google.dev/gemini-api/docs/image-generation)

**Strengths:** smallest integration and closest path to the final file.

**Risks:** face swaps, guide corruption, seams, misplaced features, and detail loss after reduction.

**Status:** current preflight representation A.

## M5 — canonical surface-sheet generation

The engine presents body surfaces as ordered, human-readable flat panels instead of the compact export atlas. A managed image model paints that sheet; deterministic code crops and packs each panel into the exact UV islands.

**Strengths:** visually intelligible input, deterministic packing, and less need for the model to learn an unusual atlas layout.

**Risks:** cross-panel consistency, separator corruption, and generation of perspective rather than flat texture.

**Status:** current preflight representation B.

## M6 — concept or multiview generation followed by atlas conversion

A general model first creates a coherent front/back or multiview concept. A second stage converts those views into surface panels or an atlas.

**Strengths:** good conversational reference synthesis and character identity.

**Risks:** errors compound across stages, rear and hidden surfaces must be invented, and a reliable converter is still required.

**Status:** fallback if direct static-template generation lacks reference or view consistency.

## M7 — managed mesh-conditioned retexturing

A managed texture service receives the fixed VOXL mesh and its UV coordinates, then produces a texture from text or image guidance. Meshy documents an `enable_original_uv` option and returns base-color texture maps. [Meshy Retexture API](https://docs.meshy.ai/en/api/retexture) Tripo documents fixed-geometry texture regeneration with prompts, style images, seeds, and model versions, although original-UV preservation and retention need clearer verification. [Tripo Texture API](https://developers.tripo3d.ai/en/docs/models-texture)

**Strengths:** the generator sees the real geometry and can reason across views.

**Risks:** 3D file integration, provider provenance and retention, higher-resolution PBR-oriented outputs, uncertain low-density pixel-art survival, outer-layer handling, and incomplete original-UV guarantees across providers.

**Status:** technically credible fallback, not the first experiment for a static cuboid mesh.

## M8 — specialized UV-aware diffusion

Research systems explicitly generate textures for supplied meshes:

- [TexFusion](https://research.nvidia.com/labs/toronto-ai/texfusion/) synchronizes diffusion across rendered views and produces a UV-parameterized texture.
- [TEXTure](https://arxiv.org/abs/2302.01721) progressively textures and edits existing shapes.
- [Text2Tex](https://arxiv.org/abs/2303.11396) chooses views and tracks generated texels to reduce inconsistent or stretched artifacts.
- [Paint3D](https://openaccess.thecvf.com/content/CVPR2024/papers/Zeng_Paint3D_Paint_Anything_3D_with_Lighting-Less_Texture_Diffusion_Models_CVPR_2024_paper.pdf) combines multiview projection with specialized UV inpainting and refinement.

**Strengths:** representation matches the research problem directly.

**Risks:** many implementations require local weights, GPUs, unclear commercial provenance, and an operations surface VOXL has explicitly deferred.

**Status:** evidence about useful pipeline design; not a production dependency.

## M9 — provider-side adaptation or fine-tuning

A managed provider is adapted with valid VOXL atlases, templates, renders, and preference data while the provider still operates the model infrastructure.

**Trigger:** only after a general managed method passes validation, latency, and cost gates but misses a concentrated quality threshold that adaptation can credibly address.

## M10 — VOXL-hosted custom model

VOXL trains or serves a specialized atlas or texture model.

**Potential:** maximum domain control.

**Costs:** data curation, licensing, training, GPU inference, security, deployment, observability, scaling, and model operations.

**Decision:** excluded by [ADR 0011](../../architecture/decisions/0011-managed-generation-apis-by-default.md) unless managed approaches fail, a new ADR is accepted, and explicit approval is given.

## M11 — native chat-host generation

A Codex, Claude, or other host may expose image generation using the user's host authorization. VOXL can treat it as another provider only when its model identity, reference handling, evidence capture, output retrieval, privacy, and reproducibility satisfy the same contracts. Host allowance is not assumed to cover VOXL server API use.

## Composition, not one permanent winner

The likely product combines methods by responsibility:

- M0/M1 for exact editing, fixtures, and fallback.
- M3, M4, or M5 for initial open-ended generation according to measured preflight results.
- The LLM in M3 can also produce the small M2 brief used for orchestration.
- Deterministic masks and compositing for revisions.
- M6 or M7 only for failure modes the simpler method cannot solve.
- M9 only after measured evidence, and M10 only after a separate architecture decision.
