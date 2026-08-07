# Seek pilot notes

Status: local adoption complete and verified for Codex; no hosted Seek service or remote repository connection is required.

## Repository result

- Seek `0.1.0` is installed from the adjacent local Seek checkout, and its installation receipt matches source commit `aa85d39376891201b776b5c434646635f6d674f5`.
- This checkout uses Seek's local authority. It has no organization, project, active hosted lore version, or remote-authentication prerequisite.
- Four existing skills were explicitly adopted: `add-voxl-engine`, `run-voxl-generation-eval`, `transparent-character-studio`, and `verify-voxl-studio`.
- Canonical editable files now live under `harness/skills/`. Seek owns the 13 corresponding generated files under `.agents/skills/` and reports `sourceFreshness=current`, `synchronization=in-sync`, and no pending plans.
- The pre-existing `.codex/skills/` and `.claude/skills/` files were preserved as unmanaged compatibility copies. Seek did not claim or overwrite them.
- The selected local target is Codex. Claude and Cursor are not Seek-managed by this selection and must not be reported as equivalent without a separate, supported projection decision.

## What the first trial clarified

1. Repository-local skill management must not be blocked on hosted authentication, organization slugs, MCP, or a Git remote.
2. Discovery is read-only. Adoption requires an explicit reviewed plan because it changes which exact files Seek owns; `seek approve` executes that already-inspected plan.
3. Local adoption copies source into `harness/skills/` and generates `.agents/skills/`; it preserves the original native files rather than moving or deleting them.
4. A local Codex projection is intentionally narrower than organization-wide multi-surface distribution. When another surface cannot be represented, agents must report it instead of silently selecting a proprietary substitute.

## What changed during the pilot

- Seek local authority was initialized for this checkout.
- Each of the four unmanaged skill trees was adopted through its exact reviewed plan.
- Seek created canonical `harness/skills/` sources and an exact `.agents/skills/` Codex projection while preserving the legacy source trees.
- `seek status` and `seek check` both report the checkout in sync, and a recursive comparison confirms the canonical and generated skill trees match.

## Intended VOXL knowledge workflow

Seek manages the durable repository skills learned while building VOXL, while canonical knowledge and temporary local overrides stay distinct:

1. Edit repository skill source under `harness/skills/`, not the generated `.agents/skills/` projection.
2. Run Seek's build/activation workflow and `seek check` after a canonical skill change.
3. Use personal instructions only for temporary local preferences. Promote durable project learnings into reviewed repository source.
4. Keep local authority while one checkout and Codex are sufficient. Organization lore packs remain a future distribution option, not a prerequisite.
5. Keep workflow instructions, execution permissions, and tool/provider choices separate. A skill does not grant access, and local adoption does not require adding MCP or a hosted service.
6. Preserve the legacy `.codex` and `.claude` copies until a deliberate compatibility cleanup or multi-surface migration is approved.

There is no current Seek blocker for local Codex use. Start a fresh Codex session after projection changes so the host can rediscover the skills.
