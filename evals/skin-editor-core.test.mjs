import assert from "node:assert/strict";
import test from "node:test";
import {
  createBlankSkinPixels,
  convertSkinProfile,
  pixelRegion,
  renderSkinPreviewPixels,
  skinMappedMask,
  skinProfile,
  validateSkinPixels,
} from "../apps/studio/public/skin-editor-core.js";
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
    assert.deepEqual(skinMappedMask(profileId), createMappedPixelMask(profileId));
  }
});

test("blank drafts validate and atlas coordinates resolve to semantic regions", () => {
  const pixels = createBlankSkinPixels("wide-arm-64");
  assert.equal(validateSkinPixels("wide-arm-64", pixels).ok, true);
  assert.deepEqual(pixelRegion("wide-arm-64", 8, 8), {
    part: "head", layer: "base", face: "front", x: 8, y: 8, width: 8, height: 8,
  });
  assert.equal(pixelRegion("wide-arm-64", 63, 0), undefined);
});

test("profile conversion clears pixels outside the destination UV map", () => {
  const wide = createBlankSkinPixels("wide-arm-64");
  const wideOnly = skinMappedMask("wide-arm-64").findIndex((value, index) => value && !skinMappedMask("slim-arm-64")[index]);
  assert.notEqual(wideOnly, -1);
  wide.set([255, 0, 0, 255], wideOnly * 4);
  const slim = convertSkinProfile(wide, "slim-arm-64");
  assert.deepEqual(Array.from(slim.slice(wideOnly * 4, wideOnly * 4 + 4)), [0, 0, 0, 0]);
  assert.equal(validateSkinPixels("slim-arm-64", slim).ok, true);
});

test("browser front and back previews match deterministic engine output", () => {
  for (const view of ["front", "back"]) {
    const document = createBlankHumanoidSkinDocument("wide-arm-64", { baseColor: [12, 34, 56, 255] });
    const browser = renderSkinPreviewPixels(document.profile, document.pixels, { view });
    const engine = renderHumanoidSkinPreview(document, { view, scale: 1 });
    assert.equal(browser.width, engine.width);
    assert.equal(browser.height, engine.height);
    assert.deepEqual(Array.from(browser.pixels), Array.from(engine.pixels));
  }
});

test("preview visibility controls are presentation-only", () => {
  const pixels = createBlankSkinPixels("wide-arm-64", [90, 100, 110, 255]);
  const hiddenHead = renderSkinPreviewPixels("wide-arm-64", pixels, {
    parts: ["torso", "right-arm", "left-arm", "right-leg", "left-leg"],
  });
  assert.equal(hiddenHead.pixels.slice(0, 16 * 8 * 4).some(Boolean), false);
  assert.equal(validateSkinPixels("wide-arm-64", pixels).ok, true);
});
