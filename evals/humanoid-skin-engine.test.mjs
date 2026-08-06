import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { EngineRegistry } from "../packages/engine-contracts/src/index.mjs";
import {
  HUMANOID_SKIN_PROFILE_IDS,
  HUMANOID_SKIN_PROFILES,
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  createHumanoidSkinEngine,
  createMappedPixelMask,
  createUnusedPixelMask,
  decodeRgbaPng,
  encodeRgbaPng,
  exportHumanoidSkinPng,
  getHumanoidSkinRegion,
  importHumanoidSkinPng,
  renderHumanoidSkinPreviews,
  validateHumanoidSkinDocument,
} from "../packages/engine-voxl-humanoid-skin/src/index.mjs";

const root = resolve(import.meta.dirname, "..");

function setPixel(document, x, y, rgba) {
  const offset = (y * document.width + x) * 4;
  document.pixels.set(rgba, offset);
}

function paintRegion(document, region, rgba) {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) setPixel(document, x, y, rgba);
  }
}

test("defines scale-aware, non-overlapping wide and slim UV maps", () => {
  assert.deepEqual(HUMANOID_SKIN_PROFILE_IDS, [
    "wide-arm-64",
    "slim-arm-64",
    "wide-arm-128",
    "slim-arm-128",
  ]);
  assert.equal(createMappedPixelMask("wide-arm-64").reduce((sum, value) => sum + value, 0), 3264);
  assert.equal(createMappedPixelMask("slim-arm-64").reduce((sum, value) => sum + value, 0), 3136);
  assert.equal(createMappedPixelMask("wide-arm-128").reduce((sum, value) => sum + value, 0), 3264 * 4);
  assert.equal(createMappedPixelMask("slim-arm-128").reduce((sum, value) => sum + value, 0), 3136 * 4);

  for (const profile of Object.values(HUMANOID_SKIN_PROFILES)) {
    const regionArea = profile.regions.reduce((sum, region) => {
      assert.ok(region.x >= 0 && region.y >= 0);
      assert.ok(region.x + region.width <= profile.width);
      assert.ok(region.y + region.height <= profile.height);
      return sum + region.width * region.height;
    }, 0);
    assert.equal(createMappedPixelMask(profile.id).reduce((sum, value) => sum + value, 0), regionArea);
  }

  assert.deepEqual(
    getHumanoidSkinRegion("slim-arm-64", "right-arm", "base", "front"),
    { part: "right-arm", layer: "base", face: "front", x: 44, y: 20, width: 3, height: 12 },
  );
  assert.deepEqual(
    getHumanoidSkinRegion("slim-arm-128", "right-arm", "base", "front"),
    { part: "right-arm", layer: "base", face: "front", x: 88, y: 40, width: 6, height: 24 },
  );
  assert.deepEqual(
    HUMANOID_SKIN_PROFILES["wide-arm-64"].geometry,
    HUMANOID_SKIN_PROFILES["wide-arm-128"].geometry,
  );
  assert.deepEqual(
    HUMANOID_SKIN_PROFILES["slim-arm-64"].geometry,
    HUMANOID_SKIN_PROFILES["slim-arm-128"].geometry,
  );
  assert.deepEqual(
    getHumanoidSkinRegion("wide-arm-64", "left-arm", "outer", "back"),
    { part: "left-arm", layer: "outer", face: "back", x: 60, y: 52, width: 4, height: 12 },
  );
});

test("creates deterministic exact-face, cropped, union, and unused masks", () => {
  const face = getHumanoidSkinRegion("slim-arm-64", "left-leg", "base", "front");
  const cropped = createHumanoidSkinSelectionMask("slim-arm-64", [{
    part: "left-leg",
    layer: "base",
    face: "front",
    y: face.height - 4,
    height: 4,
  }]);
  assert.equal(cropped.reduce((sum, value) => sum + value, 0), face.width * 4);
  assert.equal(cropped[(face.y + face.height - 4) * 64 + face.x], 1);
  assert.equal(cropped[(face.y + face.height - 5) * 64 + face.x], 0);

  const union = createHumanoidSkinSelectionMask("wide-arm-64", [
    { part: "torso", layer: "base", face: "front" },
    { part: "torso", layer: "base", face: "back" },
  ]);
  assert.equal(union.reduce((sum, value) => sum + value, 0), 8 * 12 * 2);

  const unused = createUnusedPixelMask("wide-arm-64");
  assert.equal(
    unused.reduce((sum, value) => sum + value, 0),
    64 * 64 - createMappedPixelMask("wide-arm-64").reduce((sum, value) => sum + value, 0),
  );
  assert.throws(() => createHumanoidSkinSelectionMask("wide-arm-64", []), /non-empty/);
  assert.throws(() => createHumanoidSkinSelectionMask("wide-arm-64", [{
    part: "head", layer: "base", face: "front", x: 8, width: 1,
  }]), /outside/);
});

test("validates fixture cases with actionable issue codes", async () => {
  const cases = JSON.parse(await readFile(
    join(root, "evals/fixtures/voxl-humanoid-skin/cases.json"),
    "utf8",
  ));

  for (const fixture of cases) {
    const document = createBlankHumanoidSkinDocument(fixture.profile);
    if (fixture.mutation === "wrong-width") document.width = 63;
    if (fixture.mutation === "short-buffer") document.pixels = document.pixels.subarray(0, -4);
    if (fixture.mutation === "visible-unused") setPixel(document, 63, 31, [255, 0, 0, 255]);
    if (fixture.mutation === "visible-wide-only") setPixel(document, 55, 20, [255, 0, 0, 255]);
    if (fixture.mutation === "sidecar-mismatch") document.sidecar.profile = "slim-arm-64";

    const result = validateHumanoidSkinDocument(document);
    assert.equal(result.ok, fixture.ok, fixture.name);
    if (fixture.code) assert.ok(result.issues.some(({ code }) => code === fixture.code), fixture.name);
  }
});

test("allows base transparency with an explicit warning", () => {
  const document = createBlankHumanoidSkinDocument("wide-arm-64");
  const front = getHumanoidSkinRegion("wide-arm-64", "head", "base", "front");
  setPixel(document, front.x, front.y, [0, 0, 0, 0]);

  const result = validateHumanoidSkinDocument(document);
  assert.equal(result.ok, true);
  assert.ok(result.issues.some(({ code, severity }) => code === "transparent_base_pixels" && severity === "warning"));
});

test("round-trips exact RGBA pixels and detects both arm profiles", () => {
  for (const profile of HUMANOID_SKIN_PROFILE_IDS) {
    const document = createBlankHumanoidSkinDocument(profile, { baseColor: [21, 43, 65, 255] });
    const outerFront = getHumanoidSkinRegion(profile, "torso", "outer", "front");
    paintRegion(document, outerFront, [200, 100, 50, 128]);
    const png = exportHumanoidSkinPng(document);
    const imported = importHumanoidSkinPng(png, { profile: "auto" });

    assert.equal(imported.profile, profile);
    assert.deepEqual(imported.pixels, document.pixels);
    assert.deepEqual(exportHumanoidSkinPng(imported), png);
  }
});

test("rejects PNG dimensions and checksum corruption", () => {
  const wrongSize = encodeRgbaPng(32, 32, Buffer.alloc(32 * 32 * 4));
  assert.throws(() => importHumanoidSkinPng(wrongSize), /dimensions are invalid/);

  const valid = exportHumanoidSkinPng(createBlankHumanoidSkinDocument("wide-arm-64"));
  const corrupted = Buffer.from(valid);
  corrupted[corrupted.length - 5] ^= 0xff;
  assert.throws(() => decodeRgbaPng(corrupted), /checksum/);
});

test("renders deterministic density-aware front and back nearest-neighbor previews", () => {
  for (const profile of ["slim-arm-64", "slim-arm-128"]) {
    const document = createBlankHumanoidSkinDocument(profile, { baseColor: [10, 20, 30, 255] });
    paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "base", "front"), [255, 0, 0, 255]);
    paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "base", "back"), [0, 0, 255, 255]);
    paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "outer", "front"), [0, 255, 0, 128]);

    const first = renderHumanoidSkinPreviews(document, { scale: 4 });
    const second = renderHumanoidSkinPreviews(document, { scale: 4 });
    const densityScale = document.width / 64;
    assert.equal(first.length, 2);
    assert.equal(first[0].width, 64 * densityScale);
    assert.equal(first[0].height, 128 * densityScale);
    assert.deepEqual(first.map(({ bytes }) => bytes), second.map(({ bytes }) => bytes));
    assert.notDeepEqual(first[0].bytes, first[1].bytes);
  }
});

test("registers, validates, renders, and exports without a generation provider", async () => {
  const registry = new EngineRegistry([createHumanoidSkinEngine()]);
  const descriptor = registry.getDescriptor("voxl-humanoid-skin");
  const document = createBlankHumanoidSkinDocument("wide-arm-64");

  assert.equal(descriptor.capabilities.create, false);
  assert.equal(descriptor.capabilities.revise, false);
  assert.equal((await registry.invoke("voxl-humanoid-skin", "validate", document)).ok, true);
  assert.equal((await registry.invoke("voxl-humanoid-skin", "render", { document })).length, 2);
  const exported = await registry.invoke("voxl-humanoid-skin", "export", {
    document,
    profile: "wide-arm-64",
  });
  assert.equal(exported.bytes.length > 0, true);
  assert.match(exported.sha256, /^[a-f0-9]{64}$/);
});

test("passes independent PNG import smoke tests for each density", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "voxl-humanoid-skin-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  for (const size of [64, 128]) {
    const profile = `wide-arm-${size}`;
    const path = join(directory, `${profile}.png`);
    await writeFile(path, exportHumanoidSkinPng(createBlankHumanoidSkinDocument(profile)));
    const probe = JSON.parse(execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name,pix_fmt,width,height",
      "-of",
      "json",
      path,
    ], { encoding: "utf8" }));

    assert.deepEqual(probe.streams[0], {
      codec_name: "png",
      width: size,
      height: size,
      pix_fmt: "rgba",
    });
  }
});
