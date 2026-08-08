# VOXL glossary

This is the plain-language dictionary for the VOXL project. It explains product, AI, graphics, platform, and current character-studio terms used throughout the documentation. Terms are listed alphabetically within related groups so this can be read from top to bottom or searched as needed.

For implementation status, use [the checked VOXL progress tracker](../planning/progress.md).

## The shortest explanation

VOXL is a studio for creating visual assets with conversation, reference images, and direct editing. A conversational AI understands what the user wants. A visual engine owns the exact file format and editing rules. A generation provider creates or changes pixels. Deterministic code validates the result and exports a file that matches a neutral geometry profile.

The first two visual engines are:

- `transparent-character`: the existing animated pixel-character and transparent-video workflow.
- `voxl-humanoid-skin`: the density-aware cuboid-humanoid texture workflow.

Neither engine is named after an external application, game, platform, or publisher.

## VOXL and product terms

### Artifact

A visual thing created and saved by VOXL, such as an animated transparent character, a humanoid skin, a rendered preview, or an exported PNG. “Asset” and “artifact” are often used similarly; artifact usually emphasizes a specific generated or exported result.

### Artifact replay

An evaluation-harness test that takes an already existing output file and runs it through validation, canonical export, evidence rendering, and hashing. It proves that the evaluator works; it does not call a model and is not evidence of provider quality, latency, or cost.

### Attempt

One immutable evaluation record for one case, candidate output, and execution. It records inputs, provenance when a provider exists, timing, cost, validation, hashes, evidence files, and failure categories. A replay attempt has no provider.

### Asset

A durable creative project item owned by a user. An asset can have many versions, source files, reference images, previews, and exports.

### Componentized

Built from separate parts with explicit responsibilities. VOXL can add a new visual engine without forcing its file format or editor rules into existing engines.

### Checksum

A short value calculated from file or document contents so later code can detect whether those contents changed. VOXL uses SHA-256 for durable evaluation evidence; a local browser draft may use a smaller checksum only as a corruption check.

### External destination

An application or platform outside VOXL where someone may use an exported asset. VOXL keeps destination names out of its engines and represents compatibility through neutral export profiles.

### Target-neutral

Named and designed around VOXL's own visual format instead of an external destination or publisher. For example, `voxl-humanoid-skin` and `wide-arm-64` are target-neutral names.

### VOXL

The working product and platform name for this componentized AI-native visual studio. It is written as `VOXL`. It is not currently defined as an acronym. The name suggests voxels and visual creation, but the product can support non-voxel visual engines too.

### VOXL Studio

The user-facing application shell: projects, files, conversation, history, job status, engine selection, and engine-specific editors.

## Engine architecture

### Adapter

A thin translation layer between two interfaces. An export-profile adapter turns an engine document into a profile-valid file. A provider adapter lets VOXL call a particular image model without making that model part of the engine's identity.

### API

Application Programming Interface. It is a documented way for one service to request work from another. VOXL can send text, reference images, and edit instructions to a managed generation API and receive image results without running that provider's models or hardware.

### Capability

Something an engine or provider can do, such as create, revise, validate, render, export, accept reference images, or perform masked edits. Capability discovery lets clients ask what is supported instead of assuming every engine behaves the same way.

### Document

The engine-owned, editable source representation of an asset. It contains the texture or frames plus the metadata needed to validate, revise, version, render, and export it.

### Document kind

A stable identifier for a document schema. The planned humanoid-skin kind is `voxl.humanoid-skin/v1`, where `v1` identifies the first schema version.

### Engine

The component that owns one visual format from creation through export. An engine defines its document, validation rules, editor, renderer, supported operations, and output formats. It does not have to own the AI model that generates pixels.

### Engine contract

The common interface every VOXL engine follows. It defines operations such as create, revise, validate, render, and export while allowing each engine to keep a completely different document format.

### Engine registry

The list of installed engines and the code that finds one by its ID. It rejects duplicate IDs and lets web, CLI, and chat clients discover engine capabilities.

### Export profile

A neutral, named set of output constraints: dimensions, geometry, UV layout, color mode, and validation rules. A profile says what the exported file is, without naming where someone may later use it.

### Generation provider

The replaceable compute that creates or revises visual content. Managed external APIs are VOXL's default providers: the provider operates the model and hardware, while VOXL calls the API and validates the returned candidate. Native chat-host tools may be evaluated when available, and procedural providers remain useful for testing and fallback. Providers can change without changing saved engine documents.

### Profile-valid

Passing every deterministic requirement of an export profile, such as exact dimensions, RGBA encoding, pixel placement, transparency rules, and arm geometry.

### Provider

Short for generation provider. The engine owns the asset format; the provider supplies generative compute.

### Renderer

Code that turns an engine document into something viewable, such as a 2D preview, a rotatable 3D character, a PNG sequence, or a transparent video. A renderer displays content; it does not necessarily invent it.

### Schema

A precise description of the fields and value types allowed in a document or request. Schemas help code validate data and safely evolve stored projects.

### Sidecar

A separate metadata file stored beside the main visual file. A humanoid-skin sidecar can hold semantic masks, version history, operations, reference provenance, and export-profile selection without changing the PNG pixels.

### Visual engine

Another plain-language name for an artifact engine. It emphasizes that the engine is defined by the type of visual object it owns.

## Humanoid-skin geometry and graphics

### 2D atlas editor

An editor that shows the entire flat texture and lets a user paint its exact pixels.

### 3D preview

A view that wraps the 2D texture around fixed cuboid geometry so the user can rotate the character and see how the flat pixels join together.

### Arm

One of the two cuboid character limbs beside the torso. In VOXL profile names, “arm” refers specifically to the width and UV mapping of those cuboids. It does not describe a character's overall body type.

### Base layer

The required inner texture surface for the head, torso, arms, and legs.

### Cuboid

A box-shaped 3D form. The planned humanoid preview is assembled from cuboids for the head, torso, arms, and legs.

### Cuboid-humanoid

VOXL's neutral description for a human-like figure built from fixed box-shaped parts.

### `cuboid-humanoid-renderer`

The neutral renderer capability that folds a humanoid texture atlas around fixed cuboid body geometry.

### Layer

A texture surface that can be viewed or edited independently. The humanoid-skin format has a base layer and an optional outer layer.

### Outer layer

An optional second texture surface slightly above the base layer. It can create hats, hair volume, jacket edges, sleeves, or other pixel-art details without changing the underlying base pixels. It is sometimes called an overlay.

### Model unit

A geometry measurement used to define the fixed cuboid body independently from the texture image. Changing texture density does not change the number of model units in a head, torso, arm, or leg.

### Pixel

One colored square in a raster image. At 64x64 resolution, each pixel has a noticeable effect and must remain sharp rather than blurred.

### Pixel art

Artwork intentionally designed at low resolution with hard-edged pixels and controlled color placement.

### PNG

Portable Network Graphics, a lossless image-file format that supports RGBA color and transparency. It is the primary planned humanoid-skin export.

### RGBA

Red, green, blue, and alpha: four values describing a pixel's color and transparency. Alpha at zero is fully transparent; maximum alpha is fully opaque.

### Skin

In VOXL, a flat image designed to wrap around fixed 3D geometry. It changes the visible character surface; it is not a newly generated 3D mesh.

### Slim arm

The narrower of the two supported arm geometries. `slim` is only a technical geometry and UV-layout term. It is not a statement about the character's body, identity, or visual style.

### `slim-arm-64`

The neutral 64x64 export profile using the narrower arm geometry.

### `slim-arm-128`

The neutral 128x128 export profile using the same narrower arm geometry with twice the texel density on each atlas axis.

### Texel

A texture pixel mapped onto a 3D surface. “Pixel” describes the image sample; “texel” emphasizes its role on the model. A `128x128` profile has twice as many texels along each atlas axis as its `64x64` counterpart.

### Texel scale

The ratio between a concrete texture density and the logical `64x64` UV grid. The `64` profiles use scale `1`; the `128` profiles use scale `2`. Texel scale changes UV coordinates and pixel capacity, not body geometry.

### Texture

A 2D image applied to a 3D surface. A humanoid-skin texture is currently a `64x64` or `128x128` PNG selected by its profile.

### Texture atlas

One flat image containing the texture regions for many 3D surfaces. Different rectangles in the atlas map to the front, back, sides, top, and bottom of the head, torso, arms, and legs.

### Transparency

Pixels that are partly or fully see-through. In the current character engine, the symbol `0` means transparent. In RGBA images, the alpha channel controls transparency.

### UV coordinates

Coordinates that connect a point on a 3D surface to a pixel in a 2D texture. `U` and `V` are the horizontal and vertical texture axes, similar to `X` and `Y` in a flat image.

### UV map

The complete mapping between regions of a 2D texture atlas and faces of the 3D geometry. Correct UV mapping is why a face appears on the head instead of on an arm.

### Voxel

A volume element: roughly the 3D equivalent of a 2D pixel. VOXL's cuboid characters have a voxel-like visual language, although the initial skin is a 2D texture on fixed geometry rather than a volume made from individually editable voxels.

### Wide arm

The wider of the two supported arm geometries. “Wide” describes only the arm cuboid and its UV layout.

### `wide-arm-64`

The neutral 64x64 export profile using the wider arm geometry.

### `wide-arm-128`

The neutral 128x128 export profile using the same wider arm geometry with twice the texel density on each atlas axis.

### 64x64

An image that is exactly 64 pixels wide and 64 pixels high. This is the baseline humanoid-skin texture density and the density used by the current generation evaluation.

### 128x128

An image that is exactly 128 pixels wide and 128 pixels high. It contains four times as many pixels as `64x64` while wrapping the same body proportions. Upscaling a `64x64` image to this size does not invent new detail.

## Generative AI terms

### Candidate

One possible generated result. VOXL may create several candidates so the user can compare them before choosing one to refine.

### Checkpoint

A saved set of trained model weights. A checkpoint can be loaded by compatible inference software to run a particular version of a model.

### Conditioning

Information supplied to guide generation, such as text, images, masks, palettes, an existing asset, or a seed.

### Compression helper

An optional render-program shortcut that represents a small uniform or repeated pixel area with fewer values—for example, a fill or tiny repeated pattern. It does not define what the character can contain, and a model can generate an entire result without using one.

### Dense pixel grid

A rectangular row-and-column description containing every pixel for one visual surface. VOXL grids use compact indexes into a supplied RGBA palette. They are the primary output format for the LLM-authored render-program path.

### Deterministic

Producing the same result when given the same exact inputs. File validation, coordinate mapping, and format export should be deterministic even when creative generation is not.

### Embedding

A numeric representation of content that a model can use to compare or condition on meaning and visual features. Users normally do not see or edit embeddings directly.

### Fine-tuning

Additional training that adapts an existing model to a narrower task, visual style, dataset, or output format.

### Generative-first

Using a managed generative model to interpret open-ended text and image inputs as the primary creative path. The result may be pixels from an image model or dense pixel instructions from a multimodal LLM. Templates and procedural parts remain useful for tests and fallbacks but do not define what users are allowed to create.

### GPU

Graphics Processing Unit. GPUs perform many model calculations in parallel and are commonly used to run image-generation models. With a managed generation API, the API company owns and operates those GPUs; VOXL only sends requests. VOXL does not plan to rent or manage GPUs. Any future exception requires explicit approval and a new architecture decision.

### Inference

Running an already-trained model to produce an output. Training creates model weights; inference uses them.

### Managed generation API

An external service that runs a generation model behind an API and charges per request, image, token, or another usage unit. The provider owns accelerator capacity, scaling, model serving, and low-level runtime operations. VOXL owns job orchestration, engine validation, versions, editing, export, and the customer experience.

### LLM

Large Language Model. Codex and Claude are examples. In VOXL, a multimodal LLM may understand the conversation and references, author dense pixel instructions, call tools, inspect renders, and explain results. Deterministic engine code still validates and executes those instructions exactly.

### Mask

An image or selection marking pixels that an operation may affect. A preserve mask marks pixels that should remain unchanged; an edit mask marks the area to revise.

### Masked revision

A generative edit limited to a selected region, such as changing a coat while protecting the face and hair.

### Model

A trained computational system that transforms inputs into predictions or generated outputs. In this project, “model” should not be confused with arm geometry; documentation uses “profile” for geometry selection.

### Multimodal

Able to work with more than one kind of input, such as text plus one or more images, masks, palettes, or an existing asset.

### Native host tool

A capability supplied inside the user's current AI application, such as built-in image generation or file analysis. When available and callable through a suitable tool contract, it may use the user's existing host allowance rather than VOXL-metered provider API usage.

### Negative prompt or constraint

An instruction describing what should not appear or what should not change. Preservation constraints are usually more precise than a general negative prompt.

### Open-ended generation

Generation that can synthesize complex patterns not anticipated as fixed dropdowns or fields. It is still constrained by the selected output profile's atlas density and UV layout.

### Procedural generation

Code that assembles or paints content using explicit rules, shapes, palettes, and parts. It is predictable and useful for tests, examples, and offline fallback, but less flexible than generative image synthesis.

### Prompt

The user's natural-language instruction describing what to create or change.

### Provenance

The recorded origin and history of a model, dataset, reference, or output. Provenance matters for reproducibility, licensing, commercial review, and user trust.

### Reference image

An image supplied to guide content, appearance, palette, pose, or style. A reference is an input, not necessarily something copied pixel for pixel.

### Render program

Strict JSON data describing pixels the deterministic engine should write. It is validated and bounded; it is not JavaScript, shell, Python, or another executable programming language. In the humanoid-skin engine, dense surface grids are the main creative payload and sparse texel writes are used for corrections.

### Revision

A change that creates a new asset version while preserving the prior version.

### Seed

A number used to initialize some generative processes. Reusing a seed can improve reproducibility, although exact reproduction also depends on the model, software, settings, and hardware.

### Semantic region

A meaningful part of an image—such as face, hair, jacket, emblem, or shoes—represented by metadata and usually a mask. Semantic regions make conversational edits more precise.

### `preview-to-atlas`

The neutral provider capability that transforms a standardized front/back character preview into a valid texture atlas. It names what the provider does, not the model or destination behind it.

## Chat, plugin, and API terms

### API

Application Programming Interface. A structured way for software components to request operations and exchange data.

### Chat client or host

The conversational application in which a user talks to an AI. Codex and Claude are examples of hosts VOXL may support.

### Codex skill

A local instruction package that teaches Codex a specialized workflow, including which scripts, checks, and safety rules to use. A skill can call VOXL tools but should not contain secret model credentials.

### MCP

Model Context Protocol. A standard way for an AI client to discover and call external tools or retrieve resources. A VOXL MCP server can expose engine-neutral operations such as create, revise, validate, render, and export.

### MCP tool

One callable operation exposed through MCP. Tools should have small, explicit responsibilities and accurate descriptions of whether they read, write, or delete data.

### MCP UI or in-chat UI

An optional interactive component displayed by a compatible chat host beside a conversation. A VOXL in-chat UI can show the current character, preview or refine an asset, and follow generation progress. It is a companion client of the same VOXL API, account, projects, immutable versions, database, and object storage as the standalone studio—not a second backend or a replacement for the complete website. MCP tools must still work when a host cannot display the UI.

### OAuth

An authorization protocol that lets a user connect a client to a service without giving the client the user's password. VOXL can use OAuth to connect chat clients to the user's VOXL account.

### Plugin

An installable bundle that can include skills, MCP connections, and interactive UI. The plugin is a client integration; it is not the visual engine or hosted inference service itself.

### Standalone web application

The complete VOXL Studio reached in an ordinary browser independently of any AI-chat host. It is built with React, TypeScript, and Vite. During current development it runs only on localhost; future production hosting is part of VOXL's own AWS infrastructure.

### Tool orchestration

The LLM's work of selecting and sequencing tools to accomplish a request—for example create, wait for a job, validate, render, revise, and export.

## Service, storage, and billing terms

### Ajv

The JSON Schema validator used by the Phase 5 evaluation runner. It checks the fixed case set, scoring rubric, and attempt records locally before evidence is accepted.

### Bun

The JavaScript and TypeScript runtime and package manager used to coordinate VOXL's workspaces and run the Hono server. Node remains temporarily required by the existing evaluation harness.

### Drizzle

A TypeScript database toolkit. VOXL uses Drizzle schemas as the source for reviewed PostgreSQL migration files under `infra/db`.

### Hono

The small web framework used by the VOXL API server. Hono defines HTTP routes while Bun supplies the server runtime.

### Monorepo

One repository containing several related applications, packages, and infrastructure workspaces. VOXL's monorepo shares verification and contracts without treating every component as one deployable program.

### Supabase

The local development stack used to run PostgreSQL and related services in Docker. It is a development convenience; the proposed AWS production architecture still uses RDS PostgreSQL and S3 unless a later decision changes it.

### Workspace

An independently owned package inside the monorepo, such as `apps/studio`, `apps/server`, or `infra/db`. The root package coordinates workspaces but does not contain product-runtime configuration.

### Application Load Balancer (ALB)

An AWS service that accepts HTTP traffic and routes it to healthy application tasks. The planned API/MCP service can run behind an ALB without exposing individual containers directly.

### Asynchronous job

A task that continues after the initial request, such as a managed provider API request followed by validation and rendering. The client receives a job ID and checks its status instead of keeping one connection open indefinitely.

### Credit

A VOXL product unit that may entitle a user to hosted generation. VOXL credits are separate from usage included in a user's AI-host subscription.

### Entitlement

The system's record that an account is allowed to use a paid or limited capability. A credit balance, creation session, or subscription allowance can all be entitlements.

### Hosted

Running on remote infrastructure rather than solely on the user's machine. A managed generation API is hosted by its provider; VOXL's API and CPU workers are hosted separately and call it over the network.

### Amazon ECS and Fargate

Amazon Elastic Container Service runs containerized services. Fargate supplies managed compute for those containers without VOXL operating virtual-machine hosts. The proposed Bun/Hono API, MCP transport, and later job workers can run this way.

### Idempotent

Safe to repeat without creating duplicate effects. Retrying the same generation settlement should not charge twice or create duplicate final versions.

### Job queue

The ordered system that holds background tasks until a worker can process them. It supports retries, cancellation, concurrency limits, and failure handling.

### JSON Schema

A machine-readable set of rules for JSON structure and values. It lets the evaluator reject missing, misspelled, unsupported, or wrongly typed fields before relying on a case or attempt record.

### Local

Running on the user's own machine. Local editing and deterministic validation can work without VOXL paying for remote compute.

### OpenTofu

An infrastructure-as-code tool used to declare, review, and reproduce cloud resources. VOXL plans to use OpenTofu as the source of truth for future AWS environments. A checked-in scaffold is not evidence that any cloud resource has been created.

### Object storage

A service designed for large binary files such as uploads, PNGs, masks, and previews. The database stores metadata and permissions while object storage holds the file bytes.

### RDS PostgreSQL

AWS-managed PostgreSQL proposed for durable relational records such as users, projects, assets, immutable versions, jobs, and entitlements. Large file bytes remain in object storage.

### S3

Amazon Simple Storage Service, the proposed object store for uploaded references, textures, previews, exports, and possibly the built Vite client.

### SHA-256

A widely used cryptographic hash function. VOXL records the 64-character SHA-256 value of evaluation inputs and evidence so a manifest can detect changed or substituted bytes.

### Secrets Manager

An AWS service for storing and rotating runtime credentials and other secrets. Secrets are injected into services at runtime rather than committed to OpenTofu variables or source control.

### CloudFront

An AWS content-delivery service. The proposed production path serves the Vite application's static files through CloudFront while keeping the application independent of a chat host.

### CloudWatch

AWS services for logs, metrics, dashboards, and alarms. API, MCP, worker, database, and generation health should be observable here or through a deliberately chosen equivalent.

### Retention

How long uploaded references, generated outputs, logs, and backups are kept before deletion.

### Usage ledger

An append-only history of entitlement reservations, successful charges, releases, refunds, and adjustments. It makes billing auditable and helps prevent double charging.

### Worker

A process that takes queued jobs and performs generation, validation, rendering, or other background work.

## Current transparent-character terms

### Alpha video

A video with a transparency channel so it can be placed over other footage without a colored background.

### APNG

Animated Portable Network Graphics. A PNG-based animation format used for quick previews in applications that support it.

### Bash importer

The current safe converter for a limited quoted Bash canvas format. It parses supported data without executing the supplied script.

### Character source

The editable files under `characters/<name>/`: `character.json` plus rectangular frame text files. These remain the source of truth for production transparent-character exports.

### Frame

One still image in an animation sequence.

### Palette

A mapping from short symbols to RGBA colors. Frame grids use those symbols to describe pixels; `0` means transparency.

### ProRes alpha MOV

A `.mov` video encoded with a ProRes format that preserves transparency. The current renderer produces a ready-to-loop 30-second file for video editing.

### Sprite sheet

One image containing multiple animation frames arranged in rows or columns.

### Source of truth

The authoritative editable representation. Generated previews and exports can be rebuilt from it and should not silently replace it.

## Terms that are easy to confuse

| Term A | Term B | Difference |
| --- | --- | --- |
| Engine | Provider | The engine owns the visual format; the provider supplies generative compute. |
| Skin | 3D mesh | A skin is a 2D texture for fixed geometry; a mesh defines the 3D shape itself. |
| Model | Export profile | A model generates or analyzes content; an export profile defines deterministic geometry and file constraints. |
| Slim arm | Slim character | VOXL uses “slim” only for narrower arm geometry, never as a character-body description. |
| Renderer | Generator | A renderer displays existing content; a generator invents or revises content. |
| Native host usage | VOXL credits | Host usage belongs to the user's AI subscription; VOXL credits pay for VOXL-metered managed-provider API usage and platform work. |
| Reference | Output | A reference conditions generation; the output is the newly created VOXL asset. |
| Mask | Layer | A mask selects affected pixels; a layer is a visible texture surface. |
| Version | Export | A version is durable editable history; an export is a derived file for download. |
| Plugin UI | Standalone studio | Plugin UI is an optional focused client inside a supported chat host; the standalone studio is the complete product. Both use the same VOXL backend and saved versions. |
| Localhost | AWS environment | Localhost is the current development runtime; an AWS environment is future independently managed production or staging infrastructure. |

If a term in the repository is still unclear or missing here, add it to this glossary when the term is introduced. New engine documentation should define its visual geometry and export-profile vocabulary before implementation begins.
