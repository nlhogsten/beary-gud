export type HumanoidSkinProfileId = "wide-arm-64" | "slim-arm-64" | "wide-arm-128" | "slim-arm-128";
export type HumanoidSkinLayer = "base" | "outer";
export type HumanoidSkinFace = "top" | "bottom" | "right" | "front" | "left" | "back";
export type HumanoidSkinPart = "head" | "torso" | "right-arm" | "left-arm" | "right-leg" | "left-leg";

export interface HumanoidSkinRegion {
  part: HumanoidSkinPart;
  layer: HumanoidSkinLayer;
  face: HumanoidSkinFace;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HumanoidSkinPartGeometry {
  width: number;
  height: number;
  depth: number;
  position: readonly [number, number, number];
}

export interface HumanoidSkinGeometry {
  parts: Readonly<Record<HumanoidSkinPart, HumanoidSkinPartGeometry>>;
  outerLayerOffset: number;
  previewWidth: number;
  previewHeight: number;
}

export interface HumanoidSkinProfile {
  id: HumanoidSkinProfileId;
  width: 64 | 128;
  height: 64 | 128;
  texelScale: 1 | 2;
  armWidth: 3 | 4;
  armDepth: 4;
  geometry: HumanoidSkinGeometry;
  regions: readonly HumanoidSkinRegion[];
  byKey: Readonly<Record<string, HumanoidSkinRegion>>;
}

export interface HumanoidSkinRegionSelection {
  part: HumanoidSkinPart;
  layer: HumanoidSkinLayer;
  face: HumanoidSkinFace;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export const BASE_TEXTURE_WIDTH: 64;
export const BASE_TEXTURE_HEIGHT: 64;
export const HUMANOID_SKIN_TEXTURE_SIZES: readonly (64 | 128)[];
export const HUMANOID_SKIN_PROFILE_IDS: readonly HumanoidSkinProfileId[];
export const HUMANOID_SKIN_PROFILES: Readonly<Record<HumanoidSkinProfileId, HumanoidSkinProfile>>;
export function getHumanoidSkinProfile(profileId: HumanoidSkinProfileId): HumanoidSkinProfile;
export function getHumanoidSkinRegion(
  profileId: HumanoidSkinProfileId,
  part: HumanoidSkinPart,
  layer: HumanoidSkinLayer,
  faceName: HumanoidSkinFace,
): HumanoidSkinRegion;
export function createMappedPixelMask(profileId: HumanoidSkinProfileId, layer?: HumanoidSkinLayer): Uint8Array;
export function createHumanoidSkinSelectionMask(
  profileId: HumanoidSkinProfileId,
  selections: readonly HumanoidSkinRegionSelection[],
): Uint8Array;
export function createUnusedPixelMask(profileId: HumanoidSkinProfileId): Uint8Array;
