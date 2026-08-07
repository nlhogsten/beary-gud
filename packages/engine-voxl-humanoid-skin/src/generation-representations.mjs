import { createHash } from "node:crypto";
import {
  createMappedPixelMask,
  getHumanoidSkinProfile,
} from "./profiles.mjs";
import { decodeRgbaPng, encodeRgbaPng } from "./png.mjs";

export const HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS = Object.freeze([
  "direct-atlas-v1",
  "surface-sheet-v1",
]);
export const HUMANOID_SKIN_GENERATION_CANVAS_SIZE = 1024;
export const HUMANOID_SKIN_TRANSPARENCY_KEY = Object.freeze([255, 0, 255, 255]);

const SURFACE_COLUMNS = 8;
const SURFACE_ROWS = 9;
const SURFACE_CELL_SIZE = 112;
const SURFACE_MARGIN_X = 64;
const SURFACE_MARGIN_Y = 8;
const SURFACE_MARKER_SIZE = 4;
const SURFACE_BACKGROUND = Object.freeze([12, 16, 24, 255]);
const DIRECT_GUIDE_COLORS = Object.freeze({
  base: Object.freeze([40, 120, 255, 255]),
  outer: Object.freeze([255, 100, 200, 255]),
  unused: Object.freeze([20, 24, 32, 255]),
});

export class HumanoidSkinRepresentationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HumanoidSkinRepresentationError";
    this.code = code;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function freezeArtifact(width, height, bytes) {
  return Object.freeze({
    mediaType: "image/png",
    width,
    height,
    bytes,
    sha256: sha256(bytes),
  });
}

function setPixel(pixels, width, x, y, rgba) {
  pixels.set(rgba, (y * width + x) * 4);
}

function fillRect(pixels, canvasWidth, x, y, width, height, rgba) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setPixel(pixels, canvasWidth, column, row, rgba);
    }
  }
}

function fillCanvas(width, height, rgba) {
  const pixels = Buffer.alloc(width * height * 4);
  fillRect(pixels, width, 0, 0, width, height, rgba);
  return pixels;
}

function modelVisibleRgba(source, offset) {
  if (source[offset + 3] === 0) return HUMANOID_SKIN_TRANSPARENCY_KEY;
  return source.subarray(offset, offset + 4);
}

function drawScaledTexel(target, targetWidth, x, y, blockSize, rgba) {
  fillRect(target, targetWidth, x, y, blockSize, blockSize, rgba);
}

function markerColor(index) {
  const encoded = index + 1;
  return Object.freeze([encoded, 255 - encoded, (encoded * 73) % 251, 255]);
}

function directAtlasLayout(profileId) {
  const profile = getHumanoidSkinProfile(profileId);
  const blockSize = HUMANOID_SKIN_GENERATION_CANVAS_SIZE / profile.width;
  if (!Number.isInteger(blockSize)) {
    throw new HumanoidSkinRepresentationError(
      "unsupported_profile_density",
      "The direct atlas requires a texture density that divides the generation canvas exactly.",
    );
  }
  return Object.freeze({
    representationId: "direct-atlas-v1",
    version: 1,
    profile: profile.id,
    width: HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
    height: HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
    blockSize,
    logicalWidth: profile.width,
    logicalHeight: profile.height,
    alphaPolicy: "rgba-median-with-reserved-transparency-key-v1",
    invalidRegionPolicy: "force-transparent-black-v1",
  });
}

function surfaceSheetLayout(profileId) {
  const profile = getHumanoidSkinProfile(profileId);
  const blockSize = 8 / profile.texelScale;
  if (!Number.isInteger(blockSize) || profile.regions.length > SURFACE_COLUMNS * SURFACE_ROWS) {
    throw new HumanoidSkinRepresentationError(
      "unsupported_profile_density",
      "The surface sheet cannot represent this texture density or face count.",
    );
  }
  const panels = profile.regions.map((region, index) => {
    const column = index % SURFACE_COLUMNS;
    const row = Math.floor(index / SURFACE_COLUMNS);
    const cellX = SURFACE_MARGIN_X + column * SURFACE_CELL_SIZE;
    const cellY = SURFACE_MARGIN_Y + row * SURFACE_CELL_SIZE;
    const width = region.width * blockSize;
    const height = region.height * blockSize;
    return Object.freeze({
      id: `${region.part}.${region.layer}.${region.face}`,
      index,
      part: region.part,
      layer: region.layer,
      face: region.face,
      atlas: Object.freeze({
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      }),
      sheet: Object.freeze({
        x: cellX + Math.floor((SURFACE_CELL_SIZE - width) / 2),
        y: cellY + Math.floor((SURFACE_CELL_SIZE - height) / 2),
        width,
        height,
      }),
      marker: Object.freeze({
        x: cellX + 2,
        y: cellY + 2,
        width: SURFACE_MARKER_SIZE,
        height: SURFACE_MARKER_SIZE,
        rgba: markerColor(index),
      }),
    });
  });
  return Object.freeze({
    representationId: "surface-sheet-v1",
    version: 1,
    profile: profile.id,
    width: HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
    height: HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
    blockSize,
    columns: SURFACE_COLUMNS,
    rows: SURFACE_ROWS,
    orientation: "atlas-native-face-orientation-v1",
    alphaPolicy: "rgba-median-with-reserved-transparency-key-v1",
    invalidRegionPolicy: "force-transparent-black-v1",
    panels: Object.freeze(panels),
  });
}

function renderDirectAtlas(document) {
  const layout = directAtlasLayout(document.profile);
  const templatePixels = Buffer.alloc(layout.width * layout.height * 4);
  const guidePixels = Buffer.alloc(layout.width * layout.height * 4);
  const baseMask = createMappedPixelMask(document.profile, "base");
  const outerMask = createMappedPixelMask(document.profile, "outer");
  for (let y = 0; y < document.height; y += 1) {
    for (let x = 0; x < document.width; x += 1) {
      const pixel = y * document.width + x;
      const offset = pixel * 4;
      drawScaledTexel(
        templatePixels,
        layout.width,
        x * layout.blockSize,
        y * layout.blockSize,
        layout.blockSize,
        modelVisibleRgba(document.pixels, offset),
      );
      const guideColor = baseMask[pixel]
        ? DIRECT_GUIDE_COLORS.base
        : outerMask[pixel]
          ? DIRECT_GUIDE_COLORS.outer
          : DIRECT_GUIDE_COLORS.unused;
      drawScaledTexel(
        guidePixels,
        layout.width,
        x * layout.blockSize,
        y * layout.blockSize,
        layout.blockSize,
        guideColor,
      );
    }
  }
  const templateBytes = encodeRgbaPng(layout.width, layout.height, templatePixels);
  const guideBytes = encodeRgbaPng(layout.width, layout.height, guidePixels);
  return Object.freeze({
    id: layout.representationId,
    profile: document.profile,
    layout,
    template: freezeArtifact(layout.width, layout.height, templateBytes),
    guide: freezeArtifact(layout.width, layout.height, guideBytes),
  });
}

function drawSurfacePanel(target, targetWidth, document, panel) {
  for (let y = 0; y < panel.atlas.height; y += 1) {
    for (let x = 0; x < panel.atlas.width; x += 1) {
      const sourceOffset = ((panel.atlas.y + y) * document.width + panel.atlas.x + x) * 4;
      drawScaledTexel(
        target,
        targetWidth,
        panel.sheet.x + x * panel.sheet.width / panel.atlas.width,
        panel.sheet.y + y * panel.sheet.height / panel.atlas.height,
        panel.sheet.width / panel.atlas.width,
        modelVisibleRgba(document.pixels, sourceOffset),
      );
    }
  }
}

function renderSurfaceSheet(document) {
  const layout = surfaceSheetLayout(document.profile);
  const templatePixels = fillCanvas(layout.width, layout.height, SURFACE_BACKGROUND);
  const guidePixels = fillCanvas(layout.width, layout.height, SURFACE_BACKGROUND);
  for (const panel of layout.panels) {
    drawSurfacePanel(templatePixels, layout.width, document, panel);
    const guideColor = panel.layer === "base"
      ? DIRECT_GUIDE_COLORS.base
      : DIRECT_GUIDE_COLORS.outer;
    fillRect(
      guidePixels,
      layout.width,
      panel.sheet.x,
      panel.sheet.y,
      panel.sheet.width,
      panel.sheet.height,
      guideColor,
    );
    fillRect(
      templatePixels,
      layout.width,
      panel.marker.x,
      panel.marker.y,
      panel.marker.width,
      panel.marker.height,
      panel.marker.rgba,
    );
    fillRect(
      guidePixels,
      layout.width,
      panel.marker.x,
      panel.marker.y,
      panel.marker.width,
      panel.marker.height,
      panel.marker.rgba,
    );
  }
  const templateBytes = encodeRgbaPng(layout.width, layout.height, templatePixels);
  const guideBytes = encodeRgbaPng(layout.width, layout.height, guidePixels);
  return Object.freeze({
    id: layout.representationId,
    profile: document.profile,
    layout,
    template: freezeArtifact(layout.width, layout.height, templateBytes),
    guide: freezeArtifact(layout.width, layout.height, guideBytes),
  });
}

export function renderGenerationRepresentation(document, representationId) {
  if (representationId === "direct-atlas-v1") return renderDirectAtlas(document);
  if (representationId === "surface-sheet-v1") return renderSurfaceSheet(document);
  throw new HumanoidSkinRepresentationError(
    "unsupported_representation",
    `Unsupported humanoid-skin generation representation '${representationId}'.`,
  );
}

function decodeCandidate(candidatePng, layout) {
  if (!(candidatePng instanceof Uint8Array)) {
    throw new HumanoidSkinRepresentationError(
      "candidate_png_required",
      "A generation candidate must be supplied as PNG bytes.",
    );
  }
  let decoded;
  try {
    decoded = decodeRgbaPng(candidatePng);
  } catch (error) {
    throw new HumanoidSkinRepresentationError(
      "candidate_png_invalid",
      `Generation candidate PNG is invalid: ${error instanceof Error ? error.message : "unknown decoding error"}`,
    );
  }
  if (decoded.width !== layout.width || decoded.height !== layout.height) {
    throw new HumanoidSkinRepresentationError(
      "candidate_dimensions_invalid",
      `Generation candidate must be exactly ${layout.width}x${layout.height} pixels for ${layout.representationId}.`,
    );
  }
  return decoded.pixels;
}

function isTransparencyKey(pixels, offset) {
  return pixels[offset] >= 250 && pixels[offset + 1] <= 5 && pixels[offset + 2] >= 250;
}

function median(values) {
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)];
}

function reduceBlock(pixels, canvasWidth, x, y, size) {
  const channels = [[], [], [], []];
  let keyPixels = 0;
  let total = 0;
  for (let row = y; row < y + size; row += 1) {
    for (let column = x; column < x + size; column += 1) {
      const offset = (row * canvasWidth + column) * 4;
      total += 1;
      if (isTransparencyKey(pixels, offset)) {
        keyPixels += 1;
        continue;
      }
      for (let channel = 0; channel < 4; channel += 1) {
        channels[channel].push(pixels[offset + channel]);
      }
    }
  }
  if (keyPixels * 2 >= total || channels[0].length === 0) {
    return { rgba: [0, 0, 0, 0], usedTransparencyKey: true };
  }
  return {
    rgba: channels.map(median),
    usedTransparencyKey: false,
  };
}

function normalizeDirectAtlas(profileId, candidatePng) {
  const profile = getHumanoidSkinProfile(profileId);
  const layout = directAtlasLayout(profileId);
  const source = decodeCandidate(candidatePng, layout);
  const pixels = Buffer.alloc(profile.width * profile.height * 4);
  let transparencyKeyBlocks = 0;
  for (let y = 0; y < profile.height; y += 1) {
    for (let x = 0; x < profile.width; x += 1) {
      const reduced = reduceBlock(
        source,
        layout.width,
        x * layout.blockSize,
        y * layout.blockSize,
        layout.blockSize,
      );
      pixels.set(reduced.rgba, (y * profile.width + x) * 4);
      if (reduced.usedTransparencyKey) transparencyKeyBlocks += 1;
    }
  }
  return { pixels, layout, transparencyKeyBlocks };
}

function markerMatches(source, canvasWidth, marker) {
  for (let y = marker.y; y < marker.y + marker.height; y += 1) {
    for (let x = marker.x; x < marker.x + marker.width; x += 1) {
      const offset = (y * canvasWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        if (source[offset + channel] !== marker.rgba[channel]) return false;
      }
    }
  }
  return true;
}

function normalizeSurfaceSheet(profileId, candidatePng) {
  const profile = getHumanoidSkinProfile(profileId);
  const layout = surfaceSheetLayout(profileId);
  const source = decodeCandidate(candidatePng, layout);
  for (const panel of layout.panels) {
    if (!markerMatches(source, layout.width, panel.marker)) {
      throw new HumanoidSkinRepresentationError(
        "surface_sheet_structure_changed",
        `Surface-sheet marker for '${panel.id}' was changed or removed.`,
      );
    }
  }
  const pixels = Buffer.alloc(profile.width * profile.height * 4);
  let transparencyKeyBlocks = 0;
  for (const panel of layout.panels) {
    for (let y = 0; y < panel.atlas.height; y += 1) {
      for (let x = 0; x < panel.atlas.width; x += 1) {
        const reduced = reduceBlock(
          source,
          layout.width,
          panel.sheet.x + x * layout.blockSize,
          panel.sheet.y + y * layout.blockSize,
          layout.blockSize,
        );
        const targetOffset = ((panel.atlas.y + y) * profile.width + panel.atlas.x + x) * 4;
        pixels.set(reduced.rgba, targetOffset);
        if (reduced.usedTransparencyKey) transparencyKeyBlocks += 1;
      }
    }
  }
  return { pixels, layout, transparencyKeyBlocks };
}

function validateMask(mask, expectedLength, name) {
  if (!(mask instanceof Uint8Array) || mask.length !== expectedLength) {
    throw new HumanoidSkinRepresentationError(
      "revision_mask_invalid",
      `${name} must contain exactly ${expectedLength} binary texel values.`,
    );
  }
  if (mask.some((value) => value !== 0 && value !== 1)) {
    throw new HumanoidSkinRepresentationError(
      "revision_mask_invalid",
      `${name} may contain only 0 and 1 values.`,
    );
  }
}

function pixelDiffers(left, right, pixel) {
  const offset = pixel * 4;
  return left[offset] !== right[offset]
    || left[offset + 1] !== right[offset + 1]
    || left[offset + 2] !== right[offset + 2]
    || left[offset + 3] !== right[offset + 3];
}

function applyRevisionMasks(pixels, baselineDocument, editableMask, protectedMask, immutableMask) {
  const pixelCount = baselineDocument.width * baselineDocument.height;
  validateMask(editableMask, pixelCount, "editableMask");
  if (protectedMask) validateMask(protectedMask, pixelCount, "protectedMask");
  if (immutableMask) validateMask(immutableMask, pixelCount, "immutableMask");
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (editableMask[pixel] && (protectedMask?.[pixel] || immutableMask?.[pixel])) {
      throw new HumanoidSkinRepresentationError(
        "revision_masks_overlap",
        "Editable texels may not overlap protected or immutable texels.",
      );
    }
  }

  let protectedChangedTexelsBeforeComposite = 0;
  let immutableChangedTexelsBeforeComposite = 0;
  let restoredTexels = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (protectedMask?.[pixel] && pixelDiffers(pixels, baselineDocument.pixels, pixel)) {
      protectedChangedTexelsBeforeComposite += 1;
    }
    if (immutableMask?.[pixel] && pixelDiffers(pixels, baselineDocument.pixels, pixel)) {
      immutableChangedTexelsBeforeComposite += 1;
    }
    if (!editableMask[pixel]) {
      if (pixelDiffers(pixels, baselineDocument.pixels, pixel)) restoredTexels += 1;
      const offset = pixel * 4;
      pixels.set(baselineDocument.pixels.subarray(offset, offset + 4), offset);
    }
  }
  return {
    revisionApplied: true,
    restoredTexels,
    protectedChangedTexelsBeforeComposite,
    immutableChangedTexelsBeforeComposite,
    protectedChangedTexelsAfterComposite: 0,
    immutableChangedTexelsAfterComposite: 0,
  };
}

function restoreInvalidRegions(profileId, pixels) {
  const mapped = createMappedPixelMask(profileId);
  let invalidRegionsRestored = 0;
  for (let pixel = 0; pixel < mapped.length; pixel += 1) {
    if (mapped[pixel]) continue;
    const offset = pixel * 4;
    if (pixels[offset] || pixels[offset + 1] || pixels[offset + 2] || pixels[offset + 3]) {
      invalidRegionsRestored += 1;
    }
    pixels.fill(0, offset, offset + 4);
  }
  return invalidRegionsRestored;
}

export function normalizeGenerationCandidate({
  representationId,
  profile,
  candidatePng,
  baselineDocument,
  editableMask,
  protectedMask,
  immutableMask,
}) {
  let normalized;
  if (representationId === "direct-atlas-v1") {
    normalized = normalizeDirectAtlas(profile, candidatePng);
  } else if (representationId === "surface-sheet-v1") {
    normalized = normalizeSurfaceSheet(profile, candidatePng);
  } else {
    throw new HumanoidSkinRepresentationError(
      "unsupported_representation",
      `Unsupported humanoid-skin generation representation '${representationId}'.`,
    );
  }

  const invalidRegionsRestoredBeforeRevision = restoreInvalidRegions(profile, normalized.pixels);
  let revision = {
    revisionApplied: false,
    restoredTexels: 0,
    protectedChangedTexelsBeforeComposite: 0,
    immutableChangedTexelsBeforeComposite: 0,
    protectedChangedTexelsAfterComposite: 0,
    immutableChangedTexelsAfterComposite: 0,
  };
  if (baselineDocument) {
    if (baselineDocument.profile !== profile) {
      throw new HumanoidSkinRepresentationError(
        "baseline_profile_mismatch",
        "The revision baseline profile must match the generation representation profile.",
      );
    }
    if (!editableMask) {
      throw new HumanoidSkinRepresentationError(
        "editable_mask_required",
        "A revision baseline requires an editable mask.",
      );
    }
    revision = applyRevisionMasks(
      normalized.pixels,
      baselineDocument,
      editableMask,
      protectedMask,
      immutableMask,
    );
  } else if (editableMask || protectedMask || immutableMask) {
    throw new HumanoidSkinRepresentationError(
      "baseline_required",
      "Revision masks require a baseline document.",
    );
  }
  const invalidRegionsRestoredAfterRevision = restoreInvalidRegions(profile, normalized.pixels);
  return {
    pixels: normalized.pixels,
    layout: normalized.layout,
    report: Object.freeze({
      representationId,
      profile,
      transparencyKeyBlocks: normalized.transparencyKeyBlocks,
      invalidRegionsRestored: invalidRegionsRestoredBeforeRevision + invalidRegionsRestoredAfterRevision,
      ...revision,
    }),
  };
}
