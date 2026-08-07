# VOXL walkthrough evidence contract

## Run artifact

The committed runner writes one directory under `.runs/quality-<timestamp>-<journey>/` containing:

- `state.json`: final run state and outcome.
- `steps.jsonl`: ordered actions, expectations, observations, and step status.
- `errors.jsonl`: console, page, request, and runner failures.
- `manifest.json`: journey, environment, timestamps, and artifact inventory.
- `report.md`: human-readable summary generated from the run.
- `screenshots/`: visual evidence captured after meaningful states.
- `downloads/`: exported files captured by the journey.

Treat missing required files as a failed evidence run. Keep failed steps in the record; never delete them to make a report appear clean.

## Journey selection

| Journey | Use it to prove |
| --- | --- |
| `studio-smoke` | Shell load, engine switching, basic responsive layout, and absence of runtime/network failures |
| `transparent-edit-export` | Transparent-character drafting, painting, history, effects, and downloadable export |
| `humanoid-2d-3d` | Atlas edits, 3D picking/painting, rotation, layer visibility, and 2D/3D synchronization |
| `humanoid-import-export` | Profile conversion, validation, downloadable export, and safe same-run re-import |

The upload action only selects a safe filename already captured under the current run's `downloads/` directory. This proves a deterministic export/re-import round trip without granting journeys arbitrary host-file access. Keep invalid-dimension and unreadable-file import behavior open until committed fixtures or explicit manual records prove it.

## Pass rules

A journey passes only when:

- Every required step reached the expected observable state.
- No unclassified console error, page error, or failed application request occurred.
- Required downloads exist and pass the relevant deterministic validator.
- Screenshots show the state named by the step rather than a loading, stale, or obscured view.
- Any responsive viewport in scope is captured independently.
- The report distinguishes automated evidence, visual judgment, and manual follow-up.

Do not let retries hide instability. Record the first failure and the retry result.

## Visual review rubric

For all editors, review layout containment, readable controls, focus visibility, disabled/loading/error states, and lossless engine switching.

For pixel editors, require crisp nearest-neighbor presentation, correct transparency, predictable painting, and exact undo/redo.

For the cuboid humanoid renderer, review:

- Front, back, left, right, top, and bottom texture orientation.
- Wide-arm and slim-arm geometry.
- Base and outer-layer spacing, visibility, and transparent-pixel picking.
- Drag rotation without accidental painting.
- 3D click-to-atlas mapping and 2D edit-to-3D refresh.
- Color picking, painting, undo/redo, import, and exported dimensions.

The implementation agent may capture evidence, but a separate review pass should judge ambiguous visual claims whenever practical.
