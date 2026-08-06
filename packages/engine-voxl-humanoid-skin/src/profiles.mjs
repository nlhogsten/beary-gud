export const TEXTURE_WIDTH = 64;
export const TEXTURE_HEIGHT = 64;

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
  const byKey = Object.freeze(Object.fromEntries(regions.map((region) => [
    `${region.part}.${region.layer}.${region.face}`,
    region,
  ])));
  return Object.freeze({
    id,
    width: TEXTURE_WIDTH,
    height: TEXTURE_HEIGHT,
    armWidth,
    armDepth: 4,
    regions,
    byKey,
  });
}

export const HUMANOID_SKIN_PROFILES = Object.freeze({
  "wide-arm-64": createProfile("wide-arm-64", 4),
  "slim-arm-64": createProfile("slim-arm-64", 3),
});

export const HUMANOID_SKIN_PROFILE_IDS = Object.freeze(Object.keys(HUMANOID_SKIN_PROFILES));

export function getHumanoidSkinProfile(profileId) {
  const profile = HUMANOID_SKIN_PROFILES[profileId];
  if (!profile) throw new Error(`Unsupported humanoid-skin profile '${profileId}'.`);
  return profile;
}

export function getHumanoidSkinRegion(profileId, part, layer, faceName) {
  const profile = getHumanoidSkinProfile(profileId);
  const region = profile.byKey[`${part}.${layer}.${faceName}`];
  if (!region) throw new Error(`Unknown humanoid-skin region '${part}.${layer}.${faceName}'.`);
  return region;
}

export function createMappedPixelMask(profileId, layer) {
  const profile = getHumanoidSkinProfile(profileId);
  const mask = new Uint8Array(profile.width * profile.height);
  for (const region of profile.regions) {
    if (layer && region.layer !== layer) continue;
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) {
        mask[y * profile.width + x] = 1;
      }
    }
  }
  return mask;
}

export function createHumanoidSkinSelectionMask(profileId, selections) {
  const profile = getHumanoidSkinProfile(profileId);
  if (!Array.isArray(selections) || selections.length === 0) {
    throw new Error("Humanoid-skin mask selections must be a non-empty array.");
  }
  const mask = new Uint8Array(profile.width * profile.height);
  for (const selection of selections) {
    if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
      throw new Error("Humanoid-skin mask selection must be an object.");
    }
    const region = getHumanoidSkinRegion(
      profileId,
      selection.part,
      selection.layer,
      selection.face,
    );
    const x = selection.x ?? 0;
    const y = selection.y ?? 0;
    const width = selection.width ?? region.width;
    const height = selection.height ?? region.height;
    if ([x, y, width, height].some((value) => !Number.isInteger(value))
      || x < 0 || y < 0 || width <= 0 || height <= 0
      || x + width > region.width || y + height > region.height) {
      throw new Error("Humanoid-skin mask selection rectangle is outside its UV face.");
    }
    for (let row = region.y + y; row < region.y + y + height; row += 1) {
      for (let column = region.x + x; column < region.x + x + width; column += 1) {
        mask[row * profile.width + column] = 1;
      }
    }
  }
  return mask;
}

export function createUnusedPixelMask(profileId) {
  const mapped = createMappedPixelMask(profileId);
  return Uint8Array.from(mapped, (value) => value ? 0 : 1);
}
