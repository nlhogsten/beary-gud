# VOXL glossary

This is the plain-language dictionary for the VOXL project. It explains product, AI, graphics, platform, and current character-studio terms used throughout the documentation. Terms are listed alphabetically within related groups so this can be read from top to bottom or searched as needed.

## The shortest explanation

VOXL is a studio for creating visual assets with conversation, reference images, and direct editing. A conversational AI understands what the user wants. A visual engine owns the exact file format and editing rules. A generation provider creates or changes pixels. Deterministic code validates the result and exports a file that matches a neutral geometry profile.

The first two visual engines are:

- `transparent-character`: the existing animated pixel-character and transparent-video workflow.
- `voxl-humanoid-skin`: the planned 64x64 cuboid-humanoid texture workflow.

Neither engine is named after an external application, game, platform, or publisher.

## VOXL and product terms

### Artifact

A visual thing created and saved by VOXL, such as an animated transparent character, a humanoid skin, a rendered preview, or an exported PNG. “Asset” and “artifact” are often used similarly; artifact usually emphasizes a specific generated or exported result.

### Asset

A durable creative project item owned by a user. An asset can have many versions, source files, reference images, previews, and exports.

### Componentized

Built from separate parts with explicit responsibilities. VOXL can add a new visual engine without forcing its file format or editor rules into existing engines.

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

The replaceable compute that creates or revises visual content. It might use a native chat-host image tool, an external image API, a hosted GPU model, or a procedural fallback. Providers can change without changing saved engine documents.

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

### Texture

A 2D image applied to a 3D surface. The planned humanoid-skin texture is a 64x64 PNG.

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

### 64x64

An image that is exactly 64 pixels wide and 64 pixels high. The small fixed canvas is the visual format's main creative constraint.

## Generative AI terms

### Candidate

One possible generated result. VOXL may create several candidates so the user can compare them before choosing one to refine.

### Checkpoint

A saved set of trained model weights. A checkpoint can be loaded by compatible inference software to run a particular version of a model.

### Conditioning

Information supplied to guide generation, such as text, images, masks, palettes, an existing asset, or a seed.

### Deterministic

Producing the same result when given the same exact inputs. File validation, coordinate mapping, and format export should be deterministic even when creative generation is not.

### Embedding

A numeric representation of content that a model can use to compare or condition on meaning and visual features. Users normally do not see or edit embeddings directly.

### Fine-tuning

Additional training that adapts an existing model to a narrower task, visual style, dataset, or output format.

### Generative-first

Using an image model to synthesize open-ended visual patterns as the primary creative path. Templates and procedural parts remain useful for tests and fallbacks but do not define what users are allowed to create.

### GPU

Graphics Processing Unit. GPUs perform many model calculations in parallel and are commonly used to run image-generation models. VOXL can rent or host GPU compute only after experiments establish the required quality and cost.

### Inference

Running an already-trained model to produce an output. Training creates model weights; inference uses them.

### LLM

Large Language Model. Codex and Claude are examples. In VOXL, an LLM understands the conversation and references, plans operations, calls tools, and explains results. Exact texture construction and validation are handled by visual providers and deterministic engine code.

### Mask

An image or selection marking pixels that an operation may affect. A preserve mask marks pixels that should remain unchanged; an edit mask marks the area to revise.

### Masked revision

A generative edit limited to a selected region, such as changing a coat while protecting the face and hair.

### Model

A trained computational system that transforms inputs into predictions or generated outputs. In this project, “model” should not be confused with arm geometry; documentation uses “profile” for geometry selection.

### Multimodal

Able to work with more than one kind of input, such as text plus one or more images, masks, palettes, or an existing asset.

### Native host tool

A capability supplied inside the user's current AI application, such as built-in image generation or file analysis. When available, it may use the user's existing host subscription rather than VOXL-hosted inference.

### Negative prompt or constraint

An instruction describing what should not appear or what should not change. Preservation constraints are usually more precise than a general negative prompt.

### Open-ended generation

Generation that can synthesize complex patterns not anticipated as fixed dropdowns or fields. It is still constrained by the output format's 64x64 canvas and UV layout.

### Procedural generation

Code that assembles or paints content using explicit rules, shapes, palettes, and parts. It is predictable and useful for tests, examples, and offline fallback, but less flexible than generative image synthesis.

### Prompt

The user's natural-language instruction describing what to create or change.

### Provenance

The recorded origin and history of a model, dataset, reference, or output. Provenance matters for reproducibility, licensing, commercial review, and user trust.

### Reference image

An image supplied to guide content, appearance, palette, pose, or style. A reference is an input, not necessarily something copied pixel for pixel.

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

### OAuth

An authorization protocol that lets a user connect a client to a service without giving the client the user's password. VOXL can use OAuth to connect chat clients to the user's VOXL account.

### Plugin

An installable bundle that can include skills, MCP connections, and interactive UI. The plugin is a client integration; it is not the visual engine or hosted inference service itself.

### Tool orchestration

The LLM's work of selecting and sequencing tools to accomplish a request—for example create, wait for a job, validate, render, revise, and export.

## Service, storage, and billing terms

### Asynchronous job

A task that continues after the initial request, such as GPU generation. The client receives a job ID and checks its status instead of keeping one connection open indefinitely.

### Credit

A VOXL product unit that may entitle a user to hosted generation. VOXL credits are separate from usage included in a user's AI-host subscription.

### Entitlement

The system's record that an account is allowed to use a paid or limited capability. A credit balance, creation session, or subscription allowance can all be entitlements.

### Hosted

Running on infrastructure operated or paid for by VOXL or one of its service providers rather than solely on the user's machine.

### Idempotent

Safe to repeat without creating duplicate effects. Retrying the same generation settlement should not charge twice or create duplicate final versions.

### Job queue

The ordered system that holds background tasks until a worker can process them. It supports retries, cancellation, concurrency limits, and failure handling.

### Local

Running on the user's own machine. Local editing and deterministic validation can work without VOXL paying for remote compute.

### Object storage

A service designed for large binary files such as uploads, PNGs, masks, and previews. The database stores metadata and permissions while object storage holds the file bytes.

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
| Native host usage | VOXL credits | Host usage belongs to the user's AI subscription; VOXL credits pay for VOXL-hosted work. |
| Reference | Output | A reference conditions generation; the output is the newly created VOXL asset. |
| Mask | Layer | A mask selects affected pixels; a layer is a visible texture surface. |
| Version | Export | A version is durable editable history; an export is a derived file for download. |

If a term in the repository is still unclear or missing here, add it to this glossary when the term is introduced. New engine documentation should define its visual geometry and export-profile vocabulary before implementation begins.
