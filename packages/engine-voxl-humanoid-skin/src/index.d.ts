import type {
  AssetEngine,
  EngineDescriptor,
  ExportedArtifact,
  RenderedArtifact,
  ValidationIssue,
  ValidationResult,
} from "../../engine-contracts/src/index.mjs";

export type HumanoidSkinProfileId = "wide-arm-64" | "slim-arm-64";
export type HumanoidSkinLayer = "base" | "outer";
export type HumanoidSkinFace = "top" | "bottom" | "right" | "front" | "left" | "back";
export type HumanoidSkinPart = "head" | "torso" | "right-arm" | "left-arm" | "right-leg" | "left-leg";

export type HumanoidSkinRegion = {
  part: HumanoidSkinPart;
  layer: HumanoidSkinLayer;
  face: HumanoidSkinFace;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HumanoidSkinProfile = {
  id: HumanoidSkinProfileId;
  width: 64;
  height: 64;
  armWidth: 3 | 4;
  armDepth: 4;
  regions: readonly HumanoidSkinRegion[];
  byKey: Readonly<Record<string, HumanoidSkinRegion>>;
};

export type HumanoidSkinSidecar = {
  kind: "voxl.humanoid-skin.sidecar/v1";
  formatVersion: 1;
  profile: HumanoidSkinProfileId;
  semanticRegions: Record<string, { description?: string; maskFileId?: string }>;
  references: Record<string, unknown>[];
  operations: Record<string, unknown>[];
  versions: Record<string, unknown>[];
};

export type HumanoidSkinDocument = {
  kind: "voxl.humanoid-skin/v1";
  formatVersion: 1;
  profile: HumanoidSkinProfileId;
  width: 64;
  height: 64;
  pixels: Buffer;
  sidecar: HumanoidSkinSidecar;
};

export type HumanoidSkinPreview = {
  width: number;
  height: number;
  pixels: Buffer;
  png: Buffer;
};

export const TEXTURE_WIDTH: 64;
export const TEXTURE_HEIGHT: 64;
export const HUMANOID_SKIN_DOCUMENT_KIND: "voxl.humanoid-skin/v1";
export const HUMANOID_SKIN_SIDECAR_KIND: "voxl.humanoid-skin.sidecar/v1";
export const HUMANOID_SKIN_PROFILE_IDS: readonly HumanoidSkinProfileId[];
export const HUMANOID_SKIN_PROFILES: Readonly<Record<HumanoidSkinProfileId, HumanoidSkinProfile>>;
export const humanoidSkinDescriptor: Readonly<EngineDescriptor>;

export class HumanoidSkinValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(message: string, issues: ValidationIssue[]);
}

export function getHumanoidSkinProfile(profileId: HumanoidSkinProfileId): HumanoidSkinProfile;
export function getHumanoidSkinRegion(
  profileId: HumanoidSkinProfileId,
  part: HumanoidSkinPart,
  layer: HumanoidSkinLayer,
  face: HumanoidSkinFace,
): HumanoidSkinRegion;
export function createMappedPixelMask(profileId: HumanoidSkinProfileId, layer?: HumanoidSkinLayer): Uint8Array;

export function createHumanoidSkinSidecar(
  profile: HumanoidSkinProfileId,
  values?: Partial<Pick<HumanoidSkinSidecar, "semanticRegions" | "references" | "operations" | "versions">>,
): HumanoidSkinSidecar;

export function createHumanoidSkinDocument(values: {
  profile: HumanoidSkinProfileId;
  pixels: Uint8Array;
  sidecar?: HumanoidSkinSidecar;
}): HumanoidSkinDocument;

export function createBlankHumanoidSkinDocument(
  profile: HumanoidSkinProfileId,
  options?: { baseColor?: [number, number, number, number]; sidecar?: HumanoidSkinSidecar },
): HumanoidSkinDocument;

export function validateHumanoidSkinDocument(document: unknown): ValidationResult;
export function assertValidHumanoidSkinDocument(document: unknown): ValidationResult;
export function detectHumanoidSkinProfile(pixels: Uint8Array): HumanoidSkinProfileId;
export function importHumanoidSkinPng(
  input: Uint8Array,
  options?: { profile?: HumanoidSkinProfileId | "auto"; sidecar?: HumanoidSkinSidecar },
): HumanoidSkinDocument;
export function exportHumanoidSkinPng(document: HumanoidSkinDocument): Buffer;
export function serializeHumanoidSkinSidecar(document: HumanoidSkinDocument): string;
export function encodeRgbaPng(width: number, height: number, pixels: Uint8Array): Buffer;
export function decodeRgbaPng(input: Uint8Array): { width: number; height: number; pixels: Buffer };

export function renderHumanoidSkinPreview(
  document: HumanoidSkinDocument,
  options?: { view?: "front" | "back"; scale?: number },
): HumanoidSkinPreview;
export function renderHumanoidSkinPreviews(
  document: HumanoidSkinDocument,
  options?: { scale?: number },
): Array<RenderedArtifact & { bytes: Buffer; width: number; height: number; profile: string }>;
export function createHumanoidSkinEngine(): AssetEngine<HumanoidSkinDocument>;

export type HumanoidSkinExport = ExportedArtifact & {
  bytes: Buffer;
  sha256: string;
  profile: HumanoidSkinProfileId;
};
