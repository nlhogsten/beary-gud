export const CAPABILITY_KEYS: readonly CapabilityKey[];
export const ENGINE_OPERATIONS: readonly EngineOperation[];

export type EngineOperation = "create" | "revise" | "validate" | "render" | "export";
export type CapabilityKey = EngineOperation | "edit2d" | "edit3d" | "animate";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type EngineCapabilities = Record<CapabilityKey, boolean>;

export type EngineDescriptor = {
  id: string;
  version: string;
  title: string;
  documentTypes: string[];
  inputTypes: string[];
  outputFormats: string[];
  capabilities: EngineCapabilities;
};

export type FileReference = {
  id: string;
  mediaType: string;
  filename?: string;
  sha256?: string;
};

export type AssetDocumentReference = {
  id: string;
  versionId: string;
  engineId: string;
  engineVersion: string;
  documentType: string;
};

export type GenerationRequest = {
  engineId: string;
  prompt: string;
  references: FileReference[];
  existingDocument?: AssetDocumentReference;
  editMask?: FileReference;
  preserveMasks?: FileReference[];
  controls?: Record<string, unknown>;
  desiredOutputs: string[];
  clientRequestId: string;
};

export type RevisionRequest<TDocument = unknown> = {
  engineId: string;
  document: TDocument;
  instruction: string;
  references: FileReference[];
  editMask?: FileReference;
  preserveMasks?: FileReference[];
  controls?: Record<string, unknown>;
  desiredOutputs: string[];
  clientRequestId: string;
};

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export type RenderOptions = Record<string, unknown>;

export type RenderedArtifact = {
  id?: string;
  mediaType: string;
  filename: string;
  sha256?: string;
};

export type ExportedArtifact = RenderedArtifact & {
  profile?: string;
};

export type ProviderUsage = {
  providerId: string;
  inputUnits?: number;
  outputUnits?: number;
  durationMs?: number;
  estimatedCostMinor?: number;
  currency?: string;
};

export type PublicJobError = {
  code: string;
  message: string;
  retryable: boolean;
};

export type EngineJobResult = {
  jobId: string;
  engineId: string;
  engineVersion: string;
  providerId: string;
  status: JobStatus;
  document?: AssetDocumentReference;
  outputs: ExportedArtifact[];
  validation?: ValidationResult;
  usage?: ProviderUsage;
  error?: PublicJobError;
};

export type EngineInvocationContext = {
  descriptor: Readonly<EngineDescriptor>;
};

type Handler<TRequest, TResult> = (
  request: TRequest,
  context: EngineInvocationContext,
) => TResult | Promise<TResult>;

export type AssetEngine<TDocument = unknown> = {
  descriptor: EngineDescriptor;
  create?: Handler<GenerationRequest, EngineJobResult>;
  revise?: Handler<RevisionRequest<TDocument>, EngineJobResult>;
  validate?: Handler<TDocument, ValidationResult>;
  render?: Handler<{ document: TDocument; options?: RenderOptions }, RenderedArtifact[]>;
  export?: Handler<{ document: TDocument; profile: string }, ExportedArtifact>;
};

export class EngineContractError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
  constructor(code: string, message: string, details?: Record<string, unknown>);
  toJSON(): {
    name: string;
    code: string;
    message: string;
    details: Readonly<Record<string, unknown>>;
  };
}

export class EngineExecutionError extends EngineContractError {
  readonly cause: unknown;
  constructor(engineId: string, operation: EngineOperation, cause: unknown);
}

export function validateEngineDescriptor(descriptor: EngineDescriptor): Readonly<EngineDescriptor>;
export function defineEngine<TDocument>(engine: AssetEngine<TDocument>): Readonly<AssetEngine<TDocument>>;

export class EngineRegistry {
  constructor(engines?: AssetEngine[]);
  register(engine: AssetEngine): Readonly<EngineDescriptor>;
  has(engineId: string): boolean;
  list(): Readonly<EngineDescriptor>[];
  getDescriptor(engineId: string): Readonly<EngineDescriptor>;
  invoke<TResult = unknown>(engineId: string, operation: EngineOperation, request: unknown): Promise<TResult>;
}
