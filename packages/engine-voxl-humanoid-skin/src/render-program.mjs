import {
  createMappedPixelMask,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
} from "./profiles.mjs";
import renderProgramJsonSchema from "../schemas/render-program.schema.json" with { type: "json" };

export const HUMANOID_SKIN_RENDER_PROGRAM_KIND = "voxl.humanoid-skin.render-program/v1";
export const HUMANOID_SKIN_RENDER_PROGRAM_LIMITS = Object.freeze({
  maxProgramBytes: 1_000_000,
  maxOperations: 512,
  maxTexelsPerPaintOperation: 16_384,
  maxTexelWrites: 65_536,
  maxPatternColors: 16,
  maxGridPaletteColors: 1_024,
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

export const HUMANOID_SKIN_RENDER_PROGRAM_SCHEMA = deepFreeze(structuredClone(renderProgramJsonSchema));

const OPERATION_NAMES = Object.freeze([
  "paint-surface-grid",
  "paint-texels",
  "fill",
  "checker",
  "stripes",
  "copy-surface",
]);
const COPY_TRANSFORMS = new Set(["none", "mirror-x", "mirror-y", "rotate-180"]);
const STRIPE_DIRECTIONS = new Set(["horizontal", "vertical"]);

export class HumanoidSkinRenderProgramError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = "HumanoidSkinRenderProgramError";
    this.code = code;
    this.issues = issues;
  }
}

function issue(code, message, path) {
  return { code, message, severity: "error", ...(path ? { path } : {}) };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function checkKeys(value, allowed, path, issues) {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(issue("unknown_field", `Unknown field '${key}'.`, `${path}.${key}`));
    }
  }
}

function validateRgba(value, path, issues) {
  if (!Array.isArray(value)
    || value.length !== 4
    || value.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    issues.push(issue("invalid_rgba", "RGBA must contain exactly four byte integers.", path));
    return false;
  }
  return true;
}

function validateSurface(value, profileId, path, issues) {
  if (!isRecord(value)) {
    issues.push(issue("surface_required", "A surface selector object is required.", path));
    return null;
  }
  checkKeys(value, new Set(["part", "layer", "face"]), path, issues);
  try {
    return getHumanoidSkinRegion(profileId, value.part, value.layer, value.face);
  } catch {
    issues.push(issue(
      "unknown_surface",
      "Surface must identify a part, layer, and face exposed by the selected profile.",
      path,
    ));
    return null;
  }
}

function validateRect(value, region, path, issues) {
  if (value === undefined) {
    return region ? { x: 0, y: 0, width: region.width, height: region.height } : null;
  }
  if (!isRecord(value)) {
    issues.push(issue("invalid_rect", "Rectangle must be an object.", path));
    return null;
  }
  checkKeys(value, new Set(["x", "y", "width", "height"]), path, issues);
  const { x, y, width, height } = value;
  if ([x, y, width, height].some((item) => !Number.isInteger(item))
    || x < 0 || y < 0 || width <= 0 || height <= 0
    || (region && (x + width > region.width || y + height > region.height))) {
    issues.push(issue("rect_out_of_bounds", "Rectangle must be a positive integer area inside its surface.", path));
    return null;
  }
  return { x, y, width, height };
}

function validateColors(value, path, issues) {
  if (!Array.isArray(value)
    || value.length < 2
    || value.length > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxPatternColors) {
    issues.push(issue(
      "invalid_pattern_colors",
      `Pattern colors must contain 2-${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxPatternColors} RGBA values.`,
      path,
    ));
    return false;
  }
  return value.every((color, index) => validateRgba(color, `${path}[${index}]`, issues));
}

function validateOperation(operation, index, profileId, issues) {
  const path = `operations[${index}]`;
  if (!isRecord(operation)) {
    issues.push(issue("operation_required", "Each operation must be an object.", path));
    return 0;
  }
  if (!OPERATION_NAMES.includes(operation.op)) {
    issues.push(issue("unsupported_operation", `Operation must be one of: ${OPERATION_NAMES.join(", ")}.`, `${path}.op`));
    return 0;
  }

  if (operation.op === "copy-surface") {
    checkKeys(operation, new Set(["op", "from", "to", "transform"]), path, issues);
    const from = validateSurface(operation.from, profileId, `${path}.from`, issues);
    const to = validateSurface(operation.to, profileId, `${path}.to`, issues);
    if (from && to && (from.width !== to.width || from.height !== to.height)) {
      issues.push(issue("copy_dimension_mismatch", "Copy source and destination surfaces must have equal dimensions.", path));
    }
    if (operation.transform !== undefined && !COPY_TRANSFORMS.has(operation.transform)) {
      issues.push(issue("unsupported_transform", "Copy transform is not supported.", `${path}.transform`));
    }
    return to ? to.width * to.height : 0;
  }

  const common = new Set(["op", "surface"]);
  if (operation.op !== "paint-texels" && operation.op !== "paint-surface-grid") common.add("rect");
  const region = validateSurface(operation.surface, profileId, `${path}.surface`, issues);

  if (operation.op === "paint-surface-grid") {
    common.add("palette");
    common.add("rows");
    checkKeys(operation, common, path, issues);
    if (!Array.isArray(operation.palette)
      || operation.palette.length < 1
      || operation.palette.length > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxGridPaletteColors) {
      issues.push(issue(
        "invalid_grid_palette",
        `Grid palette must contain 1-${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxGridPaletteColors} RGBA values.`,
        `${path}.palette`,
      ));
    } else {
      operation.palette.forEach((color, colorIndex) => {
        validateRgba(color, `${path}.palette[${colorIndex}]`, issues);
      });
    }
    if (!Array.isArray(operation.rows)
      || (region && operation.rows.length !== region.height)) {
      issues.push(issue(
        "grid_dimensions_invalid",
        "Grid rows must exactly match the selected surface height.",
        `${path}.rows`,
      ));
      return region ? region.width * region.height : 0;
    }
    operation.rows.forEach((row, rowIndex) => {
      const rowPath = `${path}.rows[${rowIndex}]`;
      if (!Array.isArray(row) || (region && row.length !== region.width)) {
        issues.push(issue(
          "grid_dimensions_invalid",
          "Every grid row must exactly match the selected surface width.",
          rowPath,
        ));
        return;
      }
      row.forEach((paletteIndex, columnIndex) => {
        if (!Number.isInteger(paletteIndex)
          || paletteIndex < 0
          || !Array.isArray(operation.palette)
          || paletteIndex >= operation.palette.length) {
          issues.push(issue(
            "grid_palette_index_invalid",
            "Grid values must be integer indexes into the operation palette.",
            `${rowPath}[${columnIndex}]`,
          ));
        }
      });
    });
    return region ? region.width * region.height : 0;
  }

  if (operation.op === "fill") {
    common.add("rgba");
    checkKeys(operation, common, path, issues);
    validateRgba(operation.rgba, `${path}.rgba`, issues);
    const rect = validateRect(operation.rect, region, `${path}.rect`, issues);
    return rect ? rect.width * rect.height : 0;
  }

  if (operation.op === "paint-texels") {
    common.add("texels");
    checkKeys(operation, common, path, issues);
    if (!Array.isArray(operation.texels)
      || operation.texels.length < 1
      || operation.texels.length > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxTexelsPerPaintOperation) {
      issues.push(issue(
        "invalid_texel_list",
        `paint-texels requires 1-${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxTexelsPerPaintOperation} texels.`,
        `${path}.texels`,
      ));
      return 0;
    }
    operation.texels.forEach((texel, texelIndex) => {
      const texelPath = `${path}.texels[${texelIndex}]`;
      if (!isRecord(texel)) {
        issues.push(issue("invalid_texel", "Texel must be an object.", texelPath));
        return;
      }
      checkKeys(texel, new Set(["x", "y", "rgba"]), texelPath, issues);
      if (!Number.isInteger(texel.x) || !Number.isInteger(texel.y)
        || texel.x < 0 || texel.y < 0
        || (region && (texel.x >= region.width || texel.y >= region.height))) {
        issues.push(issue("texel_out_of_bounds", "Texel coordinates must be integers inside their surface.", texelPath));
      }
      validateRgba(texel.rgba, `${texelPath}.rgba`, issues);
    });
    return operation.texels.length;
  }

  common.add("colors");
  validateColors(operation.colors, `${path}.colors`, issues);
  const rect = validateRect(operation.rect, region, `${path}.rect`, issues);
  if (operation.op === "checker") {
    common.add("cellWidth");
    common.add("cellHeight");
    if (!Number.isInteger(operation.cellWidth) || operation.cellWidth < 1
      || !Number.isInteger(operation.cellHeight) || operation.cellHeight < 1) {
      issues.push(issue("invalid_cell_size", "Checker cell dimensions must be positive integers.", path));
    }
  } else {
    common.add("stripeWidth");
    common.add("direction");
    if (!Number.isInteger(operation.stripeWidth) || operation.stripeWidth < 1) {
      issues.push(issue("invalid_stripe_width", "Stripe width must be a positive integer.", `${path}.stripeWidth`));
    }
    if (!STRIPE_DIRECTIONS.has(operation.direction)) {
      issues.push(issue("invalid_stripe_direction", "Stripe direction must be horizontal or vertical.", `${path}.direction`));
    }
  }
  checkKeys(operation, common, path, issues);
  return rect ? rect.width * rect.height : 0;
}

export function validateHumanoidSkinRenderProgram(program) {
  const issues = [];
  if (!isRecord(program)) {
    return { ok: false, issues: [issue("program_required", "A render-program object is required.")] };
  }
  checkKeys(program, new Set(["kind", "formatVersion", "profile", "operations"]), "program", issues);
  if (program.kind !== HUMANOID_SKIN_RENDER_PROGRAM_KIND) {
    issues.push(issue("invalid_program_kind", `Program kind must be '${HUMANOID_SKIN_RENDER_PROGRAM_KIND}'.`, "kind"));
  }
  if (program.formatVersion !== 1) {
    issues.push(issue("unsupported_program_version", "Program formatVersion must be 1.", "formatVersion"));
  }

  let profileValid = true;
  try {
    getHumanoidSkinProfile(program.profile);
  } catch {
    profileValid = false;
    issues.push(issue("unsupported_profile", "Program profile is not supported.", "profile"));
  }

  if (!Array.isArray(program.operations)) {
    issues.push(issue("operations_required", "Program operations must be an array.", "operations"));
  } else if (program.operations.length > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxOperations) {
    issues.push(issue(
      "operation_limit_exceeded",
      `Program may contain at most ${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxOperations} operations.`,
      "operations",
    ));
  } else if (profileValid) {
    const writes = program.operations.reduce(
      (total, operation, index) => total + validateOperation(operation, index, program.profile, issues),
      0,
    );
    if (writes > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxTexelWrites) {
      issues.push(issue(
        "texel_write_limit_exceeded",
        `Program would write ${writes} texels; limit is ${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxTexelWrites}.`,
        "operations",
      ));
    }
  }

  try {
    const bytes = Buffer.byteLength(JSON.stringify(program), "utf8");
    if (bytes > HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxProgramBytes) {
      issues.push(issue(
        "program_size_limit_exceeded",
        `Serialized program is ${bytes} bytes; limit is ${HUMANOID_SKIN_RENDER_PROGRAM_LIMITS.maxProgramBytes}.`,
      ));
    }
  } catch {
    issues.push(issue("program_not_serializable", "Program must be JSON serializable."));
  }
  return { ok: issues.length === 0, issues };
}

export function assertValidHumanoidSkinRenderProgram(program) {
  const validation = validateHumanoidSkinRenderProgram(program);
  if (!validation.ok) {
    throw new HumanoidSkinRenderProgramError(
      "render_program_invalid",
      "Humanoid-skin render program is invalid.",
      validation.issues,
    );
  }
  return validation;
}

function surfaceId(surface) {
  return `${surface.part}.${surface.layer}.${surface.face}`;
}

export function describeHumanoidSkinRenderProgram(profileId) {
  const profile = getHumanoidSkinProfile(profileId);
  const jsonSchema = structuredClone(HUMANOID_SKIN_RENDER_PROGRAM_SCHEMA);
  jsonSchema.properties.profile = { const: profileId };
  return Object.freeze({
    kind: HUMANOID_SKIN_RENDER_PROGRAM_KIND,
    formatVersion: 1,
    profile: profileId,
    semantics: Object.freeze({
      coordinates: "Surface-local integer texels with origin at the surface's top-left.",
      ordering: "Operations execute in array order; later writes replace earlier RGBA values.",
      sourceOfTruth: "The validated output pixels are authoritative; the program is reproducible provenance.",
      generationIntent: "Use paint-surface-grid for dense visual authorship, paint-texels for sparse corrections, and compression helpers only when useful.",
    }),
    limits: HUMANOID_SKIN_RENDER_PROGRAM_LIMITS,
    jsonSchema: deepFreeze(jsonSchema),
    operations: Object.freeze([
      Object.freeze({ op: "paint-surface-grid", role: "primary", purpose: "Author every texel of one surface as palette-indexed pixel rows." }),
      Object.freeze({ op: "paint-texels", role: "sparse-revision", purpose: "Replace arbitrary individual texels without resending an unchanged surface." }),
      Object.freeze({ op: "fill", role: "optional-compression", purpose: "Compress a uniform surface or rectangle; never required for generation." }),
      Object.freeze({ op: "checker", role: "optional-compression", purpose: "Compress a small repeated checker motif; never required for generation." }),
      Object.freeze({ op: "stripes", role: "optional-compression", purpose: "Compress a small repeated stripe motif; never required for generation." }),
      Object.freeze({ op: "copy-surface", role: "optional-compression", purpose: "Reuse an intentionally identical surface; never required for generation." }),
    ]),
    surfaces: Object.freeze(profile.regions.map((region) => Object.freeze({
      id: surfaceId(region),
      part: region.part,
      layer: region.layer,
      face: region.face,
      width: region.width,
      height: region.height,
    }))),
  });
}

function setPixel(pixels, profileWidth, region, x, y, rgba) {
  const offset = ((region.y + y) * profileWidth + region.x + x) * 4;
  pixels.set(rgba, offset);
}

function executeAreaOperation(pixels, profile, region, operation) {
  const rect = operation.rect ?? { x: 0, y: 0, width: region.width, height: region.height };
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      let rgba = operation.rgba;
      if (operation.op === "checker") {
        const cellX = Math.floor(x / operation.cellWidth);
        const cellY = Math.floor(y / operation.cellHeight);
        rgba = operation.colors[(cellX + cellY) % operation.colors.length];
      } else if (operation.op === "stripes") {
        const axis = operation.direction === "horizontal" ? y : x;
        rgba = operation.colors[Math.floor(axis / operation.stripeWidth) % operation.colors.length];
      }
      setPixel(pixels, profile.width, region, rect.x + x, rect.y + y, rgba);
    }
  }
  return rect.width * rect.height;
}

function executeCopy(pixels, profile, operation) {
  const from = getHumanoidSkinRegion(profile.id, operation.from.part, operation.from.layer, operation.from.face);
  const to = getHumanoidSkinRegion(profile.id, operation.to.part, operation.to.layer, operation.to.face);
  const snapshot = Buffer.alloc(from.width * from.height * 4);
  for (let y = 0; y < from.height; y += 1) {
    const sourceOffset = ((from.y + y) * profile.width + from.x) * 4;
    pixels.copy(snapshot, y * from.width * 4, sourceOffset, sourceOffset + from.width * 4);
  }
  const transform = operation.transform ?? "none";
  for (let y = 0; y < to.height; y += 1) {
    for (let x = 0; x < to.width; x += 1) {
      const sourceX = transform === "mirror-x" || transform === "rotate-180" ? from.width - 1 - x : x;
      const sourceY = transform === "mirror-y" || transform === "rotate-180" ? from.height - 1 - y : y;
      const sourceOffset = (sourceY * from.width + sourceX) * 4;
      setPixel(pixels, profile.width, to, x, y, snapshot.subarray(sourceOffset, sourceOffset + 4));
    }
  }
  return to.width * to.height;
}

function validateMask(mask, pixelCount, name) {
  if (!(mask instanceof Uint8Array) || mask.length !== pixelCount) {
    throw new HumanoidSkinRenderProgramError("revision_mask_invalid", `${name} must contain one byte per profile texel.`);
  }
  if (mask.some((value) => value !== 0 && value !== 1)) {
    throw new HumanoidSkinRenderProgramError("revision_mask_invalid", `${name} values must be binary.`);
  }
}

function applyRevisionMasks(candidate, baseline, editableMask, protectedMask, immutableMask) {
  const pixelCount = baseline.length / 4;
  validateMask(editableMask, pixelCount, "editableMask");
  if (protectedMask) validateMask(protectedMask, pixelCount, "protectedMask");
  if (immutableMask) validateMask(immutableMask, pixelCount, "immutableMask");
  let restoredTexels = 0;
  let protectedChangedTexelsBeforeComposite = 0;
  let immutableChangedTexelsBeforeComposite = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (editableMask[pixel] && (protectedMask?.[pixel] || immutableMask?.[pixel])) {
      throw new HumanoidSkinRenderProgramError(
        "revision_masks_overlap",
        "Editable texels may not overlap protected or immutable texels.",
      );
    }
    const offset = pixel * 4;
    const changed = candidate[offset] !== baseline[offset]
      || candidate[offset + 1] !== baseline[offset + 1]
      || candidate[offset + 2] !== baseline[offset + 2]
      || candidate[offset + 3] !== baseline[offset + 3];
    if (changed && protectedMask?.[pixel]) protectedChangedTexelsBeforeComposite += 1;
    if (changed && immutableMask?.[pixel]) immutableChangedTexelsBeforeComposite += 1;
    if (!editableMask[pixel] && changed) restoredTexels += 1;
    if (!editableMask[pixel]) candidate.set(baseline.subarray(offset, offset + 4), offset);
  }
  return {
    restoredTexels,
    protectedChangedTexelsBeforeComposite,
    immutableChangedTexelsBeforeComposite,
  };
}

export function executeHumanoidSkinRenderProgramPixels({
  program,
  initialPixels,
  editableMask,
  protectedMask,
  immutableMask,
}) {
  assertValidHumanoidSkinRenderProgram(program);
  const profile = getHumanoidSkinProfile(program.profile);
  const expectedBytes = profile.width * profile.height * 4;
  if (!(initialPixels instanceof Uint8Array) || initialPixels.length !== expectedBytes) {
    throw new HumanoidSkinRenderProgramError(
      "initial_pixels_invalid",
      `Initial pixels must contain ${expectedBytes} RGBA bytes for ${program.profile}.`,
    );
  }
  const baseline = Buffer.from(initialPixels);
  const pixels = Buffer.from(initialPixels);
  let texelWrites = 0;
  for (const operation of program.operations) {
    if (operation.op === "copy-surface") {
      texelWrites += executeCopy(pixels, profile, operation);
      continue;
    }
    const region = getHumanoidSkinRegion(
      profile.id,
      operation.surface.part,
      operation.surface.layer,
      operation.surface.face,
    );
    if (operation.op === "paint-texels") {
      for (const texel of operation.texels) {
        setPixel(pixels, profile.width, region, texel.x, texel.y, texel.rgba);
      }
      texelWrites += operation.texels.length;
    } else if (operation.op === "paint-surface-grid") {
      for (let y = 0; y < region.height; y += 1) {
        for (let x = 0; x < region.width; x += 1) {
          setPixel(pixels, profile.width, region, x, y, operation.palette[operation.rows[y][x]]);
        }
      }
      texelWrites += region.width * region.height;
    } else {
      texelWrites += executeAreaOperation(pixels, profile, region, operation);
    }
  }

  let revision = {
    restoredTexels: 0,
    protectedChangedTexelsBeforeComposite: 0,
    immutableChangedTexelsBeforeComposite: 0,
  };
  const hasRevisionOption = editableMask || protectedMask || immutableMask;
  if (hasRevisionOption) {
    if (!editableMask) {
      throw new HumanoidSkinRenderProgramError("editable_mask_required", "Revision execution requires an editableMask.");
    }
    revision = applyRevisionMasks(pixels, baseline, editableMask, protectedMask, immutableMask);
  }

  const mapped = createMappedPixelMask(profile.id);
  for (let pixel = 0; pixel < mapped.length; pixel += 1) {
    if (!mapped[pixel]) pixels.fill(0, pixel * 4, pixel * 4 + 4);
  }
  return Object.freeze({
    pixels,
    report: Object.freeze({
      kind: HUMANOID_SKIN_RENDER_PROGRAM_KIND,
      profile: profile.id,
      operationsExecuted: program.operations.length,
      texelWrites,
      revisionApplied: Boolean(hasRevisionOption),
      ...revision,
      protectedChangedTexelsAfterComposite: 0,
      immutableChangedTexelsAfterComposite: 0,
    }),
  });
}
