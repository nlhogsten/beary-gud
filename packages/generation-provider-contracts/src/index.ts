export type GenerationOperation = "create" | "revise";

export interface GenerationProviderDescriptor {
  id: string;
  version: string;
  providerId: string;
  modelId: string;
  modelVersion: string;
  networkAccess: "none" | "required";
  billingRisk: "none" | "possible";
  supportedOperations: readonly GenerationOperation[];
}

export interface ProviderInputArtifact {
  id: string;
  role: string;
  mediaType: string;
  sha256: string;
  bytes: Uint8Array;
}

export interface GenerationProviderRequest {
  requestId: string;
  engineId: string;
  engineVersion: string;
  documentType: string;
  operation: GenerationOperation;
  prompt: string;
  references: ProviderInputArtifact[];
  existingDocument?: ProviderInputArtifact;
  editMask?: ProviderInputArtifact;
  preserveMasks?: ProviderInputArtifact[];
  controls: Record<string, unknown>;
  seed: number | null;
}

export interface ProviderOutputArtifact {
  mediaType: string;
  bytes: Uint8Array;
}

export interface ProviderUsage {
  inputUnits?: number;
  outputUnits?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
}

export interface PublicProviderError {
  code: string;
  message: string;
  retryable: boolean;
}

export type GenerationProviderOutcome =
  | { status: "succeeded"; artifacts: ProviderOutputArtifact[]; usage: ProviderUsage }
  | {
      status: "failed" | "refused" | "timed-out" | "unsupported";
      error: PublicProviderError;
      usage?: ProviderUsage;
    };

export interface GenerationProviderAdapter {
  descriptor: GenerationProviderDescriptor;
  generate(
    request: GenerationProviderRequest,
    context: { signal: AbortSignal },
  ): Promise<GenerationProviderOutcome>;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const OPERATIONS: readonly GenerationOperation[] = ["create", "revise"];

function requireString(value: unknown, name: string, pattern?: RegExp): asserts value is string {
  if (typeof value !== "string" || !value || (pattern && !pattern.test(value))) {
    throw new ProviderContractError("invalid_provider_descriptor", `${name} is invalid.`);
  }
}

export class ProviderContractError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProviderContractError";
    this.code = code;
  }
}

export function validateGenerationProviderDescriptor(
  value: GenerationProviderDescriptor,
): Readonly<GenerationProviderDescriptor> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderContractError("invalid_provider_descriptor", "Provider descriptor must be an object.");
  }
  requireString(value.id, "id", ID_PATTERN);
  requireString(value.version, "version", VERSION_PATTERN);
  requireString(value.providerId, "providerId", ID_PATTERN);
  requireString(value.modelId, "modelId");
  requireString(value.modelVersion, "modelVersion");
  if (!(["none", "required"] as const).includes(value.networkAccess)) {
    throw new ProviderContractError("invalid_provider_descriptor", "networkAccess is invalid.");
  }
  if (!(["none", "possible"] as const).includes(value.billingRisk)) {
    throw new ProviderContractError("invalid_provider_descriptor", "billingRisk is invalid.");
  }
  if (
    !Array.isArray(value.supportedOperations)
    || !value.supportedOperations.length
    || value.supportedOperations.some((item) => !OPERATIONS.includes(item))
    || new Set(value.supportedOperations).size !== value.supportedOperations.length
  ) throw new ProviderContractError("invalid_provider_descriptor", "supportedOperations is invalid.");

  return Object.freeze({
    ...value,
    supportedOperations: Object.freeze([...value.supportedOperations]),
  });
}

export function defineGenerationProvider(
  adapter: GenerationProviderAdapter,
): Readonly<GenerationProviderAdapter> {
  if (!adapter || typeof adapter !== "object" || typeof adapter.generate !== "function") {
    throw new ProviderContractError("invalid_provider_adapter", "Provider adapter must implement generate().");
  }
  return Object.freeze({
    descriptor: validateGenerationProviderDescriptor(adapter.descriptor),
    generate: adapter.generate.bind(adapter),
  });
}

function sanitizeFailure(): GenerationProviderOutcome {
  return {
    status: "failed",
    error: {
      code: "provider_execution_failed",
      message: "The generation provider could not complete the request.",
      retryable: false,
    },
  };
}

export async function invokeGenerationProvider(
  adapter: GenerationProviderAdapter,
  request: GenerationProviderRequest,
  signal: AbortSignal,
): Promise<GenerationProviderOutcome> {
  const registered = defineGenerationProvider(adapter);
  if (!registered.descriptor.supportedOperations.includes(request.operation)) {
    return {
      status: "unsupported",
      error: {
        code: "unsupported_provider_operation",
        message: "The provider does not support the requested operation.",
        retryable: false,
      },
    };
  }
  try {
    return await registered.generate(request, { signal });
  } catch {
    return sanitizeFailure();
  }
}

export class GenerationProviderRegistry {
  readonly #adapters = new Map<string, Readonly<GenerationProviderAdapter>>();

  register(adapter: GenerationProviderAdapter): Readonly<GenerationProviderDescriptor> {
    const registered = defineGenerationProvider(adapter);
    if (this.#adapters.has(registered.descriptor.id)) {
      throw new ProviderContractError("duplicate_provider", "A provider adapter with that ID is already registered.");
    }
    this.#adapters.set(registered.descriptor.id, registered);
    return registered.descriptor;
  }

  list(): Readonly<GenerationProviderDescriptor>[] {
    return [...this.#adapters.values()]
      .map((adapter) => adapter.descriptor)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  get(id: string): Readonly<GenerationProviderAdapter> {
    const adapter = this.#adapters.get(id);
    if (!adapter) throw new ProviderContractError("provider_not_found", "Provider adapter is not registered.");
    return adapter;
  }
}
