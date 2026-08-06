# VOXL system architecture

Status: active architecture. The Bun workspace layout, local studio, Hono server boundary, engine packages, initial Drizzle schema, local Supabase configuration, and OpenTofu bootstrap exist. Durable application services, authentication, AWS resources, remote MCP, workers, and plugin UI are not yet implemented.

## One product, multiple clients

VOXL is a standalone product. Its primary client is a React/TypeScript application built with Vite. During development, the studio runs only on `localhost`; it is not deployed through ChatGPT Sites or embedded inside Codex.

The future Codex and Claude integrations are additional clients of the same VOXL service:

```text
Local development

React/Vite studio ── HTTP ── Bun/Hono API ── local Supabase/PostgreSQL
   localhost                 localhost          (when started)


Future AWS production

                         ┌─ React/Vite web client
browser ─ CloudFront ────┤  (static assets in S3)
                         │
                         └─ ALB ─ Bun/Hono API + remote MCP
                                   (ECS/Fargate containers from ECR)
                                           │
chat host + VOXL plugin ───────────────────┤
                                           ├─ RDS PostgreSQL: accounts, projects,
                                           │  assets, versions, jobs, entitlements
                                           ├─ S3: references, textures, previews,
                                           │  exports
                                           ├─ Secrets Manager: runtime secrets
                                           ├─ CloudWatch: logs, metrics, alarms
                                           └─ ECS workers: asynchronous generation
                                              and rendering when required
```

The diagram is a direction, not a claim that these services have been provisioned. OpenTofu will manage the AWS resources once the application boundaries and an AWS environment are ready.

## Responsibilities

| Component | Responsibility | Source of durable truth? |
| --- | --- | --- |
| React/Vite studio | Full project library, generation workflow, 2D/3D editing, history, account and download experience | No; it reads and writes through the API |
| Bun/Hono API | Authentication and authorization boundary, project/version/file APIs, job submission, signed transfers, entitlements | Coordinates durable state |
| Visual engines | Engine-owned schemas, deterministic validation, rendering, migration, and export | Defines document meaning, not user ownership |
| Generation providers/workers | Create or revise visual content and report measured usage | No; successful results become immutable versions through the API |
| Remote MCP service | Presents engine-neutral VOXL operations to compatible AI hosts | No; it calls the same application services as the web API |
| Plugin | Installs skills, MCP connection metadata, and optional host-specific UI | No; it contains no separate project store or secret inference implementation |
| PostgreSQL | Relational metadata, ownership, immutable version records, jobs, and entitlements | Yes, for structured records |
| Object storage | Uploaded references and generated/exported binary files | Yes, for file bytes |

## What an in-chat editor is

Where a chat host supports interactive MCP UI, the VOXL plugin may show a companion character viewer/editor directly beside the conversation. It can render a current asset, rotate a preview, select a region, apply a supported edit, show job progress, and save a new version.

That UI is not a second VOXL deployment and does not have its own database. It authenticates the same VOXL account and operates on the same project, asset IDs, immutable versions, API rules, and stored files as the standalone studio. An edit made in chat appears on the website after the client reloads or receives an update, and a website edit is visible to the chat client.

The embedded UI should be intentionally smaller than the full studio:

- MCP tools remain usable without any custom UI.
- The UI calls explicit VOXL operations; it does not bypass authorization or validation.
- Fast deterministic edits can return immediately. Generation returns a job ID and reports progress through polling or event updates.
- Concurrent edits use version identifiers and conflict handling rather than silently overwriting one another.
- Host support differs, so the standalone website remains the complete, host-independent experience.

## Environment policy

### Local development

- Vite and the local API run on loopback addresses.
- Local files or development-only services may substitute for AWS dependencies while contracts are being built.
- No checkpoint is automatically published to an external hosting product.
- Tests and builds must not require AWS credentials.
- Vite configuration belongs to `apps/studio`, Hono runtime configuration belongs to `apps/server`, and Drizzle/Supabase configuration belongs to `infra/db`.
- Local Supabase is a development implementation of PostgreSQL, auth, and object-storage-adjacent services; it does not replace the proposed production RDS and S3 architecture.

### Future AWS environments

- OpenTofu is the infrastructure source of truth.
- Separate environment state is required for development/staging and production; production must not share databases, buckets, secrets, or state with local development.
- Public ingress terminates at CloudFront and/or an Application Load Balancer. Tasks and databases run in private subnets.
- The API and MCP routes share application services and identity policy, even if they later use separate ECS services for independent scaling.
- GPU inference is not assumed. Provider experiments decide whether generation uses external APIs, transient compute, or dedicated workers.

## Request examples

### Website edit

1. The React client requests an edit against asset version `v12`.
2. The API authorizes the user and validates the engine operation.
3. A deterministic edit creates `v13` immediately, or a generative edit creates an asynchronous job.
4. The API records `v13` and its file references after validation succeeds.
5. The website refreshes its preview and history.

### In-chat edit

1. The LLM calls a VOXL MCP tool using the user's connected account.
2. The MCP handler invokes the same application operation against version `v13`.
3. The optional companion UI shows the current render and job state.
4. A successful result becomes `v14` in the same project.
5. Opening the standalone studio shows `v14`; no transfer or database synchronization step is needed.

## Deliberately deferred decisions

- AWS account IDs, domains, Route 53 zones, certificates, and production region.
- Identity provider and OAuth implementation.
- Whether CloudFront routes API traffic or the API uses a separate subdomain.
- Queue implementation and whether workers share an image with the API.
- Database sizing, backup retention, multi-AZ policy, and production scaling values.
- Dedicated GPU infrastructure.

These values must come from measured requirements and explicit environment configuration, not hard-coded guesses in the repository.
