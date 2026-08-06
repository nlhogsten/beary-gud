export type HumanoidSkinProfileId = "wide-arm-64" | "slim-arm-64";
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

export interface HumanoidSkinProfile {
  id: HumanoidSkinProfileId;
  width: 64;
  height: 64;
  armWidth: 3 | 4;
  armDepth: 4;
  regions: readonly HumanoidSkinRegion[];
  byKey: Readonly<Record<string, HumanoidSkinRegion>>;
}

export const TEXTURE_WIDTH: 64;
export const TEXTURE_HEIGHT: 64;
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
