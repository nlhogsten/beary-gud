# VOXL OpenTofu foundation

This directory records the intended AWS infrastructure boundary. It is an intentionally resource-free bootstrap: it configures OpenTofu and the AWS provider, validates environment inputs, and exposes deterministic resource-name prefixes. It does **not** create or imply a deployed environment.

The staged implementation target is:

1. Remote OpenTofu state and locking, configured outside this root before shared environments are created.
2. A VPC spanning at least two availability zones, with public ingress subnets and private application/data subnets.
3. ECR repositories for the Bun/Hono API and later workers.
4. S3/CloudFront delivery for the React/Vite build.
5. An Application Load Balancer and ECS/Fargate service for the Bun/Hono API and remote MCP endpoint.
6. RDS PostgreSQL, an asset bucket, Secrets Manager entries, and scoped IAM roles.
7. CloudWatch log groups, metrics, alarms, dashboards, and deployment health checks.
8. Optional queue and worker services after asynchronous workloads are measured.

## Local validation

No AWS credentials or account-specific values are required to format and statically validate this bootstrap:

```sh
cd infra/tofu
tofu init -backend=false
tofu fmt -check -recursive
tofu validate
```

`tofu init` downloads the declared AWS provider and therefore requires network access on the first run. It does not contact an AWS account when the backend is disabled and no plan/apply is run.

To inspect configured names without querying AWS, use a saved variable file only after provider initialization. Do not commit secrets or real production identifiers:

```sh
tofu plan -refresh=false \
  -var='environment=development' \
  -var='aws_region=<selected-region>'
```

## Before adding resources

- Confirm the AWS organization/account layout, region, DNS names, and certificate ownership.
- Choose and document a remote state backend with encryption, locking, access logging, and break-glass recovery.
- Keep separate state and variable sets for every shared environment.
- Store secrets in Secrets Manager or an approved secret workflow, never `.tfvars` committed to Git.
- Add cost estimates, deletion protection, backups, and recovery tests with the first stateful resources.
- Do not add GPU or model-serving infrastructure to the baseline. Managed provider APIs are the default; any exception requires an explicit ADR and approval.

See [the system architecture](../../docs/architecture/system.md) and [ADR 0009](../../docs/architecture/decisions/0009-local-development-and-aws-runtime.md).
