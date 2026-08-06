# ADR 0009: Keep development local and target an OpenTofu-managed AWS runtime

Status: Accepted; infrastructure not yet provisioned

## Context

A temporary frontend preview was published through ChatGPT Sites, which blurred the boundary between the standalone VOXL product and its future Codex integration. VOXL needs one durable platform that can be used by its own web application and by optional chat clients. The intended production direction is AWS managed as infrastructure as code, while current frontend development should remain local.

## Decision

- Local studio development is localhost-only. The canonical client is the React 19, TypeScript, and Vite application.
- ChatGPT Sites is not a VOXL development or production environment and is removed from the repository workflow.
- Future production infrastructure is managed with OpenTofu.
- The initial AWS target is a static Vite client served from S3 through CloudFront, with an Express API and remote MCP endpoint running as containers on ECS/Fargate behind an Application Load Balancer.
- ECR stores service images; RDS PostgreSQL stores relational state; S3 stores user files and derived binaries; Secrets Manager holds runtime secrets; CloudWatch receives logs, metrics, and alarms.
- Asynchronous workers may run as separate ECS services or tasks. No dedicated GPU topology is selected until provider experiments establish the need.
- The standalone studio, remote MCP tools, and optional in-chat UI all use the same application services, authorization rules, PostgreSQL records, and object storage. The plugin is a client integration, not another backend.
- The embedded MCP UI is optional and host-dependent. Every essential operation remains available through tools without custom UI.
- Account IDs, domains, certificates, network IDs, secrets, database credentials, and production sizing are supplied per environment; none are invented in source control.

## Consequences

- Development checkpoints are verified locally and are not automatically deployed.
- A future AWS deployment can be reproduced and reviewed from OpenTofu, but the checked-in scaffold does not mean an environment exists.
- Web and chat sessions can continue the same asset because both address immutable versions in one platform.
- Embedded UI can provide focused preview and editing, while the website remains the complete editor and fallback for hosts without interactive components.
- The API/MCP service must separate transport from application logic so web routes and MCP tools cannot drift into different behavior.
- Infrastructure work must add remote state, locking, environment isolation, least-privilege IAM, backups, alarms, and recovery testing before production use.

## Superseded interpretation

ADR 0008 remains valid for the single React/Vite frontend decision. Any wording that suggested ChatGPT Sites was the intended hosted runtime is superseded by this record.
