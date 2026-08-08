# VOXL product research and architecture

Research captured on August 4, 2026 and revised on August 5, 2026. Product policies, model availability, pricing, and external compatibility rules can change; recheck primary sources in the restricted compliance record before launch.

Read [the plain-language VOXL glossary](../reference/glossary.md) whenever a product, AI, graphics, service, or billing term is unfamiliar. For the generation approaches considered, the current hypothesis, and the experiment order, start with [generation research](generation/README.md).

## Decision summary

VOXL should be developed as a componentized AI-native asset studio with a web service and optional chat clients. The first new asset engine, `voxl-humanoid-skin`, produces valid cuboid-humanoid texture atlases in wide/slim `64` and `128` export profiles. The existing Bash-derived `transparent-character` workflow remains a first-class engine rather than being replaced or forced into the humanoid-skin schema.

The product does not need a custom 3D generative model to begin. Three systems that have different jobs must not be conflated:

1. **Conversation and reasoning:** Codex or Claude interprets natural language and reference images, produces a structured character brief, chooses editing operations, and explains results.
2. **Skin construction:** Deterministic code, optionally supplied with creative output from a hosted provider API, creates a valid profile-selected RGBA texture atlas.
3. **3D preview:** A conventional browser renderer wraps that 2D texture around fixed cuboid-humanoid geometry. It displays the skin; it does not invent the character.

The intended VOXL humanoid-skin generator is generative-first and multimodal: text, reference images, an existing skin, masks, sketches, palettes, and future input types can condition full pixel synthesis. Structured fields such as hair color are optional control metadata, not the vocabulary or limit of creation. A procedural constructor remains useful as a test fixture and fallback, but it is not the long-term creative core.

The Phase 5 generation path is API-first. VOXL should call hosted multimodal and image-generation providers through replaceable adapters; it should not rent GPUs, operate model-serving infrastructure, or make a downloadable checkpoint part of the production architecture. The current hypothesis compares a mainstream managed multimodal LLM authoring a safe engine render program with managed image models using an upscaled atlas or canonical surface sheet. A specialized downloadable checkpoint may remain optional comparative research, but it is not a delivery dependency. The [generation research index](generation/README.md) is authoritative when this broader product record and the active experiment differ.

## Target-neutral naming policy

VOXL's product architecture must never use an external application, game, platform, publisher, or model brand as the identity of an artifact engine. Names describe the visual object and its geometry:

- Engine: `voxl-humanoid-skin`.
- Document kind: `voxl.humanoid-skin/v1`.
- Export profiles: `wide-arm-64`, `slim-arm-64`, `wide-arm-128`, and `slim-arm-128`.
- Renderer capability: `cuboid-humanoid-renderer`.
- Provider capability: `template-image-generation`, regardless of the model used behind it.
- Package: `engine-voxl-humanoid-skin`.

This rule applies to package names, API and MCP schemas, database values, prompts, fixtures, logs, analytics, UI labels, plugin metadata, public copy, and source documentation. Compatibility with an external destination belongs behind a neutral export-profile adapter and conformance test. It does not fork or rename the artifact engine. Target- and publisher-specific research belongs in a restricted legal/compliance record outside the product namespace and is not copied into product-facing repository documentation.

## The central mental model

A VOXL humanoid skin is not a generated 3D mesh. Its character body already exists as fixed cuboid geometry. The skin is a small 2D PNG whose pixel regions map to the head, torso, arms, and legs. The 3D viewer folds that fixed UV atlas around the fixed body.

```text
User prompt + optional reference image
                  |
                  v
        Codex or Claude (the brain)
        - understands the request
        - extracts colors and features
        - decides what must be preserved
                  |
                  v
   Multimodal generation request and optional controls
                  |
                  v
       Skin constructor (the hands)
       - generative provider for open-ended synthesis
       - procedural provider only as fallback/fixture
                  |
                  v
       Valid profile-selected RGBA skin PNG
             /                \
            v                  v
   3D browser preview      2D pixel editor
            \                  /
             v                v
          revisions, validation, download
```

Codex and Claude are still heavily leveraged. They provide the natural-language interface, image understanding, planning, selective-edit reasoning, and tool orchestration. The deterministic code provides precision that a general LLM or image model cannot guarantee.

This is analogous to asking an LLM to edit a spreadsheet: the LLM decides what should change, while spreadsheet code performs exact cell operations. The spreadsheet library is not a replacement for the LLM. A skin library has the same relationship to the conversational model.

## Open-ended inputs and structured controls

The hosted engine should not accept only a closed character-customizer schema. Its primary request contains raw multimodal inputs:

```ts
type GenerationRequest = {
  engineId: string;
  prompt: string;
  references: FileReference[];
  existingDocument?: AssetDocumentReference;
  editMask?: FileReference;
  preserveMasks?: FileReference[];
  desiredOutputs: string[];
  controls?: Record<string, unknown>;
};
```

`references` may contain photos, drawings, palettes, textures, existing skins, sketches, or future supported file types. The generative provider consumes their pixels or embeddings directly. It does not need a programmer to anticipate concepts such as moss, asymmetric armor, spiral patterns, galaxy gradients, or a symbol continuing around the back.

`controls` provides optional reproducibility and editing hints such as model type, seed, preserve constraints, or a known semantic region. Those controls improve precision; they do not define the set of things the model can create.

After generation, semantic masks and descriptions become a control plane for revision. A complex generated asset can be analyzed into regions such as face, hair, armor, cloak, emblem, or outer layer. The user can then request a localized edit while the system sends the existing asset, a mask, the edit instruction, and preservation constraints back to an image-editing provider.

The product is open-ended within the physical capacity of the selected visual profile. A `64x64` atlas has a small pixel budget split across UV faces; a `128x128` atlas has four times as many texels over the same geometry. Higher density creates room for finer authored or generated texture detail, but deterministic upscaling alone only repeats existing pixels. The selected profile remains a creative constraint; a VOXL feature catalog should not be.

## Resolution and geometry finding

Research found that texture density, arm geometry, and 3D outer-layer presentation are separate concerns. The engine therefore owns one logical UV layout that scales by density while retaining exact model-unit proportions. VOXL initially supports `64x64` and `128x128` atlases for both wide and slim arms. A renderer may visually extrude an outer layer without changing either atlas density or document meaning.

The source links and destination names supporting these conclusions live in the [restricted compatibility dossier](../compliance/destination-compatibility.md), as required by the target-neutral naming policy. Deterministic support is not a compatibility promise for every destination path, and it is not evidence that the eventual managed generation provider produces worthwhile higher-density detail.

## What Codex subscription compute can and cannot do

Codex can:

- Read an attached reference image.
- Interpret a text request and convert it to structured data.
- Run local plugin scripts that assemble, modify, validate, and export a skin.
- Use built-in image generation with reference images. OpenAI currently states that built-in image generation uses the user's general Codex allowance.
- Call an authenticated remote MCP service when durable accounts, storage, cross-device history, or VOXL-metered hosted API generation is needed.

Codex does not give a third-party backend a general token that lets that backend make arbitrary model API calls against the user's ChatGPT subscription. The work has to occur inside the Codex turn through available native tools, or the external service must pay for and meter its own hosted-provider API calls.

This produces two different uses of the word "credit":

- **OpenAI/Anthropic usage:** consumed by the user's conversation and native tools.
- **VOXL product credits:** entitlements for VOXL application services and external provider API usage paid by VOXL.

They are separate systems. VOXL should not pretend that a user's ChatGPT or Claude subscription automatically pays for API calls made by the standalone VOXL service.

Relevant sources:

- [OpenAI image generation in ChatGPT and Codex](https://learn.chatgpt.com/docs/image-generation)
- [OpenAI plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [OpenAI MCP server and UI architecture](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Anthropic: Claude can analyze but does not natively produce raster images](https://support.claude.com/en/articles/9002504-can-claude-produce-images)

## Three viable compute designs

### Option A: local/BYO reasoning with deterministic construction

```text
Codex or Claude subscription
  -> understands prompt/reference
  -> emits CharacterBrief and edit operations
  -> runs bundled local skin code
  -> exports PNG locally
```

VOXL hosts no model and pays no generation bill.

Advantages:

- Lowest operating complexity and cost.
- Private by default because references and skins can remain local.
- Demonstrates the conversational workflow immediately.
- Works in both Codex and Claude because both can reason about images and run code.

Limitations:

- A template/parts library may produce less faithful likenesses.
- Local skills and scripts are copied to the user's machine, so they are difficult to protect or meter.
- Results can differ across host models and product surfaces.
- Claude has no native raster image generator, so only reasoning and procedural construction are portable there.

Best use: deterministic testing, offline/manual editing, a free local tier, and fallback behavior. It is not the intended answer for open-ended high-fidelity generation.

### Option B: hybrid native reasoning plus hosted provider APIs

```text
Codex or Claude subscription
  -> understands the request and prepares a canonical brief/preview
  -> calls VOXL MCP
VOXL service
  -> calls a hosted generation or image-editing API when needed
  -> performs deterministic atlas construction, validation, and storage
  -> returns a validated PNG and editor state
```

VOXL pays only for the part that must be consistent across hosts.

Advantages:

- Preserves substantial use of the customer's existing AI subscription.
- Gives VOXL a server-controlled capability that can be authenticated and metered.
- Provides consistent skin validity, accounts, history, and cross-device projects.
- Supports both Codex and Claude through the same remote MCP contract.

Limitations:

- More infrastructure than the local proof of concept.
- The handoff format between the host LLM and VOXL must be tightly specified.
- Quality and behavior can vary across provider APIs and must be normalized behind the adapter.

Best use: the likely commercial architecture after product validation.

### Option C: standalone VOXL generation through hosted APIs

```text
Any web or chat client
  -> sends prompt and references to VOXL
VOXL service
  -> calls external multimodal/image APIs through provider adapters
  -> constructs, validates, stores, and exports the skin
```

Advantages:

- Most consistent experience across web, Codex, ChatGPT, Claude, and future clients.
- Straightforward VOXL usage metering.
- The model pipeline and prompts remain server-side.

Limitations:

- Highest provider-API cost and application-service burden.
- Requires upload privacy, retention, moderation, and abuse controls.
- Duplicates some capabilities users already pay for in their AI subscriptions.

Best use: only when tests show that consistent quality is worth the additional complexity.

## Recommended sequence

Do not build or rent GPU infrastructure. Prove the experience in this order:

1. Define the shared engine contract and extract the existing workflow as `transparent-character` without changing its behavior.
2. Build a deterministic `voxl-humanoid-skin` document, validator, renderer, editor, and exporter.
3. Create a fixed multimodal evaluation set with complex text and image references.
4. Build the bounded safe render-program interpreter plus the upscaled-atlas and canonical-surface-sheet transforms offline; compare them with deterministic fixtures.
5. Run the capped three-path preflight through compatible admitted API-accessible multimodal and image providers, then advance only a passing path to the full fixed case set.
6. Connect only a fully evaluated hosted provider behind the `voxl-humanoid-skin` engine and add creation followed by localized generative edits.
7. Test the complete generation and refinement loop with users.
8. Add durable accounts, remote MCP, and billing only after the loop is useful.
9. Recheck provider pricing, terms, retention, provenance, and model availability before any production admission.

This order protects the current product, avoids constraining VOXL to templates, and keeps VOXL focused on its artifact engine and application services rather than model-serving infrastructure.

## Componentized artifact-engine architecture

VOXL must distinguish an **artifact engine** from a **generation provider**.

- An artifact engine knows a visual format and its lifecycle: document schema, supported inputs, validation, editing, rendering, and export.
- A generation provider supplies creative compute through Codex-native tools, an external hosted API, a procedural fallback, or a future API-accessible provider.
- A renderer presents an engine document. It is not itself the generator.

The same provider can support several engines, and one engine can choose among several providers.

```text
Shared VOXL platform
  projects / files / versions / jobs / auth / entitlements / MCP
                              |
                         Engine registry
                    /                         \
                   v                           v
   transparent-character engine    voxl-humanoid-skin engine
   - character.json + frame grids      - 64x64 RGBA + semantic masks
   - animation validator               - UV/model validator
   - PNG/APNG/MOV renderer             - 2D/3D renderer and editor
   - Bash safe importer            - profile-valid PNG exporter
                   \                           /
                    v                         v
                     Generation providers
          native host / hosted API / procedural fallback
```

An engine contract should be capability-driven so future engines can omit features they do not need:

```ts
interface AssetEngine<TDocument> {
  id: string;
  version: string;
  capabilities: EngineCapabilities;

  create(request: GenerationRequest): Promise<EngineJob<TDocument>>;
  revise(request: RevisionRequest<TDocument>): Promise<EngineJob<TDocument>>;
  validate(document: TDocument): Promise<ValidationResult>;
  render(document: TDocument, options: RenderOptions): Promise<RenderedArtifact[]>;
  export(document: TDocument, format: string): Promise<ExportedArtifact>;
}
```

The contract must not require every engine to share one document schema or pretend every asset is a skin. Engine-specific packages own their types and migrations. Shared platform records refer to documents through `engineId`, `engineVersion`, and a typed document reference.

Initial engine IDs:

- `transparent-character`: the current Bash-derived transparent pixel animation system and Premiere-ready exports.
- `voxl-humanoid-skin`: multimodal generation, revision, validation, 2D/3D editing, and `wide-arm-64`/`slim-arm-64` PNG export.

Possible future engines include voxel props, animated sprites, texture packs, other avatar geometries, or video-overlay characters. Adding one should require registering an engine package and its UI module, not changing all existing engines.

## Proposed skin document

The durable product object should be a PNG plus a structured sidecar rather than the current palette-symbol animation grid.

```json
{
  "formatVersion": 1,
  "profile": "wide-arm-64",
  "texture": "skin.png",
  "palette": ["#24170f", "#b82332", "#f2c6a0"],
  "regions": {
    "hair": { "mask": "masks/hair.png" },
    "face": { "mask": "masks/face.png" },
    "jacket": { "mask": "masks/jacket.png" }
  },
  "references": [],
  "operations": [],
  "versions": []
}
```

The exact schema is still exploratory. Important properties are:

- Fixed 64x64 RGBA output.
- Explicit `wide-arm-64`/`slim-arm-64` export-profile selection.
- Base and outer/overlay layers.
- Semantic masks for controlled revisions.
- Version history so edits can preserve or restore regions.
- Provenance and retention metadata for uploaded references.

Example operations:

- Recolor only the jacket.
- Replace the hair while preserving the face.
- Mirror one sleeve to the other.
- Add or remove the outer-layer hood.
- Convert `wide-arm-64` geometry to `slim-arm-64` geometry.
- Restore the shoes from a previous version.

## Generation approaches

### Procedural constructor

The LLM emits fields such as hairstyle, skin tone, top, pants, shoes, accessories, palette, and shading style. Deterministic code chooses or combines compatible parts and writes them into known UV regions.

This approach is highly controllable but creatively limited. Keep it for fixtures, deterministic examples, offline fallback, and possibly simple starter assets. Do not make it the main generator for the open-ended product vision.

### LLM-authored safe render program

A multimodal LLM can receive an abstract prompt, reference images, images without text, a compact description of the chosen engine profile, and a strict JSON tool schema. It then authors complete surface-local pixel grids using compact palette indexes. VOXL validates and executes that data, renders the result, and may return the images and validation issues for up to two correction turns.

This is closer to the original Bash-character experiment than a finite semantic constructor. Dense grids can express any valid mapped texture, so new visual themes do not require adding a new `hairStyle` or `armorType` field. Sparse texel writes handle localized changes; fill, copy, checker, and stripe helpers merely compress uniform or tiny repeated sub-patterns and may never be used. The LLM does not execute source code, and it does not need fine-tuning to begin: each request supplies the versioned tool contract and fixed examples. Fine-tuning is considered only after measured repeated failures and a provenance-safe set of accepted corrections exist.

### Direct image generation

Asking a general image model to emit a finished UV atlas in one step has material risks: it may place body parts in the wrong coordinates, blur pixel edges, fill unused transparent regions, or make front and back inconsistent. Current multimodal image models may nevertheless be capable enough on fixed templates that this should be measured rather than dismissed.

The current first experiment therefore compares safe render-program authorship, direct generation on an upscaled exact atlas, and generation on a canonical flat surface sheet that VOXL packs deterministically. Native host generation may also participate where it exposes a reproducible provider contract, but a user's host subscription is not assumed to authorize VOXL server usage. See the [method catalog](generation/method-catalog.md) and [fixed experiment gates](generation/experiment-plan.md).

### Hosted-provider research snapshot

Research rechecked August 5, 2026 supports an API-first Phase 5 evaluation. Provider names below are research facts and provenance metadata, not VOXL component identities. Prices, terms, retention, model names, and feature limits are point-in-time observations that must be rechecked from primary sources before each evaluation and before any production admission. **A first conditional evaluation candidate is identified below, but no provider is admitted and no API call is authorized.**

| Hosted candidate | Documented controls relevant to VOXL | Point-in-time price and data/provenance notes | Decisive unknowns |
| --- | --- | --- | --- |
| OpenAI GPT Image API | The direct Image API supports generation, editing, as many as 16 input images, an explicit mask, and high-fidelity reference processing. A fixed `gpt-image-2-2026-04-21` snapshot exists. Masks guide the model but are not exact pixel boundaries, so VOXL's deterministic preservation check remains mandatory. | A medium-quality 1024×1024 output was listed at $0.053 before input tokens. Image generation/edit endpoints had no application-state retention, up to 30-day abuse-monitoring retention by default, and Zero Data Retention eligibility subject to documented exceptions. [Model snapshot](https://developers.openai.com/api/docs/models/gpt-image-2), [generation, editing, masks, and cost](https://developers.openai.com/api/docs/guides/image-generation), [data controls](https://developers.openai.com/api/docs/guides/your-data) | Exact atlas validity, multi-view consistency, pixel-art survival after normalization, protected-region fidelity, lack of transparent-background output in this model, and the unresolved absence of a model-specific licensed-source inventory. |
| Google Gemini 3.1 Flash Image | Text plus multiple references, including documented fidelity for up to ten objects and four characters; multi-turn editing; fixed output sizes and aspect ratios. It does not document an explicit edit-mask input. | Output equivalents were $0.045/$0.067/$0.101/$0.151 for 0.5K/1K/2K/4K before input and reasoning charges. Paid content is not used for product improvement; ordinary paid use still has limited abuse-monitoring retention unless project zero-data-retention controls are approved and stateful storage is disabled. Current Gemini API terms also prohibit API clients directed toward or likely accessed by anyone under 18, which is a material product-fit constraint. Generated images include SynthID. [Image API](https://ai.google.dev/gemini-api/docs/image-generation), [model card](https://deepmind.google/models/model-cards/gemini-3-1-flash-image/), [pricing](https://ai.google.dev/gemini-api/docs/pricing), [zero-data-retention controls](https://ai.google.dev/gemini-api/docs/zdr), [terms](https://ai.google.dev/gemini-api/terms) | Protected-region preservation without a mask, front/back consistency, pixel-art survival, and whether VOXL would be an adult-only product. |
| Google Vertex Imagen 3 editing/customization | Masked editing plus subject, style, face-mesh, edge, and sketch controls through a hosted API. | Generation, editing, and customization were listed at $0.04 per image. Regional processing and Google Cloud governance are available; access and current model lifecycle still require verification. [Subject customization](https://cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization), [mask editing](https://cloud.google.com/vertex-ai/generative-ai/docs/image/edit-images-overview), [pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing) | Project-access friction, intended-use limits, product-angle preservation, and whether its controls improve atlas acceptance. |
| Black Forest Labs FLUX.2 hosted API | General semantic editing with up to eight API reference images, up to 4MP output, flexible aspect ratios, pose/layout guidance, and structured prompts. A separate hosted Fill endpoint accepts an image and mask. | FLUX.2 `[pro]` began at $0.03/MP for generation and $0.045/MP for editing; `[max]` began at $0.07/MP; Fill was $0.05/image. Self-serve API terms granted broad input/output use including model improvement; enterprise materials advertised zero data retention. [Editing](https://docs.bfl.ai/flux_2/flux2_image_editing), [pricing](https://docs.bfl.ai/quick_start/pricing), [API terms](https://bfl.ai/legal/flux-api-service-terms), [enterprise controls](https://bfl.ai/enterprise) | Whether commercial privacy terms are acceptable, whether a separate masked-edit endpoint preserves identity, and whether embedded provenance is available. |
| Adobe Firefly Services | Hosted text generation with structure and style references, plus explicit grayscale masks for fill, expand, and compositing workflows. The current Image Model 5 generation API uses `/v4/images/generate-async`, but Adobe says it does not expose explicit model versioning. | Public per-operation pricing was not located; access and billing are enterprise-oriented. Adobe states that foundational Firefly uses licensed content such as Adobe Stock plus copyright-expired public-domain content, does not train on customer content, and does not mine the web for training. Its security fact sheet documents 24-hour reference retention and 90-day prompt/configuration retention. [Training-data approach](https://www.adobe.com/ai/overview/firefly/gen-ai-approach.html), [Image Model 5 API changes](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/breaking-changes), [structure reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/structure-image-reference/), [style reference](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/style-image-reference/), [masking](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/masking/), [security fact sheet](https://www.adobe.com/cc-shared/assets/pdf/trust-center/ungated/whitepapers/creative-cloud/adobe-firefly-services-security-fact-sheet.pdf) | No immutable model snapshot, exact price and startup access, explicit acceptance of retention, current create/revise parity, and consistency when reference roles exceed one style plus one structure image. |
| Ideogram hosted API | One-image remix in version 4; version 3 documented masked editing, multiple style-reference files, one character reference, and transparent generation. | Version 4 generation was $0.03-$0.10/image; version 3 character-reference generation was $0.10-$0.20; prompt-only editing was $0.20. API terms said inputs/outputs were not used for training except policy-flagged content, but did not state a fixed retention period and required product attribution. [API overview](https://developer.ideogram.ai/), [masked edit](https://developer.ideogram.ai/api-reference/api-reference/edit-v3), [transparent generation](https://developer.ideogram.ai/api-reference/api-reference/generate-transparent-v3), [pricing](https://ideogram.ai/api-pricing/), [API terms](https://ideogram.ai/legal/api-tos) | Current-version reference parity, fixed retention, embedded provenance, and character consistency across front/back views. |
| Stability AI Platform API | Explicit masked or alpha-channel inpaint, erase, outpaint, background removal, object replacement, and single structure/style controls. General multi-reference composition was not documented. | Stable Image Core was $0.03, Ultra $0.08, inpaint $0.05, and style transfer $0.08. Training use could be opted out, while the public privacy policy gave no fixed retention duration. No official embedded provenance mechanism was located. [API reference](https://platform.stability.ai/docs/api-reference), [pricing](https://platform.stability.ai/pricing), [privacy policy](https://stability.ai/privacypolicy), [training opt-out](https://kb.stability.ai/knowledge-base/opt-out-of-data-training-for-platform-api) | Multi-view identity consistency, fixed retention, provenance, and whether strong masked editing compensates for limited multi-reference generation. |

The smallest useful comparison is not a provider beauty contest. It is a fixed-case evaluation of concept fidelity, multi-reference/front-back consistency, deterministic atlas acceptance, protected-region difference during localized edits, latency, cost per accepted asset, and provenance/privacy risk. Research runs must use synthetic, licensed, or user-authorized references and must not consume product entitlements.

#### First conditional API candidate

The first engineering candidate is the direct OpenAI Image API with the pinned `gpt-image-2-2026-04-21` snapshot, PNG output, 1024×1024 size, and medium quality. It is conditional because VOXL's dossier approves commercial use, fixed model identity, synthetic-evaluation reference use, and synthetic-evaluation retention, while leaving dataset provenance pending. OpenAI's official training-data summary describes broad source categories and includes copyrighted material but does not publish a model-specific licensed-source inventory. A human legal/product decision must either accept that disclosure and the contractual protections for this research run or preserve the stricter gate and decline admission. The gate must not be silently weakened.

The first paid shakedown, if and only if compatible candidates are later admitted and the user explicitly authorizes them, is the generation-path preflight defined in the [current experiment plan](generation/experiment-plan.md): the same eight locked cases across a safe render program and two image representations, with a combined USD 5 complete-run hard cap including retries. It is only a feasibility screen and cannot support a provider-quality conclusion. The full locked image protocol still requires 140 outputs and, for the recorded candidate pricing, had a medium-quality output floor of about $7.42 before input tokens.

Official evidence retained for the conditional candidate:

- [GPT Image 2 model identity and pinned snapshot](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Image generation, editing, masks, reference handling, and cost calculation](https://developers.openai.com/api/docs/guides/image-generation)
- [Image edits API reference](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [API retention and data controls](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI Services Agreement, effective January 1, 2026](https://cdn.openai.com/osa/openai-services-agreement.pdf)
- [Official training-data summary](https://help.openai.com/en/articles/20001044-training-data-summary-pursuant-to-california-civil-code-section-3111.jar)
- [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)

The strict dataset-origin gate remains in force. Adobe Firefly Services is now catalogued as `preview-to-atlas-provenance-api`, a metadata-only pending candidate, because Adobe publicly describes licensed and public-domain training sources, customer-content isolation, and commercial protections. That does not make it runnable: the current Image Model 5 API exposes no immutable model snapshot, the 90-day prompt/configuration and 24-hour reference retention need explicit product/privacy acceptance, enterprise entitlement and exact pricing are unverified, and the manifest intentionally advertises creation only until current localized-revision parity is proven. [Firefly generative-AI approach](https://www.adobe.com/ai/overview/firefly/gen-ai-approach.html), [Image Model 5 API changes](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/breaking-changes), [commercial output and customer-content treatment](https://business.adobe.com/content/dam/dx/us/en/resources/sdk/adobe-firefly-data-and-content-usage/adobe-firefly-data-and-content-usage.pdf), [security and retention](https://www.adobe.com/cc-shared/assets/pdf/trust-center/ungated/whitepapers/creative-cloud/adobe-firefly-services-security-fact-sheet.pdf)

Other decisive shortlist findings remain negative or conditional: FLUX.2 self-serve terms grant broad input/output rights including model training; Ideogram has narrower current reference roles, attribution, and unresolved fixed retention; Stability has limited general multi-reference composition, opt-out training, and indefinite needs-based retention. Sources: [FLUX.2 editing](https://docs.bfl.ai/flux_2/flux2_image_editing), [BFL pricing](https://docs.bfl.ai/quick_start/pricing), [BFL API terms](https://bfl.ai/legal/flux-api-service-terms), [Ideogram API](https://developer.ideogram.ai/ideogram-api/api-overview), [Ideogram pricing](https://ideogram.ai/api-pricing/), [Ideogram API agreement](https://ideogram.ai/legal/api-tos), [Stability privacy](https://stability.ai/privacypolicy), [Stability training opt-out](https://kb.stability.ai/knowledge-base/opt-out-of-data-training-for-platform-api).

### Optional specialized preview-to-atlas checkpoint research

March 2026 research separates the task into:

1. Character reference to a standardized front/back cuboid-humanoid preview.
2. Preview to a 64x64 UV atlas with a specialized image-to-image model.
3. Deterministic downsampling and structure enforcement.

The published candidate checkpoint is a 4-billion-parameter image-to-image model. Its model card labels it Apache 2.0 and describes approximately 13 GB of VRAM for its base. It is not currently deployed by a standard Hugging Face inference provider. That makes it optional research rather than an API-accessible production candidate.

Research recheck (August 5, 2026): the paper page still describes a two-stage preview-to-atlas pipeline, and the candidate model card now identifies its `v0.6` checkpoint as a 4-billion-parameter image-to-image model aligned with the base model's standard pipeline. The specialized checkpoint still reports no hosted inference provider even though the general base model has hosted options. A base-model endpoint is therefore not evidence that the specialized decoder can be called as an API. These are capability and deployment findings only; no VOXL quality, latency, cost, or commercial-provenance gate has passed.

These findings are worth preserving because the two-stage technique may provide a useful comparison target. They do not authorize renting compute, building an endpoint, adding model-serving infrastructure, or coupling the checkpoint to the engine contract. Any future checkpoint experiment would require a separate scoped decision; Phase 5 should proceed with hosted APIs even if that experiment never occurs.

Sources retained without turning third-party names into VOXL component identities:

- [Preview-to-atlas research paper](https://arxiv.org/abs/2603.03964)
- [Candidate checkpoint and example inference](https://huggingface.co/AliceKJ/BLOCKv0.6)
- [Base model card and license](https://huggingface.co/black-forest-labs/FLUX.2-klein-base-4B)

Commercial use requires a separate provenance review. A model license alone does not settle training-data or third-party-rights questions. Target-specific datasets and conformance sources must be reviewed in the restricted compliance record rather than named in product architecture.

## 3D preview and editing

VOXL does not need to train or generate a 3D body. The body geometry is fixed. A browser renderer loads the 64x64 PNG as a texture and maps its UV regions onto cubes representing the head, torso, arms, and legs.

The implementation should place any permissively licensed viewer library behind `cuboid-humanoid-renderer`. The adapter must support base and overlay rendering, both export-profile geometries, and animations without leaking an external target name into product code. Direct painting requires raycasting that converts a clicked 3D face back to the corresponding texture pixel.

Implementation checkpoint (August 5, 2026): the studio uses Three.js 0.185.1 behind that adapter. The package is MIT-licensed; VOXL owns the cuboid assembly, neutral profile geometry, per-face atlas mapping, and click-to-pixel conversion. Three.js remains a replaceable renderer dependency rather than an engine or document contract. The implementation follows the library's raycasting model, where pointer coordinates produce intersections whose UV coordinates are converted back into atlas pixels.

Primary references:

- [Three.js repository and MIT license](https://github.com/mrdoob/three.js)
- [Three.js Raycaster documentation](https://threejs.org/docs/#api/en/core/Raycaster)
- [Three.js texture constants and nearest-neighbor filtering](https://threejs.org/docs/#api/en/constants/Textures)

The editor should support:

- Rotate and zoom.
- `wide-arm-64`/`slim-arm-64` profile selection.
- Base/overlay visibility.
- Body-part visibility.
- Pencil, eraser, fill, color picker, and palette tools.
- 2D atlas and 3D views that remain synchronized.
- Semantic region selection.
- Undo/redo and named versions.
- Side-by-side comparison.
- Profile-valid PNG download.

## Chat plugin and MCP boundary

An installable plugin can contain:

- A skill that teaches Codex or Claude the VOXL workflow.
- Local scripts for deterministic transformations and export.
- A remote MCP connection for authenticated VOXL tools.
- Optional MCP Apps UI where the host supports interactive components.

The MCP server should expose small, explicit tools rather than one opaque `do_everything` call:

- `create_skin`
- `revise_skin`
- `get_skin`
- `render_skin_preview`
- `validate_skin`
- `export_skin`
- `get_generation_status`

Long generation should return a job ID and be polled rather than holding one tool call open. Data-processing tools should be separate from the final render/editor tool so a component is mounted only when visual interaction is helpful.

Authoritative projects, accounts, entitlements, and version history belong on the VOXL service. Temporary camera position, selected tool, and open panels belong in the UI.

Optional MCP UI is a companion to the standalone VOXL studio, not a hosted copy of the whole product and not another backend. It authenticates the same account and calls the same application services over the remote MCP/API boundary. Assets edited in chat and on the website therefore share project IDs and immutable version history. Hosts without interactive UI still use the underlying tools.

Sources:

- [OpenAI plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [OpenAI: add UI to an MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)
- [OpenAI: build an MCP server](https://developers.openai.com/plugins/build/mcp-server)
- [OpenAI plugin submission process](https://developers.openai.com/plugins/deploy/submission)
- [Anthropic remote MCP support](https://www.anthropic.com/news/claude-code-remote-mcp)
- [Anthropic plugin creation](https://code.claude.com/docs/en/plugins)
- [Anthropic plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

## Monetization findings

OpenAI's current public-plugin policy is a major product constraint:

- Plugins may conduct commerce only for physical goods.
- Digital services, subscriptions, digital content, tokens, and credits cannot be sold directly or indirectly through the plugin.
- A user may sign in to an existing paid account and access features already purchased elsewhere.
- The plugin may not present plans, start a subscription, or promote an upgrade.

Therefore the web product must own pricing and checkout. The public plugin can authenticate existing customers, but it cannot be treated as the paid checkout funnel while this policy remains in force.

OpenAI also says public submissions must be complete and reliable; trial or demo plugins are not accepted. VOXL should use local/private marketplace installation during development and submit only after the underlying service is production-ready.

Claude Code can install plugins from public or private Git repositories. Because installed plugin files are copied to a local cache, private-repository access is useful for distribution but is not strong usage metering or durable copy protection.

Sources:

- [OpenAI plugin commerce and monetization rules](https://developers.openai.com/plugins/app-guidelines#commerce-and-monetization)
- [OpenAI checkout documentation](https://developers.openai.com/plugins/build/monetization)
- [Anthropic marketplace distribution and private repositories](https://code.claude.com/docs/en/plugin-marketplaces)

Potential VOXL model:

- Free manual editing, preview, validation, and local export.
- Paid creation sessions purchased on the VOXL website.
- A session includes initial candidates and a bounded number of conversational revisions rather than charging for every pixel edit.
- Existing paid users connect the plugin through OAuth.
- Native host-model generation reduces VOXL costs where available; standalone generation through a VOXL-paid external API consumes a VOXL entitlement.

Pricing should not be fixed before measuring actual hosted-provider cost per accepted asset and user-perceived value.

## Competitor findings

The category is validated but crowded. The generator alone is not a sufficient differentiator.

The reviewed tools commonly offer text or photo generation, browser 2D/3D editing, direct 3D painting, layers, geometry variants, downloadable PNGs, libraries, and credit-based usage. The implications are:

- Reference conversion plus an editor already exists.
- Basic AI generation is becoming a commodity.
- Cross-profile compatibility claims require independent conformance testing.
- VOXL needs a stronger conversational refinement and preservation experience.

The likely differentiation is:

- Conversation-native revisions rather than one-shot generation.
- Precise preservation: "change only the coat; keep the face and hair."
- Valid export on every version.
- Persistent versions and semantic regions.
- The same project accessible from a web editor and multiple AI-chat clients.
- Private-by-default reference handling.

Competitor features and prices are point-in-time observations from public pages, not an independent quality or business audit. Target-specific product names and links are intentionally excluded from the product architecture; maintain them only in the restricted market/legal research record.

## External compatibility and brand boundary

The first release needs independently verified compatibility with each supported destination, but destination identity must not become VOXL architecture. The durable object is a `voxl-humanoid-skin`; `wide-arm-64` and `slim-arm-64` adapters encode geometry and export constraints.

Do not place destination or publisher names in engine IDs, package names, schemas, database enums, tool names, prompts, UI labels, fixtures, analytics events, plugin metadata, or repository-facing documentation. Public launch copy should describe VOXL's own visual formats and state generically that VOXL is independent and unaffiliated with external destination platforms or publishers.

Exact compatibility instructions, destination-specific test procedures, trademark requirements, and primary-source links belong in access-controlled legal/compliance records. Release engineering can execute those procedures through neutral conformance-test IDs without exposing destination branding to the engine. A trademark and domain review is still required before committing to the VOXL name.

This separation is an engineering and branding precaution, not a substitute for qualified legal review.

## Privacy, children, and reference images

Avatar-creation tools can attract a substantial youth audience. Uploaded photos can contain personal information, faces, and metadata. Initial product design should minimize collection rather than postponing privacy work.

Recommended starting posture:

- Target adult creators during the first private beta.
- Do not launch a public gallery initially.
- Strip image metadata.
- Delete original references after a short documented period unless the user explicitly saves them.
- Do not train on uploads by default.
- Require explicit opt-in for any future training use.
- Provide deletion controls for projects and source images.
- Add moderation and reporting before public sharing.
- Obtain qualified legal review before intentionally serving children.

COPPA can apply to child-directed commercial services collecting personal information from children under 13. The UK Children's Code can apply to online services likely to be accessed by under-18s even when children are not the stated target audience.

Sources:

- [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [ICO introduction to the Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/)

This document records product research and is not legal advice.

## How the current repository fits

The current studio should remain functional while VOXL is explored. Reusable concepts include:

- Pixel painting.
- Palettes and color picking.
- Undo/redo.
- Browser-local drafts.
- PNG encoding and export.
- Deterministic validation and rendering.
- A Codex-driven create/validate/render workflow.

The current format is not the future humanoid-skin format. It represents arbitrary rectangular animated characters as palette symbols and is optimized for transparent video overlays. VOXL humanoid skins require a fixed UV atlas, per-pixel RGBA, base and outer layers, and `wide-arm-64`/`slim-arm-64` geometry.

Suggested eventual separation:

```text
packages/
  engine-contracts/              # registry, requests, jobs, capabilities
  engine-transparent-character/  # current format, Bash importer, alpha exports
  engine-voxl-humanoid-skin/      # UV maps, edits, validation, PNG I/O
  provider-procedural/            # deterministic fixtures and fallback
  provider-template-image/        # evaluation-only managed-image adapter
apps/
  web/                           # shared shell and engine-specific editors
  mcp/                           # authenticated engine-neutral tools and UI
plugins/
  codex/
  claude/
workers/
  jobs/                          # generation orchestration
```

No migration should occur until the vertical slice proves that the skin workflow is worth pursuing.

## Current vertical slice

The original engine, deterministic document, renderer, synchronized editor, validator, exporter, and offline generation-path slice is complete. The next implementation milestone deliberately avoids accounts, billing, public MCP submission, billable provider calls, and any VOXL-operated model hosting:

1. Complete provenance admission for compatible managed multimodal and image candidates.
2. Extend provider-neutral requests and dry plans to bind `render-program-v1`, `direct-atlas-v1`, or `surface-sheet-v1` plus their engine contract/layout hashes.
3. Bind the render-program feedback-turn and resource ceilings and the shared preflight cost allocation into the plan identity.
4. Build disabled-by-default adapters with sanitized errors and usage capture while keeping credentials outside plans and evidence.
5. Prove planning remains non-billable and makes no network, credential, provider, entitlement, or attempt-record action.
6. Ask for explicit authority before any capped external generation call.

This is the smallest next slice that prepares a fair model comparison without prematurely committing to a provider or infrastructure.

## Evaluation plan

Create a fixed set of approximately 30 cases:

- Text-only characters.
- Single reference images.
- Multiple content/style references.
- Existing skin remixes.
- Selective revisions with explicit preserve constraints.
- `wide-arm-64` and `slim-arm-64` profiles.
- Difficult front/back details and overlays.

Measure:

- Valid upload rate.
- Reference and prompt fidelity.
- Front/back consistency.
- Preservation accuracy during selective edits.
- Number of revisions to acceptance.
- Time to first usable skin.
- Cost per accepted skin, not merely cost per model call.
- Willingness to pay for a second creation session.

The architecture decision should follow these results:

- If one or more hosted APIs preserve complex references and meet cost, latency, retention, provenance, and deterministic-validation thresholds, begin a separate provider-admission review; evaluation success alone is not admission.
- If preview quality is good but atlas conversion fails, evaluate another API-accessible provider or deterministic normalization policy without changing the engine contract.
- If the native host can produce a suitable canonical preview, keep that step on the user's subscription where the surface permits it.
- If native-host behavior causes unacceptable inconsistency, move more generation into VOXL-metered calls to an admitted external API provider.
- If users value editing more than first-pass generation, invest in masks, versioning, and localized image editing rather than a larger template catalog.
- If a provider fails provenance review, replace it before commercial launch even if its visual quality is strong.

The detailed delivery phases and completion gates are in the [VOXL implementation plan](../planning/implementation-plan.md).
