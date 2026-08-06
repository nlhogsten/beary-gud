import assert from "node:assert/strict";
import test from "node:test";
import {
  createBlankPixels,
  CUBOID_HUMANOID_RENDERER_ID,
  convertProfile,
  detectProfile,
  mappedMask,
  pixelRegion,
  renderPreview,
  skinProfile,
  validatePixels,
  uvToAtlasPixel,
} from "../apps/studio/src/studio/humanoid/core.ts";
import {
  createBlankHumanoidSkinDocument,
  createMappedPixelMask,
  getHumanoidSkinProfile,
  renderHumanoidSkinPreview,
} from "../packages/engine-voxl-humanoid-skin/src/index.mjs";

test("browser UV profiles exactly mirror the package engine", () => {
  for (const profileId of ["wide-arm-64", "slim-arm-64"]) {
    const browser = skinProfile(profileId);
    const engine = getHumanoidSkinProfile(profileId);
    assert.equal(browser.armWidth, engine.armWidth);
    assert.deepEqual(browser.regions, engine.regions);
    assert.deepEqual(mappedMask(profileId), createMappedPixelMask(profileId));
  }
});

test("blank drafts validate and atlas coordinates resolve to semantic regions", () => {
  const pixels = createBlankPixels("wide-arm-64");
  assert.equal(validatePixels("wide-arm-64", pixels).ok, true);
  assert.deepEqual(pixelRegion("wide-arm-64", 8, 8), {
    part: "head", layer: "base", face: "front", x: 8, y: 8, width: 8, height: 8,
  });
  assert.equal(pixelRegion("wide-arm-64", 63, 0), undefined);
});

test("profile conversion clears pixels outside the destination UV map", () => {
  const wide = createBlankPixels("wide-arm-64");
  const wideOnly = mappedMask("wide-arm-64").findIndex((value, index) => value && !mappedMask("slim-arm-64")[index]);
  assert.notEqual(wideOnly, -1);
  wide.set([255, 0, 0, 255], wideOnly * 4);
  const slim = convertProfile(wide, "wide-arm-64", "slim-arm-64");
  assert.deepEqual(Array.from(slim.slice(wideOnly * 4, wideOnly * 4 + 4)), [0, 0, 0, 0]);
  assert.equal(validatePixels("slim-arm-64", slim).ok, true);
});

test("profile conversion round-trips required base regions", () => {
  const wide = createBlankPixels("wide-arm-64", [21, 43, 65, 255]);
  const slim = convertProfile(wide, "wide-arm-64", "slim-arm-64");
  const restored = convertProfile(slim, "slim-arm-64", "wide-arm-64");
  const validation = validatePixels("wide-arm-64", restored);

  assert.deepEqual(validation, { ok: true, issues: [] });
  assert.equal(detectProfile(restored), "wide-arm-64");
});

test("browser front and back previews match deterministic engine output", () => {
  for (const view of ["front", "back"]) {
    const document = createBlankHumanoidSkinDocument("wide-arm-64", { baseColor: [12, 34, 56, 255] });
    const browserPixels = renderPreview(document.profile, document.pixels, view, ["base", "outer"], ["head", "torso", "right-arm", "left-arm", "right-leg", "left-leg"]);
    const engine = renderHumanoidSkinPreview(document, { view, scale: 1 });
    assert.equal(16, engine.width);
    assert.equal(32, engine.height);
    assert.deepEqual(Array.from(browserPixels), Array.from(engine.pixels));
  }
});

test("preview visibility controls are presentation-only", () => {
  const pixels = createBlankPixels("wide-arm-64", [90, 100, 110, 255]);
  const hiddenHead = renderPreview("wide-arm-64", pixels, "front", ["base", "outer"], ["torso", "right-arm", "left-arm", "right-leg", "left-leg"]);
  assert.equal(hiddenHead.slice(0, 16 * 8 * 4).some(Boolean), false);
  assert.equal(validatePixels("wide-arm-64", pixels).ok, true);
});

test("3D renderer maps raycast UVs back to target-neutral atlas pixels", () => {
  assert.equal(CUBOID_HUMANOID_RENDERER_ID, "cuboid-humanoid-renderer");
  const face = pixelRegion("wide-arm-64", 8, 8);
  assert.ok(face);
  assert.deepEqual(uvToAtlasPixel(face, 0, 1), { x: 8, y: 8 });
  assert.deepEqual(uvToAtlasPixel(face, 0.999, 0.001), { x: 15, y: 15 });
});
