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
  createHumanoidSkinEngine,
  createMappedPixelMask,
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
  const offset = (y * 64 + x) * 4;
  document.pixels.set(rgba, offset);
}

function paintRegion(document, region, rgba) {
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) setPixel(document, x, y, rgba);
  }
}

test("defines non-overlapping wide and slim UV maps within the 64x64 atlas", () => {
  assert.deepEqual(HUMANOID_SKIN_PROFILE_IDS, ["wide-arm-64", "slim-arm-64"]);
  assert.equal(createMappedPixelMask("wide-arm-64").reduce((sum, value) => sum + value, 0), 3264);
  assert.equal(createMappedPixelMask("slim-arm-64").reduce((sum, value) => sum + value, 0), 3136);

  for (const profile of Object.values(HUMANOID_SKIN_PROFILES)) {
    const regionArea = profile.regions.reduce((sum, region) => {
      assert.ok(region.x >= 0 && region.y >= 0);
      assert.ok(region.x + region.width <= 64);
      assert.ok(region.y + region.height <= 64);
      return sum + region.width * region.height;
    }, 0);
    assert.equal(createMappedPixelMask(profile.id).reduce((sum, value) => sum + value, 0), regionArea);
  }

  assert.deepEqual(
    getHumanoidSkinRegion("slim-arm-64", "right-arm", "base", "front"),
    { part: "right-arm", layer: "base", face: "front", x: 44, y: 20, width: 3, height: 12 },
  );
  assert.deepEqual(
    getHumanoidSkinRegion("wide-arm-64", "left-arm", "outer", "back"),
    { part: "left-arm", layer: "outer", face: "back", x: 60, y: 52, width: 4, height: 12 },
  );
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

test("renders deterministic front and back nearest-neighbor previews", () => {
  const document = createBlankHumanoidSkinDocument("slim-arm-64", { baseColor: [10, 20, 30, 255] });
  paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "base", "front"), [255, 0, 0, 255]);
  paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "base", "back"), [0, 0, 255, 255]);
  paintRegion(document, getHumanoidSkinRegion(document.profile, "head", "outer", "front"), [0, 255, 0, 128]);

  const first = renderHumanoidSkinPreviews(document, { scale: 4 });
  const second = renderHumanoidSkinPreviews(document, { scale: 4 });
  assert.equal(first.length, 2);
  assert.equal(first[0].width, 64);
  assert.equal(first[0].height, 128);
  assert.deepEqual(first.map(({ bytes }) => bytes), second.map(({ bytes }) => bytes));
  assert.notDeepEqual(first[0].bytes, first[1].bytes);
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

test("passes an independent PNG import smoke test", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "voxl-humanoid-skin-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "wide-arm-64.png");
  await writeFile(path, exportHumanoidSkinPng(createBlankHumanoidSkinDocument("wide-arm-64")));
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
    width: 64,
    height: 64,
    pix_fmt: "rgba",
  });
});
