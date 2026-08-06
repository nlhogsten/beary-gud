# VOXL quality runner

This application executes repository-owned browser journeys against a running
VOXL Studio and writes durable evidence under the repository-root `.runs/`
directory. It does not start the product stack or decide that a visual result is
good; it records observable behavior for deterministic and independent review.

## Run a journey

```sh
bun run --cwd apps/quality-runner browsers:install
bun run --cwd apps/quality-runner walkthrough studio-smoke
bun run --cwd apps/quality-runner walkthrough studio-smoke --headed
bun run --cwd apps/quality-runner walkthrough studio-smoke --base-url http://127.0.0.1:5740
```

The base URL defaults to `VOXL_BASE_URL`, then to
`http://127.0.0.1:5740`. The command exits nonzero when any required step
fails or when the browser captures an actionable console, page, request, or
HTTP response error.

## Journey contract

Journey files live at `journeys/<id>.json`. Each step represents one semantic
user action:

```json
{
  "id": "studio-smoke",
  "title": "Studio engine smoke test",
  "viewports": [
    { "name": "desktop", "width": 1440, "height": 1000 },
    { "name": "mobile", "width": 390, "height": 844, "isMobile": true }
  ],
  "steps": [
    {
      "id": "open-studio",
      "title": "Open the studio",
      "action": "navigate",
      "path": "/",
      "required": true
    },
    {
      "id": "open-motion",
      "title": "Open the motion editor",
      "action": "click",
      "target": "role=button[name=\"Motion\"]",
      "required": true
    }
  ]
}
```

Supported actions are `navigate`, `click`, `press`, `fill`, `select`, `wait`,
`screenshot`, `assert-visible`, `assert-hidden`, `assert-page-contained`,
`canvas-click`, `canvas-drag`, `download`, and `upload`.

Targets support these semantic forms:

- `role=button[name="Motion"]`
- `label=Paint color`
- `text=Valid profile`
- `testid=project-save`
- `css=.fallback-selector`

An unprefixed target is treated as CSS. Prefer roles, labels, visible text, or
test IDs so journeys follow the accessibility surface users actually receive.
`canvas-click` takes normalized coordinates in `value`, such as `0.5,0.5`.
`canvas-drag` takes normalized start and end coordinates, such as
`0.75,0.5,0.25,0.5`, and sends a real pointer-down, stepped movement, and
pointer-up sequence. Every ratio must remain between zero and one so the
pointer stays within the measured canvas.
`assert-hidden` waits for a semantic target to become hidden or absent.
`press` focuses a semantic target and sends the key named by `value`, allowing
keyboard-accessible controls to be exercised without DOM event injection.
`assert-page-contained` fails when the document or body scroll width exceeds
the current viewport width, turning mobile horizontal overflow into an
automatic failure rather than a screenshot-only judgment.
For `download`, `value` is the required suggested filename. For `screenshot`,
it is an optional evidence label; the special value `full-page` captures the
full document. For `upload`, `target` identifies a file input and `value` must
be the safe basename of a file captured in the current run's `downloads/`
directory. Paths and files from elsewhere on the machine are rejected by
construction. A journey can therefore export a validated artifact and import
that exact artifact again without depending on an untracked local fixture.

Journeys may declare `ignoredErrorPatterns`, but exclusions should be narrow
and reviewable. Patterns are regular expressions matched against the error and
URL; an invalid expression is treated as a case-insensitive substring.

## Evidence contract

Each run creates `.runs/quality-<timestamp>-<journey>/` containing:

- `state.json`: resumable, current/final run state and totals.
- `steps.jsonl`: one immutable result per viewport step.
- `errors.jsonl`: console, page, request, failed-response, and runner errors.
- `manifest.json`: journey snapshot, run configuration, and artifact index.
- `screenshots/`: automatic evidence after every step, including best-effort
  failure captures.
- `downloads/`: non-empty files captured by download steps.
- `report.md`: human-readable result summary linked to its evidence.

The runner continues after a failed step. This is deliberate: later results
often reveal whether the failure was isolated or broke the rest of the user
journey. The final status remains failed whenever a required step failed.
