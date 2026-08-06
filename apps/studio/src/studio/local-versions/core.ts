export const LOCAL_VERSION_STORAGE_KEY = "voxl-local-versions-v1";
export const LOCAL_VERSION_STORE_VERSION = 1;
export const LOCAL_VERSION_LIMIT = 25;

export interface LocalVersionScope {
  engineId: string;
  assetKey: string;
}

export interface LocalVersionRecord extends LocalVersionScope {
  id: string;
  storeVersion: 1;
  engineVersion: string;
  documentKind: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  parentVersionId?: string;
  operationSummary: string;
  documentJson: string;
  checksum: string;
}

export interface CreateLocalVersionInput extends LocalVersionScope {
  id: string;
  engineVersion: string;
  documentKind: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  parentVersionId?: string;
  operationSummary: string;
  documentJson: string;
}

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireIdentifier(value: string, field: string): string {
  if (!SAFE_ID.test(value)) throw new Error(`${field} is invalid.`);
  return value;
}

export function normalizeVersionName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Version name is required.");
  if (name.length > 60) throw new Error("Version name must be 60 characters or fewer.");
  if (/\p{Cc}/u.test(name)) throw new Error("Version name contains unsupported characters.");
  return name;
}

export function checksumDocument(documentJson: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < documentJson.length; index += 1) {
    hash ^= documentJson.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function parseRecord(value: unknown): LocalVersionRecord | undefined {
  if (!isRecord(value)) return undefined;
  if (
    value.storeVersion !== LOCAL_VERSION_STORE_VERSION
    || typeof value.id !== "string"
    || typeof value.engineId !== "string"
    || typeof value.assetKey !== "string"
    || typeof value.engineVersion !== "string"
    || typeof value.documentKind !== "string"
    || !Number.isInteger(value.schemaVersion)
    || typeof value.name !== "string"
    || typeof value.createdAt !== "string"
    || typeof value.operationSummary !== "string"
    || typeof value.documentJson !== "string"
    || typeof value.checksum !== "string"
    || (value.parentVersionId !== undefined && typeof value.parentVersionId !== "string")
  ) return undefined;
  if (!SAFE_ID.test(value.id) || !SAFE_ID.test(value.engineId) || !SAFE_ID.test(value.assetKey)) {
    return undefined;
  }
  if (value.parentVersionId !== undefined && !SAFE_ID.test(value.parentVersionId)) return undefined;
  try {
    if (normalizeVersionName(value.name) !== value.name) return undefined;
    JSON.parse(value.documentJson);
  } catch {
    return undefined;
  }
  if (checksumDocument(value.documentJson) !== value.checksum) return undefined;

  return {
    id: value.id,
    storeVersion: 1,
    engineId: value.engineId,
    assetKey: value.assetKey,
    engineVersion: value.engineVersion,
    documentKind: value.documentKind,
    schemaVersion: Number(value.schemaVersion),
    name: value.name,
    createdAt: value.createdAt,
    ...(value.parentVersionId ? { parentVersionId: value.parentVersionId } : {}),
    operationSummary: value.operationSummary,
    documentJson: value.documentJson,
    checksum: value.checksum,
  };
}

export function parseLocalVersions(raw: string | null | undefined): LocalVersionRecord[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      const record = parseRecord(item);
      return record ? [record] : [];
    });
  } catch {
    return [];
  }
}

export function versionsForScope(
  records: readonly LocalVersionRecord[],
  scope: LocalVersionScope,
): LocalVersionRecord[] {
  return records
    .filter((record) => record.engineId === scope.engineId && record.assetKey === scope.assetKey)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

export function createLocalVersion(
  records: readonly LocalVersionRecord[],
  input: CreateLocalVersionInput,
): LocalVersionRecord[] {
  requireIdentifier(input.id, "Version ID");
  requireIdentifier(input.engineId, "Engine ID");
  requireIdentifier(input.assetKey, "Asset key");
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 1) {
    throw new Error("Schema version must be a positive integer.");
  }
  JSON.parse(input.documentJson);
  const name = normalizeVersionName(input.name);
  const scoped = versionsForScope(records, input);
  if (scoped.length >= LOCAL_VERSION_LIMIT) {
    throw new Error(`Local version limit reached (${LOCAL_VERSION_LIMIT}).`);
  }
  if (scoped.some((record) => record.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A local version with that name already exists.");
  }
  if (records.some((record) => record.id === input.id)) {
    throw new Error("Version ID already exists.");
  }
  if (input.parentVersionId && !scoped.some((record) => record.id === input.parentVersionId)) {
    throw new Error("Parent version does not belong to this asset.");
  }

  const record: LocalVersionRecord = {
    id: input.id,
    storeVersion: 1,
    engineId: input.engineId,
    assetKey: input.assetKey,
    engineVersion: input.engineVersion,
    documentKind: input.documentKind,
    schemaVersion: input.schemaVersion,
    name,
    createdAt: input.createdAt,
    ...(input.parentVersionId ? { parentVersionId: input.parentVersionId } : {}),
    operationSummary: input.operationSummary.trim() || "Saved local draft",
    documentJson: input.documentJson,
    checksum: checksumDocument(input.documentJson),
  };
  return [...records, record];
}

export function createLocalVersionId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ? `local:${random}` : `local:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export function writeLocalVersions(
  storage: { setItem: (key: string, value: string) => void },
  records: readonly LocalVersionRecord[],
): void {
  storage.setItem(LOCAL_VERSION_STORAGE_KEY, JSON.stringify(records));
}
