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

export type ProviderAdmissionDecision = "pending" | "admitted" | "rejected";
export type ProviderAdmissionCheckStatus = "pending" | "approved" | "rejected";
export type ProviderProvenanceCheck =
  | "commercialUse"
  | "modelProvenance"
  | "datasetProvenance"
  | "referenceUse"
  | "retention";

export interface ProviderProvenanceEvidence {
  id: string;
  check: ProviderProvenanceCheck;
  source: string;
  checkedAt: string;
}

export interface ProviderProvenanceDossier {
  schemaVersion: "voxl.provider-provenance-dossier/v1";
  id: string;
  version: string;
  candidateId: string;
  decision: ProviderAdmissionDecision;
  reviewedAt: string | null;
  checks: Record<ProviderProvenanceCheck, ProviderAdmissionCheckStatus>;
  evidence: ProviderProvenanceEvidence[];
  blockers: string[];
}

export type PublicProviderConfigurationValue =
  | null
  | boolean
  | number
  | string
  | PublicProviderConfigurationValue[]
  | { [key: string]: PublicProviderConfigurationValue };

export interface GenerationProviderManifest {
  schemaVersion: "voxl.generation-provider-manifest/v1";
  descriptor: GenerationProviderDescriptor;
  executionClass: "managed-api";
  computeOwnership: "provider-managed";
  credentialMode: "none" | "external-at-execution";
  configuration: {
    id: string;
    values: Record<string, PublicProviderConfigurationValue>;
  };
  configurationSha256: string;
  provenanceDossier: {
    id: string;
    path: string;
    sha256: string;
  };
}

export interface GenerationProviderCatalogEntry {
  descriptor: Readonly<GenerationProviderDescriptor>;
  executionClass: "managed-api";
  computeOwnership: "provider-managed";
  credentialMode: "none" | "external-at-execution";
  configurationId: string;
  configurationSha256: string;
  provenanceDossierId: string;
  provenanceDossierSha256: string;
  admissionDecision: ProviderAdmissionDecision;
  admissionBlockers: readonly string[];
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
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const OPERATIONS: readonly GenerationOperation[] = ["create", "revise"];
const PROVENANCE_CHECKS: readonly ProviderProvenanceCheck[] = [
  "commercialUse",
  "modelProvenance",
  "datasetProvenance",
  "referenceUse",
  "retention",
];
const ADMISSION_CHECK_STATUSES: readonly ProviderAdmissionCheckStatus[] = ["pending", "approved", "rejected"];
const FORBIDDEN_CONFIGURATION_KEY = /(?:api[-_]?key|access[-_]?key|private[-_]?key|client[-_]?secret|authorization|credential|password|secret|token|bearer|cookie|session|headers?)/i;
const SECRET_LIKE_CONFIGURATION_VALUE = /(?:^|\s)Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:^|[?&])(?:api[-_]?key|access[-_]?key|token|signature|authorization)=/i;

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

function freezeJson<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeJson(child);
    Object.freeze(value);
  }
  return value;
}

function requireIsoDate(value: unknown, name: string): asserts value is string {
  requireString(value, name);
  if (Number.isNaN(Date.parse(value))) {
    throw new ProviderContractError("invalid_provider_provenance", `${name} is invalid.`);
  }
}

function validatePublicConfiguration(value: unknown, path = "configuration.values"): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    if (SECRET_LIKE_CONFIGURATION_VALUE.test(value)) {
      throw new ProviderContractError(
        "secret_provider_configuration",
        "Provider manifests cannot contain secret-shaped configuration values.",
      );
    }
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ProviderContractError("invalid_provider_manifest", `${path} must contain finite JSON values.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePublicConfiguration(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ProviderContractError("invalid_provider_manifest", `${path} must contain JSON values only.`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_CONFIGURATION_KEY.test(key)) {
      throw new ProviderContractError(
        "secret_provider_configuration",
        "Provider manifests cannot contain credential or secret configuration keys.",
      );
    }
    validatePublicConfiguration(item, `${path}.${key}`);
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

export function validateProviderProvenanceDossier(
  value: ProviderProvenanceDossier,
): Readonly<ProviderProvenanceDossier> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderContractError("invalid_provider_provenance", "Provider provenance dossier must be an object.");
  }
  if (value.schemaVersion !== "voxl.provider-provenance-dossier/v1") {
    throw new ProviderContractError("invalid_provider_provenance", "Provider provenance schemaVersion is invalid.");
  }
  requireString(value.id, "dossier.id", ID_PATTERN);
  requireString(value.version, "dossier.version", VERSION_PATTERN);
  requireString(value.candidateId, "dossier.candidateId", ID_PATTERN);
  if (!(["pending", "admitted", "rejected"] as const).includes(value.decision)) {
    throw new ProviderContractError("invalid_provider_provenance", "Provider provenance decision is invalid.");
  }
  if (value.reviewedAt !== null) requireIsoDate(value.reviewedAt, "dossier.reviewedAt");
  if (!value.checks || typeof value.checks !== "object" || Array.isArray(value.checks)) {
    throw new ProviderContractError("invalid_provider_provenance", "Provider provenance checks are invalid.");
  }
  for (const check of PROVENANCE_CHECKS) {
    if (!ADMISSION_CHECK_STATUSES.includes(value.checks[check])) {
      throw new ProviderContractError("invalid_provider_provenance", `Provider provenance check '${check}' is invalid.`);
    }
  }
  if (!Array.isArray(value.evidence) || !Array.isArray(value.blockers)
    || value.blockers.some((item) => typeof item !== "string" || !item)) {
    throw new ProviderContractError("invalid_provider_provenance", "Provider provenance evidence or blockers are invalid.");
  }
  for (const evidence of value.evidence) {
    requireString(evidence.id, "dossier.evidence.id", ID_PATTERN);
    if (!PROVENANCE_CHECKS.includes(evidence.check)) {
      throw new ProviderContractError("invalid_provider_provenance", "Provider provenance evidence check is invalid.");
    }
    requireString(evidence.source, "dossier.evidence.source");
    requireIsoDate(evidence.checkedAt, "dossier.evidence.checkedAt");
  }
  if (value.decision === "admitted") {
    if (value.reviewedAt === null || value.blockers.length > 0
      || PROVENANCE_CHECKS.some((check) => value.checks[check] !== "approved")
      || PROVENANCE_CHECKS.some((check) => !value.evidence.some((item) => item.check === check))) {
      throw new ProviderContractError(
        "provider_not_admissible",
        "An admitted provider requires approved checks, dated evidence, review time, and no blockers.",
      );
    }
  }
  if (value.decision === "rejected"
    && !value.blockers.length
    && !PROVENANCE_CHECKS.some((check) => value.checks[check] === "rejected")) {
    throw new ProviderContractError(
      "invalid_provider_provenance",
      "A rejected provider requires a rejected check or blocker.",
    );
  }
  return freezeJson(structuredClone(value));
}

export function validateGenerationProviderManifest(
  value: GenerationProviderManifest,
): Readonly<GenerationProviderManifest> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderContractError("invalid_provider_manifest", "Provider manifest must be an object.");
  }
  if (value.schemaVersion !== "voxl.generation-provider-manifest/v1") {
    throw new ProviderContractError("invalid_provider_manifest", "Provider manifest schemaVersion is invalid.");
  }
  const descriptor = validateGenerationProviderDescriptor(value.descriptor);
  if (value.executionClass !== "managed-api" || value.computeOwnership !== "provider-managed") {
    throw new ProviderContractError("invalid_provider_manifest", "Managed API compute metadata is invalid.");
  }
  if (descriptor.networkAccess !== "required") {
    throw new ProviderContractError("invalid_provider_manifest", "Managed API candidates must declare required network access.");
  }
  if (!(["none", "external-at-execution"] as const).includes(value.credentialMode)) {
    throw new ProviderContractError("invalid_provider_manifest", "Provider credentialMode is invalid.");
  }
  if (!value.configuration || typeof value.configuration !== "object" || Array.isArray(value.configuration)) {
    throw new ProviderContractError("invalid_provider_manifest", "Provider configuration is invalid.");
  }
  requireString(value.configuration.id, "configuration.id", ID_PATTERN);
  validatePublicConfiguration(value.configuration.values);
  requireString(value.configurationSha256, "configurationSha256", SHA256_PATTERN);
  if (!value.provenanceDossier || typeof value.provenanceDossier !== "object"
    || Array.isArray(value.provenanceDossier)) {
    throw new ProviderContractError("invalid_provider_manifest", "Provider provenance dossier reference is invalid.");
  }
  requireString(value.provenanceDossier.id, "provenanceDossier.id", ID_PATTERN);
  requireString(value.provenanceDossier.path, "provenanceDossier.path");
  requireString(value.provenanceDossier.sha256, "provenanceDossier.sha256", SHA256_PATTERN);
  return freezeJson(structuredClone({ ...value, descriptor }));
}

export class GenerationProviderCatalog {
  readonly #entries = new Map<string, Readonly<GenerationProviderCatalogEntry>>();

  register(options: {
    manifest: GenerationProviderManifest;
    dossier: ProviderProvenanceDossier;
    observedConfigurationSha256: string;
    observedDossierSha256: string;
  }): Readonly<GenerationProviderCatalogEntry> {
    const manifest = validateGenerationProviderManifest(options.manifest);
    const dossier = validateProviderProvenanceDossier(options.dossier);
    if (manifest.descriptor.id !== dossier.candidateId
      || manifest.provenanceDossier.id !== dossier.id) {
      throw new ProviderContractError("provider_identity_mismatch", "Provider manifest and dossier identities differ.");
    }
    if (manifest.configurationSha256 !== options.observedConfigurationSha256
      || manifest.provenanceDossier.sha256 !== options.observedDossierSha256) {
      throw new ProviderContractError("provider_integrity_mismatch", "Provider manifest integrity metadata differs.");
    }
    if (this.#entries.has(manifest.descriptor.id)) {
      throw new ProviderContractError("duplicate_provider", "A provider candidate with that ID is already catalogued.");
    }
    const entry = freezeJson({
      descriptor: manifest.descriptor,
      executionClass: manifest.executionClass,
      computeOwnership: manifest.computeOwnership,
      credentialMode: manifest.credentialMode,
      configurationId: manifest.configuration.id,
      configurationSha256: manifest.configurationSha256,
      provenanceDossierId: dossier.id,
      provenanceDossierSha256: manifest.provenanceDossier.sha256,
      admissionDecision: dossier.decision,
      admissionBlockers: [...dossier.blockers],
    } satisfies GenerationProviderCatalogEntry);
    this.#entries.set(entry.descriptor.id, entry);
    return entry;
  }

  list(): Readonly<GenerationProviderCatalogEntry>[] {
    return [...this.#entries.values()].sort((left, right) => left.descriptor.id.localeCompare(right.descriptor.id));
  }

  listAdmitted(): Readonly<GenerationProviderCatalogEntry>[] {
    return this.list().filter((entry) => entry.admissionDecision === "admitted");
  }

  get(id: string): Readonly<GenerationProviderCatalogEntry> {
    const entry = this.#entries.get(id);
    if (!entry) throw new ProviderContractError("provider_not_found", "Provider candidate is not catalogued.");
    return entry;
  }
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
