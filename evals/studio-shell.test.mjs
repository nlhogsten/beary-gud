import assert from "node:assert/strict";
import test from "node:test";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TRANSPARENT_DRAFT_STORAGE_KEY,
  TRANSPARENT_HISTORY_STORAGE_KEY,
  colorFor,
  commitTransparentEdit,
  currentCharacter,
  initialTransparentState,
  normalizeTransparentState,
  paintCharacterPixel,
  pixelIsHidden,
  redoTransparentEdit,
  replaceCurrentCharacter,
  undoTransparentEdit,
} from "../apps/studio/src/studio/transparent-character/core.ts";

test("motion drafts retain the legacy storage boundary and normalize safely", () => {
  assert.equal(TRANSPARENT_DRAFT_STORAGE_KEY, "transparent-character-studio-drafts-v1");
  assert.equal(TRANSPARENT_HISTORY_STORAGE_KEY, "transparent-character-studio-history-v1");
  const initial = initialTransparentState("2026-08-05T00:00:00.000Z");
  const character = currentCharacter(initial);
  assert.equal(character.lines.length, CANVAS_HEIGHT);
  assert.equal(character.lines.every((line) => line.length === CANVAS_WIDTH), true);

  const legacy = normalizeTransparentState({ ...initial, mode: "Compact sprite" });
  assert.equal(legacy.mode, "Sprite sheet");
  assert.equal(normalizeTransparentState({ broken: true }).current, "Rainbow Bear");
});

test("motion painting is no-op safe and round-trips through undo and redo", () => {
  const state = initialTransparentState("2026-08-05T00:00:00.000Z");
  const history = { past: [], future: [] };
  const original = currentCharacter(state).lines[0][0];
  const noOp = commitTransparentEdit(state, history, "No-op", (draft) => replaceCurrentCharacter(
    draft,
    (character) => paintCharacterPixel(character, 0, 0, original),
  ));
  assert.equal(noOp.changed, false);

  const painted = commitTransparentEdit(state, history, "Painted pixel 1,1", (draft) => replaceCurrentCharacter(
    draft,
    (character) => paintCharacterPixel(character, 0, 0, "R"),
  ));
  assert.equal(painted.changed, true);
  assert.equal(currentCharacter(painted.state).lines[0][0], "R");
  const undone = undoTransparentEdit(painted.state, painted.history);
  assert.equal(currentCharacter(undone.state).lines[0][0], original);
  const redone = redoTransparentEdit(undone.state, undone.history);
  assert.equal(currentCharacter(redone.state).lines[0][0], "R");
});

test("motion preview effects preserve palette cycling and alternating transparency", () => {
  const character = currentCharacter(initialTransparentState("2026-08-05T00:00:00.000Z"));
  assert.equal(colorFor("R", 1, character), character.palette.Y);
  assert.equal(pixelIsHidden("R", 0, 0, character), true);
  assert.equal(pixelIsHidden("R", 0, 1, character), false);
  assert.equal(colorFor("0", 0, character), undefined);
});
