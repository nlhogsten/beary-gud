import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
  HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS,
  HUMANOID_SKIN_PROFILE_IDS,
  HumanoidSkinRepresentationError,
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  decodeRgbaPng,
  encodeRgbaPng,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
  normalizeHumanoidSkinGenerationCandidate,
  renderHumanoidSkinGenerationRepresentation,
  validateHumanoidSkinDocument,
} from "../packages/engine-voxl-humanoid-skin/src/index.mjs";

function setPixel(document, x, y, rgba) {
  document.pixels.set(rgba, (y * document.width + x) * 4);
}

function getPixel(document, x, y) {
  const offset = (y * document.width + x) * 4;
  return [...document.pixels.subarray(offset, offset + 4)];
}

function paintRegion(document, region, rgba) {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      setPixel(document, x, y, rgba);
    }
  }
}

function patternedDocument(profileId) {
  const document = createBlankHumanoidSkinDocument(profileId, { baseColor: [31, 47, 61, 255] });
  const profile = getHumanoidSkinProfile(profileId);
  profile.regions.forEach((region, index) => {
    if (region.layer === "outer" && index % 3 === 0) return;
    paintRegion(document, region, [
      (index * 41 + 17) % 241,
      (index * 67 + 23) % 239,
      (index * 89 + 31) % 237,
      region.layer === "outer" && index % 4 === 0 ? 160 : 255,
    ]);
  });
  return document;
}

function assertRepresentationError(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof HumanoidSkinRepresentationError);
    assert.equal(error.code, code);
    return true;
  });
}

test("renders both generation representations deterministically for every profile", () => {
  assert.deepEqual(HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS, [
    "direct-atlas-v1",
    "surface-sheet-v1",
  ]);
  for (const profile of HUMANOID_SKIN_PROFILE_IDS) {
    const document = patternedDocument(profile);
    for (const representationId of HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS) {
      const first = renderHumanoidSkinGenerationRepresentation(document, representationId);
      const second = renderHumanoidSkinGenerationRepresentation(document, representationId);
      assert.equal(first.template.width, HUMANOID_SKIN_GENERATION_CANVAS_SIZE);
      assert.equal(first.template.height, HUMANOID_SKIN_GENERATION_CANVAS_SIZE);
      assert.match(first.template.sha256, /^[a-f0-9]{64}$/);
      assert.equal(first.template.sha256, second.template.sha256);
      assert.equal(first.guide.sha256, second.guide.sha256);
      assert.notEqual(first.template.sha256, first.guide.sha256);
      assert.deepEqual(decodeRgbaPng(first.template.bytes).pixels.length, 1024 * 1024 * 4);
      if (representationId === "surface-sheet-v1") {
        assert.equal(first.layout.panels.length, getHumanoidSkinProfile(profile).regions.length);
      }
    }
  }
});

test("round-trips simulated direct-atlas and surface-sheet outputs into valid documents", () => {
  for (const profile of ["wide-arm-64", "slim-arm-128"]) {
    const expected = patternedDocument(profile);
    for (const representationId of HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS) {
      const representation = renderHumanoidSkinGenerationRepresentation(expected, representationId);
      const normalized = normalizeHumanoidSkinGenerationCandidate({
        representationId,
        profile,
        candidatePng: representation.template.bytes,
      });
      assert.deepEqual(normalized.document.pixels, expected.pixels);
      assert.equal(validateHumanoidSkinDocument(normalized.document).ok, true);
      assert.equal(normalized.report.representationId, representationId);
      assert.equal(normalized.report.revisionApplied, false);
    }
  }
});

test("reduces noisy atlas blocks deterministically and restores invalid regions", () => {
  const document = patternedDocument("wide-arm-64");
  const representation = renderHumanoidSkinGenerationRepresentation(document, "direct-atlas-v1");
  const candidate = decodeRgbaPng(representation.template.bytes);
  const head = getHumanoidSkinRegion(document.profile, "head", "base", "front");
  const sourceColor = getPixel(document, head.x, head.y);
  const blockSize = representation.layout.blockSize;
  setPixel(
    { pixels: candidate.pixels, width: candidate.width },
    head.x * blockSize,
    head.y * blockSize,
    [255, 255, 255, 255],
  );
  const unusedX = 63;
  const unusedY = 31;
  for (let y = unusedY * blockSize; y < (unusedY + 1) * blockSize; y += 1) {
    for (let x = unusedX * blockSize; x < (unusedX + 1) * blockSize; x += 1) {
      candidate.pixels.set([200, 10, 20, 255], (y * candidate.width + x) * 4);
    }
  }
  const normalized = normalizeHumanoidSkinGenerationCandidate({
    representationId: "direct-atlas-v1",
    profile: document.profile,
    candidatePng: encodeRgbaPng(candidate.width, candidate.height, candidate.pixels),
  });
  assert.deepEqual(getPixel(normalized.document, head.x, head.y), sourceColor);
  assert.deepEqual(getPixel(normalized.document, unusedX, unusedY), [0, 0, 0, 0]);
  assert.equal(normalized.report.invalidRegionsRestored, 1);
});

test("composites revisions only inside the editable mask and reports attempted protected changes", () => {
  const profile = "wide-arm-64";
  const baseline = createBlankHumanoidSkinDocument(profile, { baseColor: [20, 30, 40, 255] });
  const generated = createBlankHumanoidSkinDocument(profile, { baseColor: [200, 150, 100, 255] });
  const editableMask = createHumanoidSkinSelectionMask(profile, [
    { part: "torso", layer: "base", face: "front" },
  ]);
  const protectedMask = createHumanoidSkinSelectionMask(profile, [
    { part: "head", layer: "base", face: "front" },
  ]);
  const immutableMask = createHumanoidSkinSelectionMask(profile, [
    { part: "head", layer: "base", face: "back" },
  ]);
  const representation = renderHumanoidSkinGenerationRepresentation(generated, "direct-atlas-v1");
  const normalized = normalizeHumanoidSkinGenerationCandidate({
    representationId: "direct-atlas-v1",
    profile,
    candidatePng: representation.template.bytes,
    baselineDocument: baseline,
    editableMask,
    protectedMask,
    immutableMask,
  });
  const torso = getHumanoidSkinRegion(profile, "torso", "base", "front");
  const headFront = getHumanoidSkinRegion(profile, "head", "base", "front");
  assert.deepEqual(getPixel(normalized.document, torso.x, torso.y), [200, 150, 100, 255]);
  assert.deepEqual(getPixel(normalized.document, headFront.x, headFront.y), [20, 30, 40, 255]);
  assert.ok(normalized.report.protectedChangedTexelsBeforeComposite > 0);
  assert.ok(normalized.report.immutableChangedTexelsBeforeComposite > 0);
  assert.equal(normalized.report.protectedChangedTexelsAfterComposite, 0);
  assert.equal(normalized.report.immutableChangedTexelsAfterComposite, 0);
});

test("rejects malformed candidate dimensions, sheet structure, and revision masks actionably", () => {
  const profile = "slim-arm-64";
  const document = patternedDocument(profile);
  const direct = renderHumanoidSkinGenerationRepresentation(document, "direct-atlas-v1");
  assertRepresentationError(() => normalizeHumanoidSkinGenerationCandidate({
    representationId: direct.id,
    profile,
    candidatePng: encodeRgbaPng(512, 512, Buffer.alloc(512 * 512 * 4)),
  }), "candidate_dimensions_invalid");

  const sheet = renderHumanoidSkinGenerationRepresentation(document, "surface-sheet-v1");
  const corrupted = decodeRgbaPng(sheet.template.bytes);
  const marker = sheet.layout.panels[0].marker;
  corrupted.pixels[(marker.y * corrupted.width + marker.x) * 4] ^= 0xff;
  assertRepresentationError(() => normalizeHumanoidSkinGenerationCandidate({
    representationId: sheet.id,
    profile,
    candidatePng: encodeRgbaPng(corrupted.width, corrupted.height, corrupted.pixels),
  }), "surface_sheet_structure_changed");

  const overlap = createHumanoidSkinSelectionMask(profile, [
    { part: "torso", layer: "base", face: "front" },
  ]);
  assertRepresentationError(() => normalizeHumanoidSkinGenerationCandidate({
    representationId: direct.id,
    profile,
    candidatePng: direct.template.bytes,
    baselineDocument: document,
    editableMask: overlap,
    protectedMask: overlap,
  }), "revision_masks_overlap");
});

test("offline representation code has no provider, credential, network, or billing path", async () => {
  const source = await readFile(
    new URL("../packages/engine-voxl-humanoid-skin/src/generation-representations.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /generation-provider-contracts/);
  assert.doesNotMatch(source, /entitlement|billing|credential/i);
});
