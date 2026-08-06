import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type {
  GenerationProviderCatalog,
  GenerationProviderCatalogEntry,
} from "@voxl/generation-provider-contracts";
import {
  HumanoidSkinValidationError,
  decodeRgbaPng,
  detectHumanoidSkinProfile,
  exportHumanoidSkinPng,
  humanoidSkinDescriptor,
  importHumanoidSkinPng,
  renderHumanoidSkinPreview,
  validateHumanoidSkinDocument,
} from "@voxl/engine-voxl-humanoid-skin";

export const EVALUATION_RELATIVE_ROOT = "evaluations/voxl-humanoid-skin/v1";
export const REQUIRED_CATEGORY_COUNT = 20;

type JsonObject = Record<string, unknown>;

export interface EvaluationCase extends JsonObject {
  id: string;
  title: string;
  mode: "create" | "revise";
  profile: "wide-arm-64" | "slim-arm-64";
  prompt: string;
  categories: string[];
  references: Array<JsonObject & { materializedAsset: null | { path: string; sha256: string; mimeType: string } }>;
  revision: null | (JsonObject & {
    baselineAsset: null | { path: string; sha256: string; mimeType: "image/png" };
    protectionMode: "all-mapped-except-editable";
    editableRegions: string[];
    protectedRegions: string[];
    immutableRegions: string[];
    maximumProtectedChangedTexelRate: number;
    materializedMasks: null | {
      editable: { path: string; sha256: string; mimeType: "image/png" };
      protected: { path: string; sha256: string; mimeType: "image/png" };
      immutable: { path: string; sha256: string; mimeType: "image/png" };
    };
  });
}

export interface EvaluationSpecification {
  caseSet: JsonObject & { id: string; requiredCategories: string[]; cases: EvaluationCase[] };
  rubric: JsonObject & { id: string; dimensions: Array<{ weight: number }> };
  attemptSchema: JsonObject;
}

export interface EvaluationReadiness {
  structurallyValid: boolean;
  executionReady: boolean;
  caseCount: number;
  referenceBearingCases: number;
  missingReferenceAssets: number;
  revisionCases: number;
  missingRevisionBaselines: number;
  missingRevisionMaskSets: number;
  cataloguedProviderCandidates: number;
  pendingProviderCandidates: number;
  provenanceAdmittedProviderCandidates: number;
  executableProviderAdapters: number;
  blockers: string[];
}

export interface EvaluationDryRunPlan {
  schemaVersion: "voxl.provider-execution-plan/v1";
  planId: string;
  dryRun: true;
  case: {
    caseSetId: string;
    caseDefinitionSha256: string;
    rubricId: string;
    rubricSha256: string;
    id: string;
    mode: "create" | "revise";
    profile: "wide-arm-64" | "slim-arm-64";
    normalizedPromptSha256: string;
    referenceSha256s: Array<string | null>;
    baselineSha256: string | null;
    revisionPolicySha256: string | null;
    editableMaskSha256: string | null;
    protectedMaskSha256: string | null;
    immutableMaskSha256: string | null;
  };
  providerDescriptorSha256: string;
  provider: Readonly<GenerationProviderCatalogEntry>;
  execution: {
    networkRequired: boolean;
    billingRisk: "none" | "possible";
    networkAuthorized: false;
    paidCallAuthorized: false;
    networkUsed: false;
    paidCall: false;
    credentialsRead: false;
    adapterInvoked: false;
    attemptRecordWritten: false;
  };
  readyForExecution: false;
  blockers: string[];
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as JsonObject)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

export function normalizePrompt(value: string): string {
  return value.normalize("NFC").replaceAll("\r\n", "\n").split("\n")
    .map((line) => line.trimEnd()).join("\n").trim();
}

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

function schemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv;
}

export function validateAttemptRecord(schema: JsonObject, attempt: unknown): void {
  const ajv = schemaValidator();
  const validateAttempt = ajv.compile(schema);
  if (!validateAttempt(attempt)) {
    throw new Error(`Attempt record failed schema validation: ${ajv.errorsText(validateAttempt.errors)}`);
  }
}

export async function loadAndValidateSpecification(repoRoot: string): Promise<EvaluationSpecification> {
  const root = join(repoRoot, EVALUATION_RELATIVE_ROOT);
  const [caseSchema, rubricSchema, attemptSchema, caseSet, rubric] = await Promise.all([
    readJson(join(root, "case-set.schema.v1.json")),
    readJson(join(root, "rubric.schema.v1.json")),
    readJson(join(root, "attempt-record.schema.v1.json")),
    readJson(join(root, "cases.v1.json")),
    readJson(join(root, "rubric.v1.json")),
  ]);
  const ajv = schemaValidator();
  const validateCases = ajv.compile(caseSchema);
  const validateRubric = ajv.compile(rubricSchema);
  ajv.compile(attemptSchema);
  if (!validateCases(caseSet)) {
    throw new Error(`Case set failed schema validation: ${ajv.errorsText(validateCases.errors)}`);
  }
  if (!validateRubric(rubric)) {
    throw new Error(`Rubric failed schema validation: ${ajv.errorsText(validateRubric.errors)}`);
  }
  const typedCases = caseSet as EvaluationSpecification["caseSet"];
  const typedRubric = rubric as EvaluationSpecification["rubric"];
  const ids = typedCases.cases.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Evaluation case IDs must be unique.");
  const referenceIds = typedCases.cases.flatMap((item) => item.references.map((reference) => reference.id));
  if (new Set(referenceIds).size !== referenceIds.length) {
    throw new Error("Evaluation reference IDs must be globally unique.");
  }
  if (typedCases.requiredCategories.length !== REQUIRED_CATEGORY_COUNT) {
    throw new Error(`Evaluation must declare exactly ${REQUIRED_CATEGORY_COUNT} required categories.`);
  }
  const covered = new Set(typedCases.cases.flatMap((item) => item.categories));
  const missing = typedCases.requiredCategories.filter((category) => !covered.has(category));
  if (missing.length) throw new Error(`Evaluation categories are missing: ${missing.join(", ")}`);
  const weights = typedRubric.dimensions.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(weights - 1) > Number.EPSILON * 10) throw new Error("Rubric weights must total 1.");
  return { caseSet: typedCases, rubric: typedRubric, attemptSchema };
}

export function evaluationReadiness(
  specification: EvaluationSpecification,
  catalog?: GenerationProviderCatalog,
  executableAdapterIds: readonly string[] = [],
): EvaluationReadiness {
  const referenceCases = specification.caseSet.cases.filter((item) => item.references.length > 0);
  const missingReferences = referenceCases.flatMap((item) => item.references)
    .filter((item) => item.materializedAsset === null).length;
  const revisionCases = specification.caseSet.cases.filter((item) => item.mode === "revise");
  const missingBaselines = revisionCases.filter((item) => item.revision?.baselineAsset === null).length;
  const missingMaskSets = revisionCases.filter((item) => item.revision?.materializedMasks === null).length;
  const entries = catalog?.list() ?? [];
  const admitted = entries.filter((entry) => entry.admissionDecision === "admitted");
  const executable = admitted.filter((entry) => executableAdapterIds.includes(entry.descriptor.id));
  const blockers: string[] = [];
  if (missingReferences) blockers.push(`${missingReferences} synthetic reference assets are not materialized.`);
  if (missingBaselines) blockers.push(`${missingBaselines} revision baselines are not materialized.`);
  if (missingMaskSets) blockers.push(`${missingMaskSets} revision mask sets are not materialized.`);
  if (!admitted.length) blockers.push("No provider candidate has completed provenance admission.");
  if (!executable.length) blockers.push("No provenance-admitted executable generation provider adapter is registered.");
  return {
    structurallyValid: true,
    executionReady: blockers.length === 0,
    caseCount: specification.caseSet.cases.length,
    referenceBearingCases: referenceCases.length,
    missingReferenceAssets: missingReferences,
    revisionCases: revisionCases.length,
    missingRevisionBaselines: missingBaselines,
    missingRevisionMaskSets: missingMaskSets,
    cataloguedProviderCandidates: entries.length,
    pendingProviderCandidates: entries.filter((entry) => entry.admissionDecision === "pending").length,
    provenanceAdmittedProviderCandidates: admitted.length,
    executableProviderAdapters: executable.length,
    blockers,
  };
}

export function planEvaluationCase(options: {
  specification: EvaluationSpecification;
  catalog: GenerationProviderCatalog;
  adapterId: string;
  caseId: string;
  executableAdapterIds?: readonly string[];
}): EvaluationDryRunPlan {
  const evaluationCase = options.specification.caseSet.cases.find((item) => item.id === options.caseId);
  if (!evaluationCase) throw new Error("Evaluation case was not found.");
  const provider = options.catalog.get(options.adapterId);
  const executableAdapterIds = options.executableAdapterIds ?? [];
  const missingReferences = evaluationCase.references.filter((item) => item.materializedAsset === null).length;
  const missingBaseline = evaluationCase.mode === "revise" && evaluationCase.revision?.baselineAsset === null;
  const missingMasks = evaluationCase.mode === "revise" && evaluationCase.revision?.materializedMasks === null;
  const blockers: string[] = [];
  if (provider.admissionDecision !== "admitted") blockers.push(`candidate-provenance-${provider.admissionDecision}`);
  if (!provider.descriptor.supportedOperations.includes(evaluationCase.mode)) blockers.push("unsupported-operation");
  if (missingReferences) blockers.push("missing-reference-assets");
  if (missingBaseline) blockers.push("missing-revision-baseline");
  if (missingMasks) blockers.push("missing-revision-masks");
  if (!executableAdapterIds.includes(provider.descriptor.id)) blockers.push("adapter-not-registered");
  if (provider.descriptor.networkAccess === "required") blockers.push("network-not-authorized");
  if (provider.descriptor.billingRisk === "possible") blockers.push("paid-call-not-authorized");

  const revisionPolicy = evaluationCase.revision ? {
    protectionMode: evaluationCase.revision.protectionMode,
    editableRegions: evaluationCase.revision.editableRegions,
    protectedRegions: evaluationCase.revision.protectedRegions,
    immutableRegions: evaluationCase.revision.immutableRegions,
    maximumProtectedChangedTexelRate: evaluationCase.revision.maximumProtectedChangedTexelRate,
  } : null;
  const casePlan = {
    caseSetId: options.specification.caseSet.id,
    caseDefinitionSha256: sha256(canonicalJson(evaluationCase)),
    rubricId: options.specification.rubric.id,
    rubricSha256: sha256(canonicalJson(options.specification.rubric)),
    id: evaluationCase.id,
    mode: evaluationCase.mode,
    profile: evaluationCase.profile,
    normalizedPromptSha256: sha256(normalizePrompt(evaluationCase.prompt)),
    referenceSha256s: evaluationCase.references.map((item) => item.materializedAsset?.sha256 ?? null),
    baselineSha256: evaluationCase.revision?.baselineAsset?.sha256 ?? null,
    revisionPolicySha256: revisionPolicy ? sha256(canonicalJson(revisionPolicy)) : null,
    editableMaskSha256: evaluationCase.revision?.materializedMasks?.editable.sha256 ?? null,
    protectedMaskSha256: evaluationCase.revision?.materializedMasks?.protected.sha256 ?? null,
    immutableMaskSha256: evaluationCase.revision?.materializedMasks?.immutable.sha256 ?? null,
  };
  const providerDescriptorSha256 = sha256(canonicalJson(provider.descriptor));
  const planId = sha256(canonicalJson({
    case: casePlan,
    provider: {
      descriptorSha256: providerDescriptorSha256,
      configurationSha256: provider.configurationSha256,
      provenanceDossierSha256: provider.provenanceDossierSha256,
    },
  }));
  return {
    schemaVersion: "voxl.provider-execution-plan/v1",
    planId,
    dryRun: true,
    case: casePlan,
    provider,
    providerDescriptorSha256,
    execution: {
      networkRequired: provider.descriptor.networkAccess === "required",
      billingRisk: provider.descriptor.billingRisk,
      networkAuthorized: false,
      paidCallAuthorized: false,
      networkUsed: false,
      paidCall: false,
      credentialsRead: false,
      adapterInvoked: false,
      attemptRecordWritten: false,
    },
    readyForExecution: false,
    blockers,
  };
}

function artifact(path: string, bytes: Uint8Array) {
  return { path, sha256: sha256(bytes), bytes: bytes.byteLength, retention: "retain" };
}

function issueCodes(error: unknown): string[] {
  if (error instanceof HumanoidSkinValidationError) return error.issues.map((item) => item.code);
  return ["unreadable-output"];
}

async function writeExclusive(path: string, value: Uint8Array | string) {
  await writeFile(path, value, { flag: "wx" });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function replayArtifact(options: {
  repoRoot: string;
  outputRoot: string;
  attemptId: string;
  caseId: string;
  candidateBytes: Uint8Array;
}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(options.attemptId)) {
    throw new Error("Attempt ID is invalid.");
  }
  const specification = await loadAndValidateSpecification(options.repoRoot);
  const ordinal = specification.caseSet.cases.findIndex((item) => item.id === options.caseId);
  const evaluationCase = specification.caseSet.cases[ordinal];
  if (!evaluationCase) throw new Error("Evaluation case was not found.");
  if (evaluationCase.references.some((item) => item.materializedAsset === null)) {
    throw new Error("Case references must be materialized before replay.");
  }
  if (evaluationCase.mode === "revise" && evaluationCase.revision?.baselineAsset === null) {
    throw new Error("Revision baseline must be materialized before replay.");
  }
  if (evaluationCase.mode === "revise" && evaluationCase.revision?.materializedMasks === null) {
    throw new Error("Revision masks must be materialized before replay.");
  }

  const finalDirectory = resolve(options.outputRoot, options.attemptId);
  const stagingDirectory = resolve(options.outputRoot, `.staging-${options.attemptId}`);
  if (await exists(finalDirectory) || await exists(stagingDirectory)) {
    throw new Error("Attempt ID already exists and cannot be overwritten.");
  }
  await mkdir(join(stagingDirectory, "artifacts"), { recursive: true });
  await mkdir(join(stagingDirectory, "evidence"), { recursive: true });
  const startedAt = new Date();
  const rawPath = "artifacts/raw-output.png";
  await writeExclusive(join(stagingDirectory, rawPath), options.candidateBytes);

  let candidate: ReturnType<typeof artifact> | null = null;
  let atlas: ReturnType<typeof artifact> | null = null;
  let front: ReturnType<typeof artifact> | null = null;
  let rear: ReturnType<typeof artifact> | null = null;
  let validation = { passed: false, validAtFirstOutput: false, validAfterNormalization: false, issueCodes: [] as string[] };
  let outcome: { status: string; errorCode: string | null; message: string | null } = {
    status: "failed",
    errorCode: "unreadable-output",
    message: "The replay artifact could not be decoded.",
  };
  const failureCategories: string[] = [];
  const normalizationOperations: string[] = [];

  try {
    const decoded = decodeRgbaPng(options.candidateBytes);
    if (decoded.width !== 64 || decoded.height !== 64) throw new Error("invalid-dimensions");
    const detectedProfile = detectHumanoidSkinProfile(decoded.pixels);
    if (detectedProfile !== evaluationCase.profile) throw new Error("invalid-profile");
    const document = importHumanoidSkinPng(options.candidateBytes, { profile: evaluationCase.profile });
    const checked = validateHumanoidSkinDocument(document);
    validation = {
      passed: checked.ok,
      validAtFirstOutput: checked.ok,
      validAfterNormalization: checked.ok,
      issueCodes: checked.issues.map((item: { code: string }) => item.code),
    };
    if (!checked.ok) throw new HumanoidSkinValidationError("Candidate validation failed.", checked.issues);
    const canonical = exportHumanoidSkinPng(document);
    const frontBytes = renderHumanoidSkinPreview(document, { view: "front", scale: 8 }).png;
    const rearBytes = renderHumanoidSkinPreview(document, { view: "back", scale: 8 }).png;
    const candidatePath = "artifacts/candidate.png";
    const atlasPath = "evidence/atlas.png";
    const frontPath = "evidence/front.png";
    const rearPath = "evidence/rear.png";
    await Promise.all([
      writeExclusive(join(stagingDirectory, candidatePath), canonical),
      writeExclusive(join(stagingDirectory, atlasPath), canonical),
      writeExclusive(join(stagingDirectory, frontPath), frontBytes),
      writeExclusive(join(stagingDirectory, rearPath), rearBytes),
    ]);
    candidate = artifact(candidatePath, canonical);
    atlas = artifact(atlasPath, canonical);
    front = artifact(frontPath, frontBytes);
    rear = artifact(rearPath, rearBytes);
    normalizationOperations.push("decoded-rgba-png", "confirmed-declared-profile", "canonical-engine-export");
    outcome = { status: "succeeded", errorCode: null, message: null };
  } catch (error) {
    const codes = error instanceof Error && ["invalid-dimensions", "invalid-profile"].includes(error.message)
      ? [error.message]
      : issueCodes(error);
    validation.issueCodes = codes;
    failureCategories.push(...codes);
    outcome = {
      status: "failed",
      errorCode: codes[0] ?? "unreadable-output",
      message: "The artifact replay did not produce a deterministically valid candidate.",
    };
  }

  const finishedAt = new Date();
  const attempt = {
    schemaVersion: "voxl.generation-attempt/v1",
    attemptId: options.attemptId,
    case: {
      id: evaluationCase.id,
      caseSetId: specification.caseSet.id,
      caseDefinitionSha256: sha256(canonicalJson(evaluationCase)),
      ordinal,
    },
    engine: {
      id: humanoidSkinDescriptor.id,
      version: humanoidSkinDescriptor.version,
      documentSchema: "voxl.humanoid-skin/v1",
      exportProfile: evaluationCase.profile,
    },
    execution: { kind: "artifact-replay", networkUsed: false, paidCall: false, timingScope: "harness" },
    outcome,
    provider: null,
    timing: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      latencyMilliseconds: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      coldStart: false,
      peakMemoryBytes: null,
    },
    cost: { currency: "USD", estimated: null, actual: null },
    inputs: {
      normalizedPromptSha256: sha256(normalizePrompt(evaluationCase.prompt)),
      references: evaluationCase.references.flatMap((item) => item.materializedAsset ? [item.materializedAsset.sha256] : []),
      baselineSha256: evaluationCase.revision?.baselineAsset?.sha256 ?? null,
      editableMaskSha256: evaluationCase.revision?.materializedMasks?.editable.sha256 ?? null,
      protectedMaskSha256: evaluationCase.revision?.materializedMasks?.protected.sha256 ?? null,
      immutableMaskSha256: evaluationCase.revision?.materializedMasks?.immutable.sha256 ?? null,
    },
    rawOutput: artifact(rawPath, options.candidateBytes),
    normalization: { operations: normalizationOperations, policyVersion: "humanoid-replay/v1", manuallyRepaired: false },
    candidate,
    validation,
    evidence: { atlas, front, rear, left: null, right: null, top: null, bottom: null },
    scores: { automated: null, aiVisualReview: null, humanRubric: null, humanPreference: null, reviewerNotes: null },
    failureCategories: [...new Set(failureCategories)],
  };
  validateAttemptRecord(specification.attemptSchema, attempt);

  await writeExclusive(join(stagingDirectory, "attempt.json"), `${JSON.stringify(attempt, null, 2)}\n`);
  await writeExclusive(join(stagingDirectory, "state.json"), `${JSON.stringify({ status: "finalized", attemptId: options.attemptId }, null, 2)}\n`);
  await writeExclusive(join(stagingDirectory, "events.jsonl"), `${JSON.stringify({ type: "artifact-replay-finalized", at: finishedAt.toISOString() })}\n`);
  const manifestFiles = [
    "attempt.json", "state.json", "events.jsonl", rawPath,
    ...(candidate ? [candidate.path, atlas!.path, front!.path, rear!.path] : []),
  ];
  const manifestEntries = await Promise.all(manifestFiles.map(async (path) => {
    const bytes = await readFile(join(stagingDirectory, path));
    return { path, sha256: sha256(bytes), bytes: bytes.byteLength };
  }));
  await writeExclusive(join(stagingDirectory, "manifest.json"), `${JSON.stringify({
    schemaVersion: 1,
    attemptId: options.attemptId,
    kind: "artifact-replay",
    files: manifestEntries,
  }, null, 2)}\n`);
  await mkdir(options.outputRoot, { recursive: true });
  await rename(stagingDirectory, finalDirectory);
  return { attempt, directory: finalDirectory };
}

export async function verifyAttemptManifest(directory: string): Promise<{ ok: boolean; issues: string[] }> {
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as {
    files: Array<{ path: string; sha256: string; bytes: number }>;
  };
  const issues: string[] = [];
  for (const entry of manifest.files) {
    const path = resolve(directory, entry.path);
    if (relative(directory, path).startsWith("..")) {
      issues.push(`${entry.path}: outside attempt directory`);
      continue;
    }
    try {
      const bytes = await readFile(path);
      const fileStat = await stat(path);
      if (fileStat.size !== entry.bytes || sha256(bytes) !== entry.sha256) issues.push(`${entry.path}: checksum mismatch`);
    } catch {
      issues.push(`${entry.path}: missing`);
    }
  }
  return { ok: issues.length === 0, issues };
}
