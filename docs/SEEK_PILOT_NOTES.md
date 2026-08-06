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

These are pilot observations, not VOXL blockers. No Seek state was changed during the audit.
