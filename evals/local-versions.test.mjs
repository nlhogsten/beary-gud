import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCAL_VERSION_LIMIT,
  LOCAL_VERSION_STORAGE_KEY,
  checksumDocument,
  createLocalVersion,
  parseLocalVersions,
  versionsForScope,
  writeLocalVersions,
} from "../apps/studio/src/studio/local-versions/core.ts";
import {
  countChangedSkinPixels,
  createBlankPixels,
  parseSkinVersionDocument,
  serializeSkinVersionDocument,
} from "../apps/studio/src/studio/humanoid/core.ts";
import {
  countChangedTransparentPixels,
  countChangedTransparentSettings,
  initialTransparentState,
  parseTransparentVersionDocument,
  serializeTransparentVersionDocument,
} from "../apps/studio/src/studio/transparent-character/core.ts";

const scope = { engineId: "voxl-humanoid-skin", assetKey: "local-skin" };
const documentJson = JSON.stringify({ kind: "test/v1", pixels: [1, 2, 3] });

function append(records, overrides = {}) {
  return createLocalVersion(records, {
    ...scope,
    id: `local:version-${records.length + 1}`,
    engineVersion: "1.0.0",
    documentKind: "test/v1",
    schemaVersion: 1,
    name: `Version ${records.length + 1}`,
    createdAt: `2026-08-05T00:00:0${records.length}.000Z`,
    operationSummary: "Saved test version",
    documentJson,
    ...overrides,
  });
}

test("local versions append immutably, filter by engine asset, and round-trip", () => {
  const first = append([]);
  const second = append(first, { parentVersionId: first[0].id });
  const other = createLocalVersion(second, {
    ...scope,
    assetKey: "other-skin",
    id: "local:other-1",
    engineVersion: "1.0.0",
    documentKind: "test/v1",
    schemaVersion: 1,
    name: "Other baseline",
    createdAt: "2026-08-05T00:01:00.000Z",
    operationSummary: "Saved test version",
    documentJson,
  });

  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.equal(second[1].parentVersionId, first[0].id);
  assert.equal(versionsForScope(other, scope).length, 2);
  assert.deepEqual(parseLocalVersions(JSON.stringify(other)), other);
  assert.equal(other[0].checksum, checksumDocument(documentJson));
});

test("local version input rejects unsafe names, duplicates, parents, and limits", () => {
  assert.throws(() => append([], { name: "   " }), /required/);
  const first = append([]);
  assert.throws(() => append(first, { name: "version 1" }), /already exists/);
  assert.throws(() => append(first, { parentVersionId: "local:missing" }), /does not belong/);

  let records = [];
  for (let index = 0; index < LOCAL_VERSION_LIMIT; index += 1) {
    records = append(records, {
      id: `local:limit-${index}`,
      name: `Limit ${index}`,
      createdAt: `2026-08-05T00:${String(index).padStart(2, "0")}:00.000Z`,
    });
  }
  assert.throws(() => append(records, { id: "local:overflow", name: "Overflow" }), /limit reached/);
});

test("corrupt or unsupported local records fail closed", () => {
  const [valid] = append([]);
  assert.ok(valid);
  assert.deepEqual(parseLocalVersions("not-json"), []);
  assert.deepEqual(parseLocalVersions(JSON.stringify([{ ...valid, checksum: "fnv1a32:00000000" }])), []);
  assert.deepEqual(parseLocalVersions(JSON.stringify([{ ...valid, storeVersion: 2 }])), []);
});

test("storage failures do not replace the previously persisted store", () => {
  const previous = JSON.stringify(append([]));
  const storage = {
    value: previous,
    setItem(key, value) {
      assert.equal(key, LOCAL_VERSION_STORAGE_KEY);
      assert.notEqual(value, previous);
      throw new Error("quota exceeded");
    },
  };
  assert.throws(() => writeLocalVersions(storage, append(append([]))), /quota exceeded/);
  assert.equal(storage.value, previous);
});

test("humanoid version documents validate, restore exact pixels, and compare", () => {
  const baseline = createBlankPixels("wide-arm-64");
  const edited = new Uint8ClampedArray(baseline);
  edited.set([255, 0, 255, 255], 8 * 64 * 4 + 8 * 4);
  const baselineJson = serializeSkinVersionDocument("wide-arm-64", baseline);
  const editedJson = serializeSkinVersionDocument("wide-arm-64", edited);

  assert.deepEqual(parseSkinVersionDocument(baselineJson), {
    profile: "wide-arm-64",
    pixels: baseline,
  });
  assert.equal(countChangedSkinPixels(baselineJson, editedJson), 1);
  assert.throws(() => parseSkinVersionDocument(JSON.stringify({ kind: "voxl.humanoid-skin/v1" })), /invalid/);
});

test("transparent versions exclude identity and restore validated content", () => {
  const character = initialTransparentState("2026-08-05T00:00:00.000Z").characters[0];
  assert.ok(character);
  const baselineJson = serializeTransparentVersionDocument(character);
  const baseline = JSON.parse(baselineJson);
  assert.equal("name" in baseline, false);

  const lines = [...character.lines];
  lines[0] = `1${lines[0].slice(1)}`;
  const editedJson = serializeTransparentVersionDocument({ ...character, lines });
  assert.deepEqual(parseTransparentVersionDocument(baselineJson), {
    lines: character.lines,
    scale: character.scale,
    fps: character.fps,
    palette: character.palette,
    effects: character.effects,
  });
  assert.equal(countChangedTransparentPixels(baselineJson, editedJson), 1);
  assert.equal(countChangedTransparentSettings(
    baselineJson,
    serializeTransparentVersionDocument({ ...character, fps: character.fps + 1 }),
  ), 1);
  assert.throws(() => parseTransparentVersionDocument(JSON.stringify({ ...baseline, fps: 0 })), /invalid/);
});
