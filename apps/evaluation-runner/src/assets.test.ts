import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  createMappedPixelMask,
  decodeRgbaPng,
  getHumanoidSkinRegion,
  type HumanoidSkinProfileId,
} from "@voxl/engine-voxl-humanoid-skin";
import {
  buildEvaluationAssetBundle,
  decodeMaterializedMask,
  evaluationMaskPixelCount,
  evaluationRegionMask,
  materializeEvaluationAssets,
  validateMaterializedAtlas,
} from "./assets.ts";
import { evaluationReadiness, loadAndValidateSpecification } from "./core.ts";
import { loadProviderCatalog } from "./catalog.ts";

const repoRoot = new URL("../../../", import.meta.url).pathname;
const caseSetPath = join(repoRoot, "evaluations/voxl-humanoid-skin/v1/cases.v1.json");
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("deterministic evaluation assets", () => {
  test("generates fixed bytes with only project-authored synthetic inputs", async () => {
    const source = JSON.parse(await readFile(caseSetPath, "utf8"));
    const first = buildEvaluationAssetBundle(source);
    const second = buildEvaluationAssetBundle(source);
    assert.equal(first.referenceCount, 25);
    assert.equal(first.baselineCount, 4);
    assert.equal(first.maskSetCount, 4);
    assert.equal(first.assets.length, 41);
    assert.equal(first.caseSetText, second.caseSetText);
    assert.deepEqual(
      first.assets.map((asset) => [asset.path, asset.sha256, Buffer.from(asset.bytes).toString("base64")]),
      second.assets.map((asset) => [asset.path, asset.sha256, Buffer.from(asset.bytes).toString("base64")]),
    );
    for (const evaluationCase of first.caseSet.cases) {
      for (const reference of evaluationCase.references) {
        assert.deepEqual(reference.provenance, {
          origin: "project-authored-synthetic",
          rights: "evaluation-use-approved",
          thirdPartyContent: false,
        });
      }
    }
  });

  test("write and check modes converge without provider or network access", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "voxl-evaluation-assets-"));
    temporary.push(temporaryRoot);
    const temporaryCaseSet = join(temporaryRoot, "evaluations/voxl-humanoid-skin/v1/cases.v1.json");
    await mkdir(dirname(temporaryCaseSet), { recursive: true });
    await writeFile(temporaryCaseSet, await readFile(caseSetPath));
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      throw new Error("Asset materialization must not use the network.");
    }) as typeof fetch;
    try {
      const written = await materializeEvaluationAssets(temporaryRoot, "write");
      const checked = await materializeEvaluationAssets(temporaryRoot, "check");
      assert.equal(written.ok, true);
      assert.equal(checked.ok, true);
      assert.equal(written.thirdPartyInputs, 0);
      assert.equal(fetchCalls, 0);
      const tamperedPath = join(temporaryRoot, "evaluations/voxl-humanoid-skin/v1/assets/references/v1-007-portrait.png");
      await writeFile(tamperedPath, new Uint8Array([0]));
      const tampered = await materializeEvaluationAssets(temporaryRoot, "check");
      assert.equal(tampered.ok, false);
      assert.ok(tampered.issues.some((issue) => issue.includes("v1-007-portrait.png")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("committed paths, hashes, MIME types, dimensions, profiles, and masks are valid", async () => {
    const specification = await loadAndValidateSpecification(repoRoot);
    const evaluationRoot = resolve(repoRoot, "evaluations/voxl-humanoid-skin/v1");
    for (const evaluationCase of specification.caseSet.cases) {
      for (const reference of evaluationCase.references) {
        const asset = reference.materializedAsset;
        assert.notEqual(asset, null);
        assert.equal(asset!.mimeType, "image/png");
        const absolute = resolve(repoRoot, asset!.path);
        assert.equal(relative(evaluationRoot, absolute).startsWith(".."), false);
        const bytes = await readFile(absolute);
        assert.equal(hash(bytes), asset!.sha256);
        const decoded = decodeRgbaPng(bytes);
        if (reference.mediaKind === "synthetic-atlas") {
          assert.equal(validateMaterializedAtlas(bytes, evaluationCase.profile), true);
        } else {
          assert.deepEqual([decoded.width, decoded.height], [128, 128]);
        }
      }

      if (!evaluationCase.revision) continue;
      const revision = evaluationCase.revision;
      assert.equal(revision.protectionMode, "all-mapped-except-editable");
      assert.equal(revision.baselineAsset!.mimeType, "image/png");
      const baselinePath = resolve(repoRoot, revision.baselineAsset!.path);
      assert.equal(relative(evaluationRoot, baselinePath).startsWith(".."), false);
      const baseline = await readFile(baselinePath);
      assert.equal(hash(baseline), revision.baselineAsset!.sha256);
      assert.equal(validateMaterializedAtlas(baseline, evaluationCase.profile), true);

      const editableBytes = await readFile(resolve(repoRoot, revision.materializedMasks!.editable.path));
      const protectedBytes = await readFile(resolve(repoRoot, revision.materializedMasks!.protected.path));
      const immutableBytes = await readFile(resolve(repoRoot, revision.materializedMasks!.immutable.path));
      assert.equal(revision.materializedMasks!.editable.mimeType, "image/png");
      assert.equal(revision.materializedMasks!.protected.mimeType, "image/png");
      assert.equal(revision.materializedMasks!.immutable.mimeType, "image/png");
      assert.equal(hash(editableBytes), revision.materializedMasks!.editable.sha256);
      assert.equal(hash(protectedBytes), revision.materializedMasks!.protected.sha256);
      assert.equal(hash(immutableBytes), revision.materializedMasks!.immutable.sha256);
      const editable = decodeMaterializedMask(editableBytes);
      const protectedMask = decodeMaterializedMask(protectedBytes);
      const immutable = decodeMaterializedMask(immutableBytes);
      const mapped = createMappedPixelMask(evaluationCase.profile);
      for (let pixel = 0; pixel < mapped.length; pixel += 1) {
        assert.equal(protectedMask[pixel], mapped[pixel] && !editable[pixel] ? 1 : 0);
        assert.equal(Boolean(editable[pixel] && protectedMask[pixel]), false);
        assert.equal(Boolean(editable[pixel] && immutable[pixel]), false);
      }
      assert.ok(evaluationMaskPixelCount(editable) > 0);
      assert.ok(evaluationMaskPixelCount(protectedMask) > 0);
      assert.ok(evaluationMaskPixelCount(immutable) > 0);
    }
  });

  test("explicit semantic selector mappings bind rear, boot, buttons, and unused geometry", () => {
    const rear = evaluationRegionMask("wide-arm-64", "torso.base.rear");
    const rearRegion = getHumanoidSkinRegion("wide-arm-64", "torso", "base", "back");
    assert.equal(evaluationMaskPixelCount(rear), rearRegion.width * rearRegion.height);

    const boot = evaluationRegionMask("slim-arm-64", "left-leg.base.front.boot");
    assert.equal(evaluationMaskPixelCount(boot), 16);
    const buttons = evaluationRegionMask("wide-arm-64", "torso.base.front.buttons");
    assert.equal(evaluationMaskPixelCount(buttons), 3);

    for (const profile of ["wide-arm-64", "slim-arm-64"] as const satisfies readonly HumanoidSkinProfileId[]) {
      const unused = evaluationRegionMask(profile, "unused-atlas-regions");
      const mapped = createMappedPixelMask(profile);
      for (let pixel = 0; pixel < mapped.length; pixel += 1) assert.equal(unused[pixel], mapped[pixel] ? 0 : 1);
    }
  });

  test("asset readiness reaches zero while provider admission remains independently blocked", async () => {
    const [specification, catalog] = await Promise.all([
      loadAndValidateSpecification(repoRoot),
      loadProviderCatalog(repoRoot),
    ]);
    const readiness = evaluationReadiness(specification, catalog);
    assert.equal(readiness.missingReferenceAssets, 0);
    assert.equal(readiness.missingRevisionBaselines, 0);
    assert.equal(readiness.missingRevisionMaskSets, 0);
    assert.equal(readiness.executionReady, false);
    assert.ok(readiness.blockers.includes("No provider candidate has completed provenance admission."));
  });
});
