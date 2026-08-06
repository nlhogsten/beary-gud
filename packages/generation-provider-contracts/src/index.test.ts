import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  GenerationProviderCatalog,
  GenerationProviderRegistry,
  defineGenerationProvider,
  invokeGenerationProvider,
  type GenerationProviderAdapter,
  type GenerationProviderManifest,
  type GenerationProviderRequest,
  type ProviderProvenanceDossier,
} from "./index.ts";

function adapter(overrides: Partial<GenerationProviderAdapter> = {}): GenerationProviderAdapter {
  return {
    descriptor: {
      id: "test-provider",
      version: "1.0.0",
      providerId: "test-runtime",
      modelId: "test/model",
      modelVersion: "fixture-only",
      networkAccess: "none",
      billingRisk: "none",
      supportedOperations: ["create"],
    },
    async generate() {
      return { status: "unsupported", error: { code: "fixture", message: "Fixture only.", retryable: false } };
    },
    ...overrides,
  };
}

const request: GenerationProviderRequest = {
  requestId: "request-1",
  engineId: "engine",
  engineVersion: "1.0.0",
  documentType: "document/v1",
  operation: "create",
  prompt: "Create a test artifact.",
  references: [],
  controls: {},
  seed: null,
};

const manifest: GenerationProviderManifest = {
  schemaVersion: "voxl.generation-provider-manifest/v1",
  descriptor: {
    id: "managed-api-candidate",
    version: "1.0.0",
    providerId: "managed-api-runtime",
    modelId: "unselected-model",
    modelVersion: "pending-selection",
    networkAccess: "required",
    billingRisk: "possible",
    supportedOperations: ["create", "revise"],
  },
  executionClass: "managed-api",
  computeOwnership: "provider-managed",
  credentialMode: "external-at-execution",
  configuration: { id: "evaluation-defaults", values: { outputMediaType: "image/png" } },
  configurationSha256: "a".repeat(64),
  provenanceDossier: {
    id: "managed-api-candidate-review",
    path: "managed-api-candidate.dossier.v1.json",
    sha256: "b".repeat(64),
  },
};

const pendingDossier: ProviderProvenanceDossier = {
  schemaVersion: "voxl.provider-provenance-dossier/v1",
  id: "managed-api-candidate-review",
  version: "1.0.0",
  candidateId: "managed-api-candidate",
  decision: "pending",
  reviewedAt: null,
  checks: {
    commercialUse: "pending",
    modelProvenance: "pending",
    datasetProvenance: "pending",
    referenceUse: "pending",
    retention: "pending",
  },
  evidence: [],
  blockers: ["Candidate selection remains pending."],
};

describe("generation provider contracts", () => {
  test("freezes descriptors and rejects duplicate adapter IDs", () => {
    const registry = new GenerationProviderRegistry();
    const descriptor = registry.register(adapter());
    assert.equal(Object.isFrozen(descriptor), true);
    assert.equal(Object.isFrozen(descriptor.supportedOperations), true);
    assert.throws(() => registry.register(adapter()), /already registered/);
  });

  test("rejects malformed or undeclared provider capabilities", async () => {
    assert.throws(() => defineGenerationProvider(adapter({
      descriptor: { ...adapter().descriptor, supportedOperations: [] },
    })), /supportedOperations/);
    const result = await invokeGenerationProvider(adapter(), { ...request, operation: "revise" }, new AbortController().signal);
    assert.equal(result.status, "unsupported");
  });

  test("sanitizes unexpected adapter exceptions", async () => {
    const result = await invokeGenerationProvider(adapter({
      async generate() {
        throw new Error("secret credential and internal path");
      },
    }), request, new AbortController().signal);
    assert.deepEqual(result, {
      status: "failed",
      error: {
        code: "provider_execution_failed",
        message: "The generation provider could not complete the request.",
        retryable: false,
      },
    });
    assert.doesNotMatch(JSON.stringify(result), /secret/);
  });
});

describe("generation provider admission catalog", () => {
  test("catalogues deeply frozen pending managed API metadata without an executable adapter", () => {
    const catalog = new GenerationProviderCatalog();
    const entry = catalog.register({
      manifest,
      dossier: pendingDossier,
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    });
    assert.equal(entry.admissionDecision, "pending");
    assert.equal(entry.descriptor.networkAccess, "required");
    assert.equal(entry.descriptor.billingRisk, "possible");
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(entry.descriptor), true);
    assert.deepEqual(catalog.listAdmitted(), []);
    assert.throws(() => catalog.register({
      manifest,
      dossier: pendingDossier,
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /already catalogued/);
  });

  test("rejects secrets, integrity mismatches, and incomplete admitted dossiers", () => {
    const catalog = new GenerationProviderCatalog();
    assert.throws(() => catalog.register({
      manifest: {
        ...manifest,
        configuration: { id: "evaluation-defaults", values: { apiToken: "must-not-be-committed" } },
      },
      dossier: pendingDossier,
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /cannot contain credential or secret/);
    assert.throws(() => catalog.register({
      manifest: {
        ...manifest,
        configuration: { id: "evaluation-defaults", values: { headers: { value: "public-looking" } } },
      },
      dossier: pendingDossier,
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /cannot contain credential or secret/);
    assert.throws(() => catalog.register({
      manifest: {
        ...manifest,
        configuration: { id: "evaluation-defaults", values: { requestNote: "Bearer hidden-value" } },
      },
      dossier: pendingDossier,
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /secret-shaped configuration values/);
    assert.throws(() => catalog.register({
      manifest,
      dossier: pendingDossier,
      observedConfigurationSha256: "0".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /integrity metadata differs/);
    assert.throws(() => catalog.register({
      manifest,
      dossier: { ...pendingDossier, decision: "admitted" },
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    }), /requires approved checks/);
  });

  test("admits only a fully reviewed dossier with evidence for every required check", () => {
    const checks = Object.fromEntries(
      Object.keys(pendingDossier.checks).map((check) => [check, "approved"]),
    ) as ProviderProvenanceDossier["checks"];
    const evidence = Object.keys(checks).map((check, index) => ({
      id: `evidence-${index}`,
      check: check as keyof typeof checks,
      source: `compliance-record-${index}`,
      checkedAt: "2026-08-05T00:00:00.000Z",
    }));
    const catalog = new GenerationProviderCatalog();
    catalog.register({
      manifest,
      dossier: {
        ...pendingDossier,
        decision: "admitted",
        reviewedAt: "2026-08-05T00:00:00.000Z",
        checks,
        evidence,
        blockers: [],
      },
      observedConfigurationSha256: "a".repeat(64),
      observedDossierSha256: "b".repeat(64),
    });
    assert.equal(catalog.listAdmitted().length, 1);
  });
});
