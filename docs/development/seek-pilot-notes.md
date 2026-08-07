# Seek pilot notes

Status: installed CLI updated and read-only audit complete; initialization waiting for confirmed slugs and working Seek service access.

## Repository result

- Seek `0.1.0` is installed and its local receipt is valid. The first trial exposed that the installed binary was behind its recorded source checkout; focused source tests passed and the binary was reinstalled from source commit `0820d2c`.
- This repository is currently unmanaged by Seek.
- The updated `seek status` now succeeds with a structured, read-only prospective plan and recommends choosing the managed repository method. This corrects the generic setup error observed from the stale binary.
- Projection audit found four tracked, unmanaged files, all inside `.codex/skills/transparent-character-studio/`.
- The existing skill must stay externally owned. Initialization must resolve those four exact paths as `external`; Seek must not claim the whole `.codex` directory.
- The next safe action is `seek init --organization <confirmed> --project <confirmed>`, followed by the status-directed action and `seek check`. `seek auth status` could not reach the pre-release service during this pilot, so authorized slugs could not be discovered automatically.

## Pre-release product findings

1. `seek info` verifies receipt/binary consistency but does not warn when the recorded source checkout has moved ahead of `receipt.sourceCommit`; the original installation therefore appeared healthy while stale.
2. `seek state` still suggests `init` or `sync`, although `sync` cannot work before configuration.
3. `seek init --help` does not explain that authorized organization/project slugs should come from `seek auth status`.
4. Projection audit reports exact collisions well, but does not return a recommended resolution or machine-actionable next step.
5. Setup-related command failures still use generic `SEEK_ERROR` objects with only a message instead of a typed code and optional structured next action.

## What changed during the pilot

- The Seek source checkout was not modified.
- Its existing setup and installation tests passed: 24 focused tests across `setup-status` and `installation`.
- The standalone binary was rebuilt and reinstalled from the newer, clean local source checkout. Its installation receipt now matches source commit `0820d2c`.
- No VOXL repository registration, lore selection, projection resolution, or generated agent file was applied.

## Intended VOXL knowledge workflow

Seek is a good fit for managing the durable agent knowledge learned while building VOXL, as long as canonical knowledge and temporary local overrides stay distinct:

1. Put cross-project engineering conventions in an organization lore pack.
2. Put VOXL architecture, target-neutral naming, verification commands, deployment boundaries, and engine-authoring conventions in a project lore pack.
3. Keep `.codex/skills/transparent-character-studio/` externally owned during the pilot. It is a specialized operational skill, not generic generated guidance.
4. Use Seek personal instructions only for temporary local preferences. Promote useful project learnings into reviewed project lore instead of leaving them as a permanent private override.
5. Publish reviewed harness changes from the Seek authoring repository, select the resulting pack for this checkout, then run `seek sync` and `seek check`.
6. Never edit Seek-generated native agent files directly; change their canonical lore or explicit projection decision.

The current blocker is operational rather than conceptual: Seek authentication could not reach the pre-release service, and valid organization/project slugs are still unknown. Once those are available, initialize with the recommended managed method and record each of the four existing skill paths as `external` before activation.

These findings are pilot observations, not VOXL blockers.
