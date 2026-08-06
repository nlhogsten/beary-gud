import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  GenerationProviderRegistry,
  defineGenerationProvider,
  invokeGenerationProvider,
  type GenerationProviderAdapter,
  type GenerationProviderRequest,
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
