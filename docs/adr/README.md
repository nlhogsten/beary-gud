# VOXL architecture decision records

Architecture decision records capture choices that implementation must preserve. Accepted records remain in the repository even if a later record supersedes them, so the reason for a change is not lost.

| Record | Decision | Status |
| --- | --- | --- |
| [0001](0001-engines-and-generation-providers.md) | Separate visual engines from generation providers | Accepted |
| [0002](0002-engine-owned-document-schemas.md) | Let each engine own its document schema | Accepted |
| [0003](0003-immutable-asset-versions.md) | Store revisions as immutable asset versions | Accepted |
| [0004](0004-asynchronous-idempotent-jobs.md) | Run generation as asynchronous, idempotent jobs | Accepted |
| [0005](0005-generative-first-humanoid-skins.md) | Make humanoid-skin creation generative-first | Accepted |
| [0006](0006-target-neutral-identities.md) | Use target-neutral component and profile identities | Accepted |
| [0007](0007-packaging-and-migration-policy.md) | Delay workspaces and protect compatibility migrations | Superseded in part by 0010; safeguards retained |
| [0008](0008-react-vite-studio-frontend.md) | Use one React and Vite studio frontend | Accepted; migration in progress |
| [0009](0009-local-development-and-aws-runtime.md) | Keep development local and target an OpenTofu-managed AWS runtime | Accepted; infrastructure not yet provisioned |
| [0010](0010-bun-workspace-and-service-boundaries.md) | Use Bun workspaces and keep runtime configuration with its owner | Accepted |
