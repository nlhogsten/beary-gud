import { createHash } from "node:crypto";
import {
  BASE_TEXTURE_HEIGHT,
  BASE_TEXTURE_WIDTH,
  HUMANOID_SKIN_PROFILE_IDS,
  HUMANOID_SKIN_PROFILES,
  HUMANOID_SKIN_TEXTURE_SIZES,
  createHumanoidSkinSelectionMask,
  createMappedPixelMask,
  createUnusedPixelMask,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
} from "./profiles.mjs";
import { decodeRgbaPng, encodeRgbaPng } from "./png.mjs";
import {
  HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
  HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS,
  HUMANOID_SKIN_TRANSPARENCY_KEY,
  HumanoidSkinRepresentationError,
  normalizeGenerationCandidate,
  renderGenerationRepresentation,
} from "./generation-representations.mjs";

export {
  BASE_TEXTURE_HEIGHT,
  BASE_TEXTURE_WIDTH,
  HUMANOID_SKIN_PROFILE_IDS,
  HUMANOID_SKIN_PROFILES,
  HUMANOID_SKIN_TEXTURE_SIZES,
  HUMANOID_SKIN_GENERATION_CANVAS_SIZE,
  HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS,
  HUMANOID_SKIN_TRANSPARENCY_KEY,
  HumanoidSkinRepresentationError,
  createHumanoidSkinSelectionMask,
  createMappedPixelMask,
  createUnusedPixelMask,
  decodeRgbaPng,
  encodeRgbaPng,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
};

export const HUMANOID_SKIN_DOCUMENT_KIND = "voxl.humanoid-skin/v1";
export const HUMANOID_SKIN_SIDECAR_KIND = "voxl.humanoid-skin.sidecar/v1";

export const humanoidSkinDescriptor = Object.freeze({
  id: "voxl-humanoid-skin",
  version: "1.2.0",
  title: "VOXL humanoid skin",
  documentTypes: [HUMANOID_SKIN_DOCUMENT_KIND],
  inputTypes: ["text/plain", "image/png", HUMANOID_SKIN_DOCUMENT_KIND],
  outputFormats: ["image/png"],
  capabilities: {
    create: false,
    revise: false,
    validate: true,
    render: true,
    export: true,
    edit2d: false,
    edit3d: false,
    animate: false,
  },
});

export class HumanoidSkinValidationError extends Error {
  constructor(message, issues) {
    super(message);
    this.name = "HumanoidSkinValidationError";
    this.issues = issues;
  }
}

function issue(code, message, severity = "error", path) {
  return { code, message, severity, ...(path ? { path } : {}) };
}

export function createHumanoidSkinSidecar(profile, values = {}) {
  getHumanoidSkinProfile(profile);
  return {
    kind: HUMANOID_SKIN_SIDECAR_KIND,
    formatVersion: 1,
    profile,
    semanticRegions: values.semanticRegions ?? {},
    references: values.references ?? [],
    operations: values.operations ?? [],
    versions: values.versions ?? [],
  };
}

export function createHumanoidSkinDocument({ profile, pixels, sidecar }) {
  const selectedProfile = getHumanoidSkinProfile(profile);
  if (!(pixels instanceof Uint8Array)) throw new Error("Humanoid-skin pixels must be RGBA bytes.");
  return {
    kind: HUMANOID_SKIN_DOCUMENT_KIND,
    formatVersion: 1,
    profile,
    width: selectedProfile.width,
    height: selectedProfile.height,
    pixels: Buffer.from(pixels),
    sidecar: sidecar ?? createHumanoidSkinSidecar(profile),
  };
}

export function createBlankHumanoidSkinDocument(
  profile,
  { baseColor = [127, 127, 127, 255], sidecar } = {},
) {
  getHumanoidSkinProfile(profile);
  if (!Array.isArray(baseColor) || baseColor.length !== 4 || baseColor.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error("baseColor must contain four RGBA byte values.");
  }
  const selectedProfile = getHumanoidSkinProfile(profile);
  const pixels = Buffer.alloc(selectedProfile.width * selectedProfile.height * 4);
  const baseMask = createMappedPixelMask(profile, "base");
  for (let pixel = 0; pixel < baseMask.length; pixel += 1) {
    if (!baseMask[pixel]) continue;
    const offset = pixel * 4;
    pixels[offset] = baseColor[0];
    pixels[offset + 1] = baseColor[1];
    pixels[offset + 2] = baseColor[2];
    pixels[offset + 3] = baseColor[3];
  }
  return createHumanoidSkinDocument({ profile, pixels, sidecar });
}

function validateSidecar(sidecar, profile, issues) {
  if (!sidecar || typeof sidecar !== "object" || Array.isArray(sidecar)) {
    issues.push(issue("sidecar_required", "A humanoid-skin sidecar object is required.", "error", "sidecar"));
    return;
  }
  if (sidecar.kind !== HUMANOID_SKIN_SIDECAR_KIND) {
    issues.push(issue("invalid_sidecar_kind", `Sidecar kind must be '${HUMANOID_SKIN_SIDECAR_KIND}'.`, "error", "sidecar.kind"));
  }
  if (sidecar.formatVersion !== 1) {
    issues.push(issue("unsupported_sidecar_version", "Sidecar formatVersion must be 1.", "error", "sidecar.formatVersion"));
  }
  if (sidecar.profile !== profile) {
    issues.push(issue("sidecar_profile_mismatch", "Sidecar profile must match the document profile.", "error", "sidecar.profile"));
  }
  for (const field of ["references", "operations", "versions"]) {
    if (!Array.isArray(sidecar[field])) {
      issues.push(issue("invalid_sidecar_field", `sidecar.${field} must be an array.`, "error", `sidecar.${field}`));
    }
  }
  if (!sidecar.semanticRegions || typeof sidecar.semanticRegions !== "object" || Array.isArray(sidecar.semanticRegions)) {
    issues.push(issue("invalid_sidecar_field", "sidecar.semanticRegions must be an object.", "error", "sidecar.semanticRegions"));
  }
}

export function validateHumanoidSkinDocument(document) {
  const issues = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { ok: false, issues: [issue("document_required", "A humanoid-skin document is required.")] };
  }
  if (document.kind !== HUMANOID_SKIN_DOCUMENT_KIND) {
    issues.push(issue("invalid_document_kind", `Document kind must be '${HUMANOID_SKIN_DOCUMENT_KIND}'.`, "error", "kind"));
  }
  if (document.formatVersion !== 1) {
    issues.push(issue("unsupported_document_version", "Document formatVersion must be 1.", "error", "formatVersion"));
  }

  let profile;
  try {
    profile = getHumanoidSkinProfile(document.profile);
  } catch {
    issues.push(issue("unsupported_profile", "Document profile is not supported.", "error", "profile"));
  }
  if (profile && (document.width !== profile.width || document.height !== profile.height)) {
    issues.push(issue("invalid_dimensions", `Texture dimensions must be ${profile.width}x${profile.height} for ${profile.id}.`, "error", "pixels"));
  }
  const pixelsValid = document.pixels instanceof Uint8Array
    && profile
    && document.pixels.length === profile.width * profile.height * 4;
  if (!pixelsValid) {
    const dimensions = profile ? `${profile.width}x${profile.height}` : "a supported profile's";
    issues.push(issue("invalid_rgba_length", `Texture must contain exactly ${dimensions} RGBA bytes.`, "error", "pixels"));
  }
  validateSidecar(document.sidecar, document.profile, issues);

  if (profile && pixelsValid) {
    const mapped = createMappedPixelMask(profile.id);
    const base = createMappedPixelMask(profile.id, "base");
    let unusedVisible = 0;
    let transparentBase = 0;
    let firstUnused;
    for (let pixel = 0; pixel < mapped.length; pixel += 1) {
      const alpha = document.pixels[pixel * 4 + 3];
      if (!mapped[pixel] && alpha !== 0) {
        unusedVisible += 1;
        if (!firstUnused) firstUnused = { x: pixel % profile.width, y: Math.floor(pixel / profile.width) };
      }
      if (base[pixel] && alpha !== 255) transparentBase += 1;
    }
    if (unusedVisible > 0) {
      issues.push(issue(
        "visible_unused_pixels",
        `${unusedVisible} pixel(s) outside the ${profile.id} UV map are visible; first at ${firstUnused.x},${firstUnused.y}.`,
        "error",
        "pixels",
      ));
    }
    if (transparentBase > 0) {
      issues.push(issue(
        "transparent_base_pixels",
        `${transparentBase} base-layer pixel(s) are not fully opaque.`,
        "warning",
        "pixels",
      ));
    }
  }

  return { ok: !issues.some(({ severity }) => severity === "error"), issues };
}

export function assertValidHumanoidSkinDocument(document) {
  const validation = validateHumanoidSkinDocument(document);
  if (!validation.ok) throw new HumanoidSkinValidationError("Humanoid-skin document is invalid.", validation.issues);
  return validation;
}

export function detectHumanoidSkinProfile(pixels) {
  const textureSize = pixels instanceof Uint8Array ? Math.sqrt(pixels.length / 4) : 0;
  if (!Number.isInteger(textureSize) || !HUMANOID_SKIN_TEXTURE_SIZES.includes(textureSize)) {
    throw new Error("Profile detection requires square RGBA bytes for a supported texture size.");
  }
  const wideId = `wide-arm-${textureSize}`;
  const slimId = `slim-arm-${textureSize}`;
  const wide = createMappedPixelMask(wideId);
  const slim = createMappedPixelMask(slimId);
  for (let pixel = 0; pixel < wide.length; pixel += 1) {
    if (wide[pixel] && !slim[pixel] && pixels[pixel * 4 + 3] !== 0) return wideId;
  }
  return slimId;
}

export function importHumanoidSkinPng(input, { profile = "auto", sidecar } = {}) {
  const decoded = decodeRgbaPng(input);
  if (decoded.width !== decoded.height || !HUMANOID_SKIN_TEXTURE_SIZES.includes(decoded.width)) {
    throw new HumanoidSkinValidationError("Humanoid-skin PNG dimensions are invalid.", [
      issue("invalid_dimensions", `Texture dimensions must be one of ${HUMANOID_SKIN_TEXTURE_SIZES.map((size) => `${size}x${size}`).join(" or ")}.`, "error", "pixels"),
    ]);
  }
  const selectedProfile = profile === "auto" ? detectHumanoidSkinProfile(decoded.pixels) : profile;
  const expectedProfile = getHumanoidSkinProfile(selectedProfile);
  if (decoded.width !== expectedProfile.width || decoded.height !== expectedProfile.height) {
    throw new HumanoidSkinValidationError("Humanoid-skin PNG dimensions do not match the selected profile.", [
      issue("profile_dimension_mismatch", `Profile ${selectedProfile} requires ${expectedProfile.width}x${expectedProfile.height} pixels.`, "error", "profile"),
    ]);
  }
  const document = createHumanoidSkinDocument({
    profile: selectedProfile,
    pixels: decoded.pixels,
    sidecar: sidecar ?? createHumanoidSkinSidecar(selectedProfile),
  });
  assertValidHumanoidSkinDocument(document);
  return document;
}

export function exportHumanoidSkinPng(document) {
  assertValidHumanoidSkinDocument(document);
  return encodeRgbaPng(document.width, document.height, document.pixels);
}

export function serializeHumanoidSkinSidecar(document) {
  assertValidHumanoidSkinDocument(document);
  return `${JSON.stringify(document.sidecar, null, 2)}\n`;
}

export function renderHumanoidSkinGenerationRepresentation(document, representationId) {
  assertValidHumanoidSkinDocument(document);
  return renderGenerationRepresentation(document, representationId);
}

export function normalizeHumanoidSkinGenerationCandidate({
  representationId,
  profile,
  candidatePng,
  baselineDocument,
  editableMask,
  protectedMask,
  immutableMask,
}) {
  getHumanoidSkinProfile(profile);
  if (baselineDocument) assertValidHumanoidSkinDocument(baselineDocument);
  const normalized = normalizeGenerationCandidate({
    representationId,
    profile,
    candidatePng,
    baselineDocument,
    editableMask,
    protectedMask,
    immutableMask,
  });
  const document = createHumanoidSkinDocument({
    profile,
    pixels: normalized.pixels,
    sidecar: baselineDocument
      ? structuredClone(baselineDocument.sidecar)
      : createHumanoidSkinSidecar(profile),
  });
  assertValidHumanoidSkinDocument(document);
  return Object.freeze({ document, layout: normalized.layout, report: normalized.report });
}

function blendPixel(target, targetOffset, source, sourceOffset) {
  const sourceAlpha = source[sourceOffset + 3] / 255;
  if (sourceAlpha === 0) return;
  const targetAlpha = target[targetOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
  for (let channel = 0; channel < 3; channel += 1) {
    const value = (
      source[sourceOffset + channel] * sourceAlpha
      + target[targetOffset + channel] * targetAlpha * (1 - sourceAlpha)
    ) / outputAlpha;
    target[targetOffset + channel] = Math.round(value);
  }
  target[targetOffset + 3] = Math.round(outputAlpha * 255);
}

function drawRegion(canvas, canvasWidth, sourceWidth, pixels, region, destinationX, destinationY) {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      const sourceOffset = ((region.y + y) * sourceWidth + region.x + x) * 4;
      const targetOffset = ((destinationY + y) * canvasWidth + destinationX + x) * 4;
      blendPixel(canvas, targetOffset, pixels, sourceOffset);
    }
  }
}

function drawPart(document, canvas, canvasWidth, part, view, x, y) {
  const base = getHumanoidSkinRegion(document.profile, part, "base", view);
  const outer = getHumanoidSkinRegion(document.profile, part, "outer", view);
  drawRegion(canvas, canvasWidth, document.width, document.pixels, base, x, y);
  drawRegion(canvas, canvasWidth, document.width, document.pixels, outer, x, y);
}

function scaleNearest(pixels, width, height, scale) {
  const output = Buffer.alloc(width * scale * height * scale * 4);
  const outputWidth = width * scale;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = (y * width + x) * 4;
      for (let offsetY = 0; offsetY < scale; offsetY += 1) {
        for (let offsetX = 0; offsetX < scale; offsetX += 1) {
          const targetOffset = ((y * scale + offsetY) * outputWidth + x * scale + offsetX) * 4;
          pixels.copy(output, targetOffset, sourceOffset, sourceOffset + 4);
        }
      }
    }
  }
  return output;
}

export function renderHumanoidSkinPreview(document, { view = "front", scale = 8 } = {}) {
  assertValidHumanoidSkinDocument(document);
  if (!new Set(["front", "back"]).has(view)) throw new Error("Preview view must be 'front' or 'back'.");
  if (!Number.isInteger(scale) || scale < 1 || scale > 32) throw new Error("Preview scale must be an integer from 1 to 32.");

  const profile = getHumanoidSkinProfile(document.profile);
  const width = profile.geometry.previewWidth * profile.texelScale;
  const height = profile.geometry.previewHeight * profile.texelScale;
  const canvas = Buffer.alloc(width * height * 4);
  const front = view === "front";
  const leftArm = front ? "right-arm" : "left-arm";
  const rightArm = front ? "left-arm" : "right-arm";
  const leftLeg = front ? "right-leg" : "left-leg";
  const rightLeg = front ? "left-leg" : "right-leg";
  const texelScale = profile.texelScale;
  drawPart(document, canvas, width, "head", view, 4 * texelScale, 0);
  drawPart(document, canvas, width, "torso", view, 4 * texelScale, 8 * texelScale);
  drawPart(document, canvas, width, leftArm, view, (4 - profile.armWidth) * texelScale, 8 * texelScale);
  drawPart(document, canvas, width, rightArm, view, 12 * texelScale, 8 * texelScale);
  drawPart(document, canvas, width, leftLeg, view, 4 * texelScale, 20 * texelScale);
  drawPart(document, canvas, width, rightLeg, view, 8 * texelScale, 20 * texelScale);
  const scaled = scaleNearest(canvas, width, height, scale);
  return {
    width: width * scale,
    height: height * scale,
    pixels: scaled,
    png: encodeRgbaPng(width * scale, height * scale, scaled),
  };
}

export function renderHumanoidSkinPreviews(document, options = {}) {
  return ["front", "back"].map((view) => {
    const preview = renderHumanoidSkinPreview(document, { ...options, view });
    return {
      filename: `${document.profile}-${view}.png`,
      mediaType: "image/png",
      profile: `${document.profile}-${view}-preview`,
      bytes: preview.png,
      width: preview.width,
      height: preview.height,
    };
  });
}

export function createHumanoidSkinEngine() {
  return {
    descriptor: humanoidSkinDescriptor,
    validate: validateHumanoidSkinDocument,
    render({ document, options }) {
      return renderHumanoidSkinPreviews(document, options);
    },
    export({ document, profile }) {
      if (profile !== document.profile) throw new Error("Export profile must match the document profile.");
      const bytes = exportHumanoidSkinPng(document);
      return {
        filename: `${profile}.png`,
        mediaType: "image/png",
        profile,
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    },
  };
}
