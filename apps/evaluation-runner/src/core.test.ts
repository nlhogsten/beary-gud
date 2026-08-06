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
  planEvaluationCase,
  replayArtifact,
  validateAttemptRecord,
  verifyAttemptManifest,
} from "./core.ts";
import { loadProviderCatalog } from "./catalog.ts";

const repoRoot = new URL("../../../", import.meta.url).pathname;
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("generation evaluation specification", () => {
  test("validates the fixed case set, rubric, schemas, and readiness blockers", async () => {
    const [specification, catalog] = await Promise.all([
      loadAndValidateSpecification(repoRoot),
      loadProviderCatalog(repoRoot),
    ]);
    const readiness = evaluationReadiness(specification, catalog);
    assert.deepEqual({
      structurallyValid: readiness.structurallyValid,
      executionReady: readiness.executionReady,
      caseCount: readiness.caseCount,
      referenceBearingCases: readiness.referenceBearingCases,
      revisionCases: readiness.revisionCases,
      missingRevisionBaselines: readiness.missingRevisionBaselines,
      missingRevisionMaskSets: readiness.missingRevisionMaskSets,
      cataloguedProviderCandidates: readiness.cataloguedProviderCandidates,
      pendingProviderCandidates: readiness.pendingProviderCandidates,
      provenanceAdmittedProviderCandidates: readiness.provenanceAdmittedProviderCandidates,
      executableProviderAdapters: readiness.executableProviderAdapters,
    }, {
      structurallyValid: true,
      executionReady: false,
      caseCount: 36,
      referenceBearingCases: 18,
      revisionCases: 4,
      missingRevisionBaselines: 4,
      missingRevisionMaskSets: 4,
      cataloguedProviderCandidates: 1,
      pendingProviderCandidates: 1,
      provenanceAdmittedProviderCandidates: 0,
      executableProviderAdapters: 0,
    });
    assert.ok(readiness.missingReferenceAssets >= 18);
    assert.ok(readiness.blockers.includes("No provider candidate has completed provenance admission."));
  });

  test("canonical JSON hashes are stable across object key order", () => {
    assert.equal(
      canonicalJson({ z: 1, a: { y: 2, x: 3 } }),
      canonicalJson({ a: { x: 3, y: 2 }, z: 1 }),
    );
  });
});

describe("managed API dry-run planning", () => {
  test("plans deterministically without credentials, network, billing, adapter invocation, or attempt evidence", async () => {
    const [specification, catalog] = await Promise.all([
      loadAndValidateSpecification(repoRoot),
      loadProviderCatalog(repoRoot),
    ]);
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      throw new Error("Dry-run planning must not use network access.");
    }) as typeof fetch;
    try {
      const options = {
        specification,
        catalog,
        adapterId: "preview-to-atlas-managed-api",
        caseId: "v1-001",
      };
      const first = planEvaluationCase(options);
      const second = planEvaluationCase(options);
      assert.equal(first.planId, second.planId);
      assert.deepEqual(first.execution, {
        networkRequired: true,
        billingRisk: "possible",
        networkAuthorized: false,
        paidCallAuthorized: false,
        networkUsed: false,
        paidCall: false,
        credentialsRead: false,
        adapterInvoked: false,
        attemptRecordWritten: false,
      });
      assert.equal(first.readyForExecution, false);
      assert.deepEqual(first.blockers, [
        "candidate-provenance-pending",
        "adapter-not-registered",
        "network-not-authorized",
        "paid-call-not-authorized",
      ]);
      assert.equal(first.provider.computeOwnership, "provider-managed");
      assert.equal(first.provider.credentialMode, "external-at-execution");
      assert.equal(fetchCalls, 0);
      assert.doesNotMatch(JSON.stringify(first), /endpoint|api[-_]?key|authorization|password|secret|token/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("reports missing reference inputs without trying to materialize them", async () => {
    const [specification, catalog] = await Promise.all([
      loadAndValidateSpecification(repoRoot),
      loadProviderCatalog(repoRoot),
    ]);
    const plan = planEvaluationCase({
      specification,
      catalog,
      adapterId: "preview-to-atlas-managed-api",
      caseId: "v1-007",
    });
    assert.ok(plan.blockers.includes("missing-reference-assets"));
    assert.deepEqual(plan.case.referenceSha256s, [null]);
    assert.equal(plan.execution.adapterInvoked, false);
  });

  test("binds revision policy and missing masks into the dry-run identity and blockers", async () => {
    const [specification, catalog] = await Promise.all([
      loadAndValidateSpecification(repoRoot),
      loadProviderCatalog(repoRoot),
    ]);
    const first = planEvaluationCase({
      specification,
      catalog,
      adapterId: "preview-to-atlas-managed-api",
      caseId: "v1-027",
    });
    assert.ok(first.blockers.includes("missing-revision-baseline"));
    assert.ok(first.blockers.includes("missing-revision-masks"));
    assert.notEqual(first.case.revisionPolicySha256, null);
    assert.equal(first.case.editableMaskSha256, null);
    assert.match(first.providerDescriptorSha256, /^[a-f0-9]{64}$/);

    const changed = structuredClone(specification);
    const revision = changed.caseSet.cases.find((item) => item.id === "v1-027")?.revision;
    assert.notEqual(revision, null);
    revision!.maximumProtectedChangedTexelRate = 0.004;
    const second = planEvaluationCase({
      specification: changed,
      catalog,
      adapterId: "preview-to-atlas-managed-api",
      caseId: "v1-027",
    });
    assert.notEqual(first.case.revisionPolicySha256, second.case.revisionPolicySha256);
    assert.notEqual(first.case.caseDefinitionSha256, second.case.caseDefinitionSha256);
    assert.notEqual(first.planId, second.planId);
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
