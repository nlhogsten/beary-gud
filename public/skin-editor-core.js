export const SKIN_SIZE = 64;
export const SKIN_PROFILE_IDS = Object.freeze(["wide-arm-64", "slim-arm-64"]);
export const SKIN_PARTS = Object.freeze(["head", "torso", "right-arm", "left-arm", "right-leg", "left-leg"]);

function face(part, layer, name, x, y, width, height) {
  return Object.freeze({ part, layer, face: name, x, y, width, height });
}

function box(part, layer, x, y, width, height, depth) {
  return [
    face(part, layer, "top", x + depth, y, width, depth),
    face(part, layer, "bottom", x + depth + width, y, width, depth),
    face(part, layer, "right", x, y + depth, depth, height),
    face(part, layer, "front", x + depth, y + depth, width, height),
    face(part, layer, "left", x + depth + width, y + depth, depth, height),
    face(part, layer, "back", x + depth + width + depth, y + depth, width, height),
  ];
}

function buildRegions(armWidth) {
  return Object.freeze([
    ...box("head", "base", 0, 0, 8, 8, 8),
    ...box("head", "outer", 32, 0, 8, 8, 8),
    ...box("right-leg", "base", 0, 16, 4, 12, 4),
    ...box("torso", "base", 16, 16, 8, 12, 4),
    ...box("right-arm", "base", 40, 16, armWidth, 12, 4),
    ...box("right-leg", "outer", 0, 32, 4, 12, 4),
    ...box("torso", "outer", 16, 32, 8, 12, 4),
    ...box("right-arm", "outer", 40, 32, armWidth, 12, 4),
    ...box("left-leg", "outer", 0, 48, 4, 12, 4),
    ...box("left-leg", "base", 16, 48, 4, 12, 4),
    ...box("left-arm", "base", 32, 48, armWidth, 12, 4),
    ...box("left-arm", "outer", 48, 48, armWidth, 12, 4),
  ]);
}

function createProfile(id, armWidth) {
  const regions = buildRegions(armWidth);
  return Object.freeze({
    id,
    armWidth,
    regions,
    byKey: Object.freeze(Object.fromEntries(regions.map((region) => [
      `${region.part}.${region.layer}.${region.face}`,
      region,
    ]))),
  });
}

export const SKIN_PROFILES = Object.freeze({
  "wide-arm-64": createProfile("wide-arm-64", 4),
  "slim-arm-64": createProfile("slim-arm-64", 3),
});

export function skinProfile(profileId) {
  const profile = SKIN_PROFILES[profileId];
  if (!profile) throw new Error(`Unsupported skin profile '${profileId}'.`);
  return profile;
}

export function skinRegion(profileId, part, layer, faceName) {
  const region = skinProfile(profileId).byKey[`${part}.${layer}.${faceName}`];
  if (!region) throw new Error(`Unknown skin region '${part}.${layer}.${faceName}'.`);
  return region;
}

export function skinMappedMask(profileId, layer) {
  const mask = new Uint8Array(SKIN_SIZE * SKIN_SIZE);
  for (const region of skinProfile(profileId).regions) {
    if (layer && region.layer !== layer) continue;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) mask[y * SKIN_SIZE + x] = 1;
    }
  }
  return mask;
}

export function createBlankSkinPixels(profileId, color = [127, 127, 127, 255]) {
  skinProfile(profileId);
  const pixels = new Uint8ClampedArray(SKIN_SIZE * SKIN_SIZE * 4);
  const base = skinMappedMask(profileId, "base");
  for (let pixel = 0; pixel < base.length; pixel += 1) {
    if (!base[pixel]) continue;
    pixels.set(color, pixel * 4);
  }
  return pixels;
}

export function validateSkinPixels(profileId, pixels) {
  const issues = [];
  if (!SKIN_PROFILE_IDS.includes(profileId)) {
    return { ok: false, issues: [{ code: "unsupported_profile", severity: "error", message: "Profile is unsupported." }] };
  }
  const isRgbaBytes = (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)
    && pixels.length === SKIN_SIZE * SKIN_SIZE * 4;
  if (!isRgbaBytes) {
    return { ok: false, issues: [{ code: "invalid_rgba_length", severity: "error", message: "Texture must contain exactly 64×64 RGBA pixels." }] };
  }
  const mapped = skinMappedMask(profileId);
  const base = skinMappedMask(profileId, "base");
  let unusedVisible = 0;
  let transparentBase = 0;
  for (let pixel = 0; pixel < mapped.length; pixel += 1) {
    const alpha = pixels[pixel * 4 + 3];
    if (!mapped[pixel] && alpha !== 0) unusedVisible += 1;
    if (base[pixel] && alpha !== 255) transparentBase += 1;
  }
  if (unusedVisible) issues.push({ code: "visible_unused_pixels", severity: "error", message: `${unusedVisible} unused-profile pixel(s) are visible.` });
  if (transparentBase) issues.push({ code: "transparent_base_pixels", severity: "warning", message: `${transparentBase} base pixel(s) are transparent.` });
  return { ok: !issues.some(({ severity }) => severity === "error"), issues };
}

export function detectSkinProfile(pixels) {
  const wide = skinMappedMask("wide-arm-64");
  const slim = skinMappedMask("slim-arm-64");
  for (let pixel = 0; pixel < wide.length; pixel += 1) {
    if (wide[pixel] && !slim[pixel] && pixels[pixel * 4 + 3] !== 0) return "wide-arm-64";
  }
  return "slim-arm-64";
}

export function convertSkinProfile(pixels, nextProfile) {
  const converted = new Uint8ClampedArray(pixels);
  const mapped = skinMappedMask(nextProfile);
  for (let pixel = 0; pixel < mapped.length; pixel += 1) {
    if (!mapped[pixel]) converted.fill(0, pixel * 4, pixel * 4 + 4);
  }
  return converted;
}

export function pixelRegion(profileId, x, y) {
  return skinProfile(profileId).regions.find((region) => (
    x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height
  ));
}

function blend(target, targetOffset, source, sourceOffset) {
  const sourceAlpha = source[sourceOffset + 3] / 255;
  if (!sourceAlpha) return;
  const targetAlpha = target[targetOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    target[targetOffset + channel] = Math.round((
      source[sourceOffset + channel] * sourceAlpha
      + target[targetOffset + channel] * targetAlpha * (1 - sourceAlpha)
    ) / outputAlpha);
  }
  target[targetOffset + 3] = Math.round(outputAlpha * 255);
}

function drawFace(output, outputWidth, pixels, region, destinationX, destinationY) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      blend(
        output,
        ((destinationY + y) * outputWidth + destinationX + x) * 4,
        pixels,
        ((region.y + y) * SKIN_SIZE + region.x + x) * 4,
      );
    }
  }
}

function drawPart(output, profileId, pixels, part, view, x, y, layers) {
  for (const layer of ["base", "outer"]) {
    if (!layers.includes(layer)) continue;
    drawFace(output, 16, pixels, skinRegion(profileId, part, layer, view), x, y);
  }
}

export function renderSkinPreviewPixels(
  profileId,
  pixels,
  { view = "front", layers = ["base", "outer"], parts = SKIN_PARTS } = {},
) {
  const profile = skinProfile(profileId);
  const output = new Uint8ClampedArray(16 * 32 * 4);
  const enabled = new Set(parts);
  const facingFront = view === "front";
  const placements = [
    ["head", 4, 0],
    ["torso", 4, 8],
    [facingFront ? "right-arm" : "left-arm", 4 - profile.armWidth, 8],
    [facingFront ? "left-arm" : "right-arm", 12, 8],
    [facingFront ? "right-leg" : "left-leg", 4, 20],
    [facingFront ? "left-leg" : "right-leg", 8, 20],
  ];
  for (const [part, x, y] of placements) {
    if (enabled.has(part)) drawPart(output, profileId, pixels, part, view, x, y, layers);
  }
  return { width: 16, height: 32, pixels: output };
}
