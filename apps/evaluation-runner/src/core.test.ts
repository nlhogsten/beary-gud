import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createBlankHumanoidSkinDocument,
  exportHumanoidSkinPng,
} from "@voxl/engine-voxl-humanoid-skin";
import {
  canonicalJson,
  evaluationReadiness,
  loadAndValidateSpecification,
  replayArtifact,
  validateAttemptRecord,
  verifyAttemptManifest,
} from "./core.ts";

const repoRoot = new URL("../../../", import.meta.url).pathname;
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("generation evaluation specification", () => {
  test("validates the fixed case set, rubric, schemas, and readiness blockers", async () => {
    const specification = await loadAndValidateSpecification(repoRoot);
    const readiness = evaluationReadiness(specification);
    assert.deepEqual({
      structurallyValid: readiness.structurallyValid,
      executionReady: readiness.executionReady,
      caseCount: readiness.caseCount,
      referenceBearingCases: readiness.referenceBearingCases,
      revisionCases: readiness.revisionCases,
      missingRevisionBaselines: readiness.missingRevisionBaselines,
      admittedProviderAdapters: readiness.admittedProviderAdapters,
    }, {
      structurallyValid: true,
      executionReady: false,
      caseCount: 36,
      referenceBearingCases: 18,
      revisionCases: 4,
      missingRevisionBaselines: 4,
      admittedProviderAdapters: 0,
    });
    assert.ok(readiness.missingReferenceAssets >= 18);
  });

  test("canonical JSON hashes are stable across object key order", () => {
    assert.equal(
      canonicalJson({ z: 1, a: { y: 2, x: 3 } }),
      canonicalJson({ a: { x: 3, y: 2 }, z: 1 }),
    );
  });
});

describe("offline artifact replay", () => {
  test("finalizes valid engine evidence with no provider, network, billing, or scores", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "voxl-evaluation-"));
    temporary.push(outputRoot);
    const bytes = exportHumanoidSkinPng(createBlankHumanoidSkinDocument("wide-arm-64"));
    const result = await replayArtifact({
      repoRoot,
      outputRoot,
      attemptId: "replay-valid",
      caseId: "v1-001",
      candidateBytes: bytes,
    });
    assert.deepEqual(result.attempt.execution, {
      kind: "artifact-replay", networkUsed: false, paidCall: false, timingScope: "harness",
    });
    assert.equal(result.attempt.outcome.status, "succeeded");
    assert.equal(result.attempt.provider, null);
    assert.equal(result.attempt.validation.passed, true);
    assert.equal(result.attempt.scores.humanRubric, null);
    assert.deepEqual(await verifyAttemptManifest(result.directory), { ok: true, issues: [] });
    const specification = await loadAndValidateSpecification(repoRoot);
    validateAttemptRecord(specification.attemptSchema, {
      ...result.attempt,
      execution: { kind: "provider", networkUsed: true, paidCall: false, timingScope: "provider" },
      outcome: { status: "failed", errorCode: "provider-error", message: "Provider request failed." },
      provider: {
        adapterId: "test-adapter",
        adapterVersion: "1.0.0",
        providerId: "test-provider",
        modelId: "test-model",
        modelVersion: "test-version",
        configurationSha256: "0".repeat(64),
        seed: null,
        provenanceReviewId: "test-review",
      },
      rawOutput: null,
      candidate: null,
      validation: { passed: false, validAtFirstOutput: false, validAfterNormalization: false, issueCodes: [] },
      evidence: { atlas: null, front: null, rear: null, left: null, right: null, top: null, bottom: null },
      failureCategories: ["provider-error"],
    });
    await assert.rejects(replayArtifact({
      repoRoot,
      outputRoot,
      attemptId: "replay-valid",
      caseId: "v1-001",
      candidateBytes: bytes,
    }), /cannot be overwritten/);
  });

  test("finalizes unreadable artifacts as failures without candidate scores", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "voxl-evaluation-"));
    temporary.push(outputRoot);
    const result = await replayArtifact({
      repoRoot,
      outputRoot,
      attemptId: "replay-invalid",
      caseId: "v1-001",
      candidateBytes: new TextEncoder().encode("not a PNG"),
    });
    assert.equal(result.attempt.outcome.status, "failed");
    assert.equal(result.attempt.outcome.errorCode, "unreadable-output");
    assert.equal(result.attempt.candidate, null);
    assert.equal(result.attempt.scores.humanRubric, null);
    assert.deepEqual(await verifyAttemptManifest(result.directory), { ok: true, issues: [] });
  });

  test("manifest verification detects finalized evidence mutation", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "voxl-evaluation-"));
    temporary.push(outputRoot);
    const result = await replayArtifact({
      repoRoot,
      outputRoot,
      attemptId: "replay-tamper",
      caseId: "v1-001",
      candidateBytes: exportHumanoidSkinPng(createBlankHumanoidSkinDocument("wide-arm-64")),
    });
    await writeFile(join(result.directory, "state.json"), "tampered\n");
    const checked = await verifyAttemptManifest(result.directory);
    assert.equal(checked.ok, false);
    assert.ok(checked.issues.includes("state.json: checksum mismatch"));
    assert.equal(JSON.parse(await readFile(join(result.directory, "attempt.json"), "utf8")).provider, null);
  });
});
