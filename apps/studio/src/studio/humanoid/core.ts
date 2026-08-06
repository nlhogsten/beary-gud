import {
  HUMANOID_SKIN_PROFILE_IDS,
  TEXTURE_WIDTH,
  createMappedPixelMask,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
  type HumanoidSkinFace,
  type HumanoidSkinLayer,
  type HumanoidSkinPart,
  type HumanoidSkinProfileId,
  type HumanoidSkinRegion,
} from "../../../../../packages/engine-voxl-humanoid-skin/src/profiles.mjs";

export const SKIN_SIZE = TEXTURE_WIDTH;
export const SKIN_PROFILE_IDS = HUMANOID_SKIN_PROFILE_IDS;
export const CUBOID_HUMANOID_RENDERER_ID = "cuboid-humanoid-renderer";
export type SkinProfileId = HumanoidSkinProfileId;

export const SKIN_PARTS = [
  "head",
  "torso",
  "right-arm",
  "left-arm",
  "right-leg",
  "left-leg",
] as const;
export type SkinPart = HumanoidSkinPart;
export type SkinLayer = HumanoidSkinLayer;
export type SkinFace = HumanoidSkinFace;
export type SkinRegion = HumanoidSkinRegion;

export interface SkinIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export function skinProfile(profileId: SkinProfileId) {
  return getHumanoidSkinProfile(profileId);
}

export function skinRegion(
  profileId: SkinProfileId,
  part: SkinPart,
  layer: SkinLayer,
  faceName: SkinFace,
): SkinRegion {
  return getHumanoidSkinRegion(profileId, part, layer, faceName);
}

export function mappedMask(profileId: SkinProfileId, layer?: SkinLayer): Uint8Array {
  return createMappedPixelMask(profileId, layer);
}

export function createBlankPixels(
  profileId: SkinProfileId,
  color: readonly [number, number, number, number] = [127, 127, 127, 255],
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(SKIN_SIZE * SKIN_SIZE * 4);
  const base = mappedMask(profileId, "base");
  for (let pixel = 0; pixel < base.length; pixel += 1) {
    if (base[pixel]) output.set(color, pixel * 4);
  }
  return output;
}

export function validatePixels(profileId: SkinProfileId, pixels: Uint8ClampedArray) {
  const issues: SkinIssue[] = [];
  if (pixels.length !== SKIN_SIZE * SKIN_SIZE * 4) {
    return {
      ok: false,
      issues: [{
        code: "invalid_rgba_length",
        severity: "error" as const,
        message: "Texture must contain exactly 64×64 RGBA pixels.",
      }],
    };
  }
  const mapped = mappedMask(profileId);
  const base = mappedMask(profileId, "base");
  let unusedVisible = 0;
  let transparentBase = 0;
  for (let pixel = 0; pixel < mapped.length; pixel += 1) {
    const alpha = pixels[pixel * 4 + 3];
    if (!mapped[pixel] && alpha !== 0) unusedVisible += 1;
    if (base[pixel] && alpha !== 255) transparentBase += 1;
  }
  if (unusedVisible) {
    issues.push({
      code: "visible_unused_pixels",
      severity: "error",
      message: `${unusedVisible} unused-profile pixel(s) are visible.`,
    });
  }
  if (transparentBase) {
    issues.push({
      code: "transparent_base_pixels",
      severity: "warning",
      message: `${transparentBase} base pixel(s) are transparent.`,
    });
  }
  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

export function detectProfile(pixels: Uint8ClampedArray): SkinProfileId {
  const wide = mappedMask("wide-arm-64");
  const slim = mappedMask("slim-arm-64");
  for (let pixel = 0; pixel < wide.length; pixel += 1) {
    if (wide[pixel] && !slim[pixel] && pixels[pixel * 4 + 3] !== 0) return "wide-arm-64";
  }
  return "slim-arm-64";
}

export function convertProfile(
  pixels: Uint8ClampedArray,
  currentProfile: SkinProfileId,
  nextProfile: SkinProfileId,
): Uint8ClampedArray {
  if (pixels.length !== SKIN_SIZE * SKIN_SIZE * 4) {
    throw new Error("Profile conversion requires exactly 64×64 RGBA pixels.");
  }
  if (currentProfile === nextProfile) return new Uint8ClampedArray(pixels);

  const output = new Uint8ClampedArray(pixels.length);
  for (const destination of skinProfile(nextProfile).regions) {
    const source = skinRegion(
      currentProfile,
      destination.part,
      destination.layer,
      destination.face,
    );
    for (let y = 0; y < destination.height; y += 1) {
      for (let x = 0; x < destination.width; x += 1) {
        const sourceX = source.x + Math.min(
          source.width - 1,
          Math.floor((x * source.width) / destination.width),
        );
        const sourceY = source.y + Math.min(
          source.height - 1,
          Math.floor((y * source.height) / destination.height),
        );
        const sourceOffset = (sourceY * SKIN_SIZE + sourceX) * 4;
        const destinationOffset = (
          (destination.y + y) * SKIN_SIZE + destination.x + x
        ) * 4;
        output.set(pixels.subarray(sourceOffset, sourceOffset + 4), destinationOffset);
      }
    }
  }
  return output;
}

export function pixelRegion(
  profileId: SkinProfileId,
  x: number,
  y: number,
): SkinRegion | undefined {
  return skinProfile(profileId).regions.find((region) => (
    x >= region.x && x < region.x + region.width
      && y >= region.y && y < region.y + region.height
  ));
}

export function uvToAtlasPixel(region: SkinRegion, u: number, v: number) {
  return {
    x: region.x + Math.min(region.width - 1, Math.max(0, Math.floor(u * region.width))),
    y: region.y + Math.min(region.height - 1, Math.max(0, Math.floor((1 - v) * region.height))),
  };
}

function blend(
  target: Uint8ClampedArray,
  targetOffset: number,
  source: Uint8ClampedArray,
  sourceOffset: number,
) {
  const sourceAlpha = (source[sourceOffset + 3] ?? 0) / 255;
  if (!sourceAlpha) return;
  const targetAlpha = (target[targetOffset + 3] ?? 0) / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    target[targetOffset + channel] = Math.round((
      (source[sourceOffset + channel] ?? 0) * sourceAlpha
      + (target[targetOffset + channel] ?? 0) * targetAlpha * (1 - sourceAlpha)
    ) / outputAlpha);
  }
  target[targetOffset + 3] = Math.round(outputAlpha * 255);
}

function drawFace(
  output: Uint8ClampedArray,
  pixels: Uint8ClampedArray,
  region: SkinRegion,
  destinationX: number,
  destinationY: number,
) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      blend(
        output,
        ((destinationY + y) * 16 + destinationX + x) * 4,
        pixels,
        ((region.y + y) * SKIN_SIZE + region.x + x) * 4,
      );
    }
  }
}

export function renderPreview(
  profileId: SkinProfileId,
  pixels: Uint8ClampedArray,
  view: "front" | "back",
  layers: readonly SkinLayer[],
  parts: readonly SkinPart[],
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(16 * 32 * 4);
  const profile = skinProfile(profileId);
  const enabled = new Set(parts);
  const facingFront = view === "front";
  const placements: readonly [SkinPart, number, number][] = [
    ["head", 4, 0],
    ["torso", 4, 8],
    [facingFront ? "right-arm" : "left-arm", 4 - profile.armWidth, 8],
    [facingFront ? "left-arm" : "right-arm", 12, 8],
    [facingFront ? "right-leg" : "left-leg", 4, 20],
    [facingFront ? "left-leg" : "right-leg", 8, 20],
  ];
  for (const [part, x, y] of placements) {
    if (!enabled.has(part)) continue;
    for (const layer of layers) {
      drawFace(output, pixels, skinRegion(profileId, part, layer, view), x, y);
    }
  }
  return output;
}
