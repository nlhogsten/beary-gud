import {
  HUMANOID_SKIN_PROFILE_IDS,
  createMappedPixelMask,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
  type HumanoidSkinFace,
  type HumanoidSkinLayer,
  type HumanoidSkinPart,
  type HumanoidSkinProfileId,
  type HumanoidSkinRegion,
} from "../../../../../packages/engine-voxl-humanoid-skin/src/profiles.mjs";

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

export interface SkinVersionDocument {
  kind: "voxl.humanoid-skin/v1";
  formatVersion: 1;
  profile: SkinProfileId;
  pixels: number[];
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

export function renderPreviewSize(profileId: SkinProfileId) {
  const profile = skinProfile(profileId);
  return {
    width: profile.geometry.previewWidth * profile.texelScale,
    height: profile.geometry.previewHeight * profile.texelScale,
  };
}

export function createBlankPixels(
  profileId: SkinProfileId,
  color: readonly [number, number, number, number] = [127, 127, 127, 255],
): Uint8ClampedArray {
  const profile = skinProfile(profileId);
  const output = new Uint8ClampedArray(profile.width * profile.height * 4);
  const base = mappedMask(profileId, "base");
  for (let pixel = 0; pixel < base.length; pixel += 1) {
    if (base[pixel]) output.set(color, pixel * 4);
  }
  return output;
}

export function validatePixels(profileId: SkinProfileId, pixels: Uint8ClampedArray) {
  const profile = skinProfile(profileId);
  const issues: SkinIssue[] = [];
  if (pixels.length !== profile.width * profile.height * 4) {
    return {
      ok: false,
      issues: [{
        code: "invalid_rgba_length",
        severity: "error" as const,
        message: `Texture must contain exactly ${profile.width}×${profile.height} RGBA pixels.`,
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
  const textureSize = Math.sqrt(pixels.length / 4);
  if (!Number.isInteger(textureSize)) throw new Error("Skin texture must be square RGBA pixels.");
  const wideId = `wide-arm-${textureSize}`;
  const slimId = `slim-arm-${textureSize}`;
  if (!(SKIN_PROFILE_IDS as readonly string[]).includes(wideId)) {
    throw new Error("Skin texture resolution is unsupported.");
  }
  const wide = mappedMask(wideId as SkinProfileId);
  const slim = mappedMask(slimId as SkinProfileId);
  for (let pixel = 0; pixel < wide.length; pixel += 1) {
    if (wide[pixel] && !slim[pixel] && pixels[pixel * 4 + 3] !== 0) return wideId as SkinProfileId;
  }
  return slimId as SkinProfileId;
}

export function serializeSkinVersionDocument(
  profile: SkinProfileId,
  pixels: Uint8ClampedArray,
): string {
  const dimensions = skinProfile(profile);
  if (pixels.length !== dimensions.width * dimensions.height * 4) {
    throw new Error(`Skin version requires exactly ${dimensions.width}×${dimensions.height} RGBA pixels.`);
  }
  return JSON.stringify({
    kind: "voxl.humanoid-skin/v1",
    formatVersion: 1,
    profile,
    pixels: Array.from(pixels),
  } satisfies SkinVersionDocument);
}

export function parseSkinVersionDocument(documentJson: string): {
  profile: SkinProfileId;
  pixels: Uint8ClampedArray;
} {
  const value: unknown = JSON.parse(documentJson);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Skin version document is invalid.");
  }
  const candidate = value as Partial<SkinVersionDocument>;
  if (
    candidate.kind !== "voxl.humanoid-skin/v1"
    || candidate.formatVersion !== 1
    || typeof candidate.profile !== "string"
    || !(SKIN_PROFILE_IDS as readonly string[]).includes(candidate.profile)
    || !Array.isArray(candidate.pixels)
    || candidate.pixels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
  ) throw new Error("Skin version document is invalid.");
  const profile = candidate.profile as SkinProfileId;
  const dimensions = skinProfile(profile);
  if (candidate.pixels.length !== dimensions.width * dimensions.height * 4) {
    throw new Error("Skin version document is invalid.");
  }
  const pixels = new Uint8ClampedArray(candidate.pixels);
  const validation = validatePixels(profile, pixels);
  const blocking = validation.issues.find((issue) => issue.severity === "error");
  if (blocking) throw new Error(blocking.message);
  return { profile, pixels };
}

export function countChangedSkinPixels(leftJson: string, rightJson: string): number {
  const left = parseSkinVersionDocument(leftJson);
  const right = parseSkinVersionDocument(rightJson);
  let changed = left.profile === right.profile ? 0 : 1;
  const channelLength = Math.max(left.pixels.length, right.pixels.length);
  for (let offset = 0; offset < channelLength; offset += 4) {
    if (
      left.pixels[offset] !== right.pixels[offset]
      || left.pixels[offset + 1] !== right.pixels[offset + 1]
      || left.pixels[offset + 2] !== right.pixels[offset + 2]
      || left.pixels[offset + 3] !== right.pixels[offset + 3]
    ) changed += 1;
  }
  return changed;
}

export function convertProfile(
  pixels: Uint8ClampedArray,
  currentProfile: SkinProfileId,
  nextProfile: SkinProfileId,
): Uint8ClampedArray {
  const current = skinProfile(currentProfile);
  const next = skinProfile(nextProfile);
  if (pixels.length !== current.width * current.height * 4) {
    throw new Error(`Profile conversion requires exactly ${current.width}×${current.height} RGBA pixels.`);
  }
  if (currentProfile === nextProfile) return new Uint8ClampedArray(pixels);

  const output = new Uint8ClampedArray(next.width * next.height * 4);
  for (const destination of next.regions) {
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
        const sourceOffset = (sourceY * current.width + sourceX) * 4;
        const destinationOffset = (
          (destination.y + y) * next.width + destination.x + x
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
  outputWidth: number,
  pixels: Uint8ClampedArray,
  sourceWidth: number,
  region: SkinRegion,
  destinationX: number,
  destinationY: number,
) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      blend(
        output,
        ((destinationY + y) * outputWidth + destinationX + x) * 4,
        pixels,
        ((region.y + y) * sourceWidth + region.x + x) * 4,
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
  const profile = skinProfile(profileId);
  const size = renderPreviewSize(profileId);
  const output = new Uint8ClampedArray(size.width * size.height * 4);
  const enabled = new Set(parts);
  const facingFront = view === "front";
  const texelScale = profile.texelScale;
  const placements: readonly [SkinPart, number, number][] = [
    ["head", 4 * texelScale, 0],
    ["torso", 4 * texelScale, 8 * texelScale],
    [facingFront ? "right-arm" : "left-arm", (4 - profile.armWidth) * texelScale, 8 * texelScale],
    [facingFront ? "left-arm" : "right-arm", 12 * texelScale, 8 * texelScale],
    [facingFront ? "right-leg" : "left-leg", 4 * texelScale, 20 * texelScale],
    [facingFront ? "left-leg" : "right-leg", 8 * texelScale, 20 * texelScale],
  ];
  for (const [part, x, y] of placements) {
    if (!enabled.has(part)) continue;
    for (const layer of layers) {
      drawFace(output, size.width, pixels, profile.width, skinRegion(profileId, part, layer, view), x, y);
    }
  }
  return output;
}
