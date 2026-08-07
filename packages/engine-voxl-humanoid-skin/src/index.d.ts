import type {
  AssetEngine,
  EngineDescriptor,
  ExportedArtifact,
  RenderedArtifact,
  ValidationIssue,
  ValidationResult,
} from "../../engine-contracts/src/index.mjs";

export type HumanoidSkinProfileId = "wide-arm-64" | "slim-arm-64" | "wide-arm-128" | "slim-arm-128";
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

export type HumanoidSkinPartGeometry = {
  width: number;
  height: number;
  depth: number;
  position: readonly [number, number, number];
};

export type HumanoidSkinGeometry = {
  parts: Readonly<Record<HumanoidSkinPart, HumanoidSkinPartGeometry>>;
  outerLayerOffset: number;
  previewWidth: number;
  previewHeight: number;
};

export type HumanoidSkinProfile = {
  id: HumanoidSkinProfileId;
  width: 64 | 128;
  height: 64 | 128;
  texelScale: 1 | 2;
  armWidth: 3 | 4;
  armDepth: 4;
  geometry: HumanoidSkinGeometry;
  regions: readonly HumanoidSkinRegion[];
  byKey: Readonly<Record<string, HumanoidSkinRegion>>;
};

export type HumanoidSkinRegionSelection = {
  part: HumanoidSkinPart;
  layer: HumanoidSkinLayer;
  face: HumanoidSkinFace;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
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
  width: 64 | 128;
  height: 64 | 128;
  pixels: Buffer;
  sidecar: HumanoidSkinSidecar;
};

export type HumanoidSkinPreview = {
  width: number;
  height: number;
  pixels: Buffer;
  png: Buffer;
};

export type HumanoidSkinGenerationRepresentationId = "direct-atlas-v1" | "surface-sheet-v1";

export type HumanoidSkinGenerationArtifact = Readonly<{
  mediaType: "image/png";
  width: 1024;
  height: 1024;
  bytes: Buffer;
  sha256: string;
}>;

export type HumanoidSkinGenerationPanel = Readonly<{
  id: string;
  index: number;
  part: HumanoidSkinPart;
  layer: HumanoidSkinLayer;
  face: HumanoidSkinFace;
  atlas: Readonly<{ x: number; y: number; width: number; height: number }>;
  sheet: Readonly<{ x: number; y: number; width: number; height: number }>;
  marker: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
    rgba: readonly [number, number, number, number];
  }>;
}>;

export type HumanoidSkinGenerationLayout = Readonly<{
  representationId: HumanoidSkinGenerationRepresentationId;
  version: 1;
  profile: HumanoidSkinProfileId;
  width: 1024;
  height: 1024;
  blockSize: number;
  alphaPolicy: "rgba-median-with-reserved-transparency-key-v1";
  invalidRegionPolicy: "force-transparent-black-v1";
  panels?: readonly HumanoidSkinGenerationPanel[];
}>;

export type HumanoidSkinGenerationRepresentation = Readonly<{
  id: HumanoidSkinGenerationRepresentationId;
  profile: HumanoidSkinProfileId;
  layout: HumanoidSkinGenerationLayout;
  template: HumanoidSkinGenerationArtifact;
  guide: HumanoidSkinGenerationArtifact;
}>;

export type HumanoidSkinGenerationNormalizationReport = Readonly<{
  representationId: HumanoidSkinGenerationRepresentationId;
  profile: HumanoidSkinProfileId;
  transparencyKeyBlocks: number;
  invalidRegionsRestored: number;
  revisionApplied: boolean;
  restoredTexels: number;
  protectedChangedTexelsBeforeComposite: number;
  immutableChangedTexelsBeforeComposite: number;
  protectedChangedTexelsAfterComposite: 0;
  immutableChangedTexelsAfterComposite: 0;
}>;

export const BASE_TEXTURE_WIDTH: 64;
export const BASE_TEXTURE_HEIGHT: 64;
export const HUMANOID_SKIN_TEXTURE_SIZES: readonly (64 | 128)[];
export const HUMANOID_SKIN_DOCUMENT_KIND: "voxl.humanoid-skin/v1";
export const HUMANOID_SKIN_SIDECAR_KIND: "voxl.humanoid-skin.sidecar/v1";
export const HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS: readonly HumanoidSkinGenerationRepresentationId[];
export const HUMANOID_SKIN_GENERATION_CANVAS_SIZE: 1024;
export const HUMANOID_SKIN_TRANSPARENCY_KEY: readonly [255, 0, 255, 255];
export const HUMANOID_SKIN_PROFILE_IDS: readonly HumanoidSkinProfileId[];
export const HUMANOID_SKIN_PROFILES: Readonly<Record<HumanoidSkinProfileId, HumanoidSkinProfile>>;
export const humanoidSkinDescriptor: Readonly<EngineDescriptor>;

export class HumanoidSkinValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(message: string, issues: ValidationIssue[]);
}

export class HumanoidSkinRepresentationError extends Error {
  readonly code: string;
  constructor(code: string, message: string);
}

export function getHumanoidSkinProfile(profileId: HumanoidSkinProfileId): HumanoidSkinProfile;
export function getHumanoidSkinRegion(
  profileId: HumanoidSkinProfileId,
  part: HumanoidSkinPart,
  layer: HumanoidSkinLayer,
  face: HumanoidSkinFace,
): HumanoidSkinRegion;
export function createMappedPixelMask(profileId: HumanoidSkinProfileId, layer?: HumanoidSkinLayer): Uint8Array;
export function createHumanoidSkinSelectionMask(
  profileId: HumanoidSkinProfileId,
  selections: readonly HumanoidSkinRegionSelection[],
): Uint8Array;
export function createUnusedPixelMask(profileId: HumanoidSkinProfileId): Uint8Array;

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
export function renderHumanoidSkinGenerationRepresentation(
  document: HumanoidSkinDocument,
  representationId: HumanoidSkinGenerationRepresentationId,
): HumanoidSkinGenerationRepresentation;
export function normalizeHumanoidSkinGenerationCandidate(values: {
  representationId: HumanoidSkinGenerationRepresentationId;
  profile: HumanoidSkinProfileId;
  candidatePng: Uint8Array;
  baselineDocument?: HumanoidSkinDocument;
  editableMask?: Uint8Array;
  protectedMask?: Uint8Array;
  immutableMask?: Uint8Array;
}): Readonly<{
  document: HumanoidSkinDocument;
  layout: HumanoidSkinGenerationLayout;
  report: HumanoidSkinGenerationNormalizationReport;
}>;
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
