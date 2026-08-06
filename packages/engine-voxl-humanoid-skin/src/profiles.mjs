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
