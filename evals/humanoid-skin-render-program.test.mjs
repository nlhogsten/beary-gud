import assert from "node:assert/strict";
import test from "node:test";
import {
  HUMANOID_SKIN_RENDER_PROGRAM_KIND,
  HumanoidSkinRenderProgramError,
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  describeHumanoidSkinRenderProgram,
  executeHumanoidSkinRenderProgram,
  getHumanoidSkinProfile,
  validateHumanoidSkinDocument,
  validateHumanoidSkinRenderProgram,
} from "../packages/engine-voxl-humanoid-skin/src/index.mjs";

function program(profile, operations) {
  return {
    kind: HUMANOID_SKIN_RENDER_PROGRAM_KIND,
    formatVersion: 1,
    profile,
    operations,
  };
}

function surface(part, layer, face) {
  return { part, layer, face };
}

function expectProgramError(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof HumanoidSkinRenderProgramError);
    assert.equal(error.code, code);
    return true;
  });
}

test("describes the complete local-coordinate tool contract without engine source", () => {
  const contract = describeHumanoidSkinRenderProgram("wide-arm-64");
  assert.equal(contract.kind, HUMANOID_SKIN_RENDER_PROGRAM_KIND);
  assert.equal(contract.surfaces.length, 72);
  assert.deepEqual(contract.operations.map(({ op }) => op), [
    "fill",
    "paint-texels",
    "checker",
    "stripes",
    "copy-surface",
  ]);
  assert.deepEqual(
    contract.surfaces.find(({ id }) => id === "head.base.front"),
    { id: "head.base.front", part: "head", layer: "base", face: "front", width: 8, height: 8 },
  );
  assert.match(contract.semantics.coordinates, /Surface-local/);
});

test("executes bounded primitives deterministically into a valid document", () => {
  const fixture = program("wide-arm-64", [
    { op: "fill", surface: surface("head", "base", "front"), rgba: [20, 30, 40, 255] },
    {
      op: "checker",
      surface: surface("torso", "base", "front"),
      colors: [[200, 20, 30, 255], [10, 40, 180, 255]],
      cellWidth: 2,
      cellHeight: 3,
    },
    {
      op: "stripes",
      surface: surface("right-arm", "base", "front"),
      colors: [[240, 240, 240, 255], [30, 30, 30, 255]],
      stripeWidth: 1,
      direction: "horizontal",
    },
    {
      op: "paint-texels",
      surface: surface("head", "outer", "front"),
      texels: [{ x: 3, y: 2, rgba: [80, 220, 160, 192] }],
    },
    {
      op: "copy-surface",
      from: surface("right-arm", "base", "front"),
      to: surface("left-arm", "base", "front"),
      transform: "mirror-x",
    },
  ]);
  const first = executeHumanoidSkinRenderProgram({ program: fixture });
  const second = executeHumanoidSkinRenderProgram({ program: fixture });
  const reordered = executeHumanoidSkinRenderProgram({
    program: {
      operations: fixture.operations.map((operation) => ({
        ...Object.fromEntries(Object.entries(operation).reverse()),
      })),
      profile: fixture.profile,
      formatVersion: fixture.formatVersion,
      kind: fixture.kind,
    },
  });
  assert.deepEqual(first.document.pixels, second.document.pixels);
  assert.equal(first.programSha256, second.programSha256);
  assert.equal(first.programSha256, reordered.programSha256);
  assert.equal(first.report.operationsExecuted, 5);
  assert.equal(first.report.texelWrites, 257);
  assert.equal(validateHumanoidSkinDocument(first.document).ok, true);
  assert.equal(first.document.sidecar.operations.at(-1).programSha256, first.programSha256);
});

test("paint-texels can express every mapped output texel without finite semantic parameters", () => {
  const profile = getHumanoidSkinProfile("wide-arm-128");
  const expected = createBlankHumanoidSkinDocument(profile.id);
  const operations = profile.regions.map((region, regionIndex) => ({
    op: "paint-texels",
    surface: surface(region.part, region.layer, region.face),
    texels: Array.from({ length: region.width * region.height }, (_, index) => {
      const x = index % region.width;
      const y = Math.floor(index / region.width);
      const rgba = [
        (regionIndex * 37 + x * 11 + y * 3) % 256,
        (regionIndex * 19 + x * 5 + y * 13) % 256,
        (regionIndex * 7 + x * 17 + y * 23) % 256,
        region.layer === "base" ? 255 : (regionIndex * 29 + x * 31 + y * 2) % 256,
      ];
      const offset = ((region.y + y) * profile.width + region.x + x) * 4;
      expected.pixels.set(rgba, offset);
      return { x, y, rgba };
    }),
  }));
  const result = executeHumanoidSkinRenderProgram({ program: program(profile.id, operations) });
  assert.deepEqual(result.document.pixels, expected.pixels);
  assert.equal(validateHumanoidSkinDocument(result.document).ok, true);
});

test("rejects unknown code-like operations, bad coordinates, unknown fields, and exhausted budgets", () => {
  const unsafe = program("wide-arm-64", [{ op: "shell", command: "printenv" }]);
  const unsafeValidation = validateHumanoidSkinRenderProgram(unsafe);
  assert.equal(unsafeValidation.ok, false);
  assert.ok(unsafeValidation.issues.some(({ code }) => code === "unsupported_operation"));

  const outOfBounds = program("wide-arm-64", [{
    op: "paint-texels",
    surface: surface("head", "base", "front"),
    texels: [{ x: 8, y: 0, rgba: [0, 0, 0, 255], script: "fetch('https://example.test')" }],
  }]);
  const boundsValidation = validateHumanoidSkinRenderProgram(outOfBounds);
  assert.ok(boundsValidation.issues.some(({ code }) => code === "texel_out_of_bounds"));
  assert.ok(boundsValidation.issues.some(({ code }) => code === "unknown_field"));
  expectProgramError(
    () => executeHumanoidSkinRenderProgram({ program: outOfBounds }),
    "render_program_invalid",
  );

  const tooManyOperations = program("wide-arm-64", Array.from({ length: 513 }, () => ({
    op: "fill",
    surface: surface("head", "base", "front"),
    rgba: [0, 0, 0, 255],
  })));
  assert.ok(validateHumanoidSkinRenderProgram(tooManyOperations).issues.some(
    ({ code }) => code === "operation_limit_exceeded",
  ));

  const tooManyWrites = program("wide-arm-128", Array.from({ length: 512 }, () => ({
    op: "fill",
    surface: surface("head", "base", "front"),
    rgba: [0, 0, 0, 255],
  })));
  assert.ok(validateHumanoidSkinRenderProgram(tooManyWrites).issues.some(
    ({ code }) => code === "texel_write_limit_exceeded",
  ));
});

test("revision execution composites every non-editable texel back to the baseline", () => {
  const baseline = createBlankHumanoidSkinDocument("wide-arm-64", { baseColor: [11, 22, 33, 255] });
  const editableMask = createHumanoidSkinSelectionMask(baseline.profile, [
    { part: "torso", layer: "base", face: "front" },
  ]);
  const protectedMask = createHumanoidSkinSelectionMask(baseline.profile, [
    { part: "head", layer: "base", face: "front" },
  ]);
  const immutableMask = createHumanoidSkinSelectionMask(baseline.profile, [
    { part: "head", layer: "base", face: "back" },
  ]);
  const fixture = program(baseline.profile, [
    { op: "fill", surface: surface("head", "base", "front"), rgba: [250, 0, 0, 255] },
    { op: "fill", surface: surface("head", "base", "back"), rgba: [0, 250, 0, 255] },
    { op: "fill", surface: surface("torso", "base", "front"), rgba: [0, 0, 250, 255] },
  ]);
  const result = executeHumanoidSkinRenderProgram({
    program: fixture,
    baselineDocument: baseline,
    editableMask,
    protectedMask,
    immutableMask,
  });
  for (let pixel = 0; pixel < editableMask.length; pixel += 1) {
    const offset = pixel * 4;
    const expected = editableMask[pixel] ? [0, 0, 250, 255] : [...baseline.pixels.subarray(offset, offset + 4)];
    assert.deepEqual([...result.document.pixels.subarray(offset, offset + 4)], expected);
  }
  assert.ok(result.report.protectedChangedTexelsBeforeComposite > 0);
  assert.ok(result.report.immutableChangedTexelsBeforeComposite > 0);
  assert.equal(result.report.protectedChangedTexelsAfterComposite, 0);
  assert.equal(result.report.immutableChangedTexelsAfterComposite, 0);

  expectProgramError(
    () => executeHumanoidSkinRenderProgram({ program: fixture, editableMask }),
    "baseline_required",
  );
  expectProgramError(
    () => executeHumanoidSkinRenderProgram({
      program: fixture,
      baselineDocument: baseline,
      editableMask: protectedMask,
      protectedMask,
    }),
    "revision_masks_overlap",
  );
});
