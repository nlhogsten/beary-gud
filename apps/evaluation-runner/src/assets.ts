import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  createMappedPixelMask,
  createUnusedPixelMask,
  decodeRgbaPng,
  encodeRgbaPng,
  exportHumanoidSkinPng,
  getHumanoidSkinProfile,
  getHumanoidSkinRegion,
  importHumanoidSkinPng,
  validateHumanoidSkinDocument,
  type HumanoidSkinDocument,
  type HumanoidSkinFace,
  type HumanoidSkinLayer,
  type HumanoidSkinPart,
  type HumanoidSkinProfileId,
  type HumanoidSkinRegionSelection,
} from "@voxl/engine-voxl-humanoid-skin";

const EVALUATION_ROOT = "evaluations/voxl-humanoid-skin/v1";
const CASE_SET_PATH = `${EVALUATION_ROOT}/cases.v1.json`;
const IMAGE_SIZE = 128;
const FACES: readonly HumanoidSkinFace[] = ["top", "bottom", "right", "front", "left", "back"];
const PARTS: readonly HumanoidSkinPart[] = ["head", "torso", "right-arm", "left-arm", "right-leg", "left-leg"];
const LAYERS: readonly HumanoidSkinLayer[] = ["base", "outer"];
type Rgba = readonly [number, number, number, number];
type JsonObject = Record<string, unknown>;

type Reference = {
  id: string;
  mediaKind: "synthetic-photo" | "synthetic-drawing" | "synthetic-palette" | "synthetic-atlas" | "synthetic-mask";
  provenance: { origin: string; rights: string; thirdPartyContent: boolean };
  materializedAsset: null | { path: string; sha256: string; mimeType: "image/png" };
};

type Revision = {
  baselineAsset: null | { path: string; sha256: string; mimeType: "image/png" };
  protectionMode: "all-mapped-except-editable";
  editableRegions: string[];
  protectedRegions: string[];
  immutableRegions: string[];
  materializedMasks: null | {
    editable: { path: string; sha256: string; mimeType: "image/png" };
    protected: { path: string; sha256: string; mimeType: "image/png" };
    immutable: { path: string; sha256: string; mimeType: "image/png" };
  };
};

type EvaluationCase = {
  id: string;
  profile: HumanoidSkinProfileId;
  references: Reference[];
  revision: Revision | null;
};

type CaseSet = JsonObject & { cases: EvaluationCase[] };

export type GeneratedEvaluationAsset = Readonly<{
  path: string;
  bytes: Uint8Array;
  sha256: string;
  kind: "reference" | "revision-baseline" | "editable-mask" | "protected-mask" | "immutable-mask";
  ownerId: string;
}>;

export type EvaluationAssetBundle = Readonly<{
  caseSet: CaseSet;
  caseSetText: string;
  assets: readonly GeneratedEvaluationAsset[];
  referenceCount: number;
  baselineCount: number;
  maskSetCount: number;
}>;

type Canvas = { width: number; height: number; pixels: Uint8Array };

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canvas(width = IMAGE_SIZE, height = IMAGE_SIZE, color: Rgba = [0, 0, 0, 0]): Canvas {
  const pixels = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    pixels.set(color, pixel * 4);
  }
  return { width, height, pixels };
}

function put(target: Canvas, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  target.pixels.set(color, (y * target.width + x) * 4);
}

function rect(target: Canvas, x: number, y: number, width: number, height: number, color: Rgba): void {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) put(target, column, row, color);
  }
}

function line(target: Canvas, x0: number, y0: number, x1: number, y1: number, color: Rgba, thickness = 1): void {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    rect(target, x0 - Math.floor(thickness / 2), y0 - Math.floor(thickness / 2), thickness, thickness, color);
    if (x0 === x1 && y0 === y1) break;
    const doubled = 2 * error;
    if (doubled >= dy) { error += dy; x0 += sx; }
    if (doubled <= dx) { error += dx; y0 += sy; }
  }
}

function diamond(target: Canvas, centerX: number, centerY: number, radius: number, color: Rgba): void {
  for (let y = -radius; y <= radius; y += 1) {
    const span = radius - Math.abs(y);
    rect(target, centerX - span, centerY + y, span * 2 + 1, 1, color);
  }
}

function png(target: Canvas): Uint8Array {
  return encodeRgbaPng(target.width, target.height, target.pixels);
}

type PhotoRecipe = Readonly<{
  backdrop: Rgba;
  garment: Rgba;
  lower: Rgba;
  accent: Rgba;
  feature: "coat" | "apron" | "hat" | "field" | "survey" | "messenger" | "front-coat" | "rear-coat" | "climber";
}>;

const PHOTO_RECIPES: Readonly<Record<string, PhotoRecipe>> = {
  "v1-007-portrait": { backdrop: [174, 180, 184, 255], garment: [22, 118, 126, 255], lower: [31, 48, 58, 255], accent: [205, 232, 221, 255], feature: "coat" },
  "v1-008-portrait": { backdrop: [192, 185, 169, 255], garment: [46, 91, 139, 255], lower: [61, 54, 48, 255], accent: [198, 139, 42, 255], feature: "apron" },
  "v1-011-hat": { backdrop: [201, 190, 166, 255], garment: [177, 143, 87, 255], lower: [106, 82, 58, 255], accent: [226, 201, 142, 255], feature: "hat" },
  "v1-013-portrait": { backdrop: [177, 180, 163, 255], garment: [84, 99, 54, 255], lower: [55, 62, 48, 255], accent: [167, 150, 96, 255], feature: "field" },
  "v1-014-suit": { backdrop: [166, 177, 180, 255], garment: [45, 78, 83, 255], lower: [38, 57, 66, 255], accent: [226, 111, 78, 255], feature: "survey" },
  "v1-016-messenger": { backdrop: [184, 174, 168, 255], garment: [118, 43, 56, 255], lower: [177, 143, 94, 255], accent: [222, 199, 158, 255], feature: "messenger" },
  "v1-017-front": { backdrop: [175, 184, 190, 255], garment: [24, 48, 79, 255], lower: [34, 47, 65, 255], accent: [222, 191, 104, 255], feature: "front-coat" },
  "v1-017-rear": { backdrop: [175, 184, 190, 255], garment: [24, 48, 79, 255], lower: [34, 47, 65, 255], accent: [49, 154, 159, 255], feature: "rear-coat" },
  "v1-018-climber": { backdrop: [180, 176, 166, 255], garment: [89, 99, 83, 255], lower: [62, 61, 57, 255], accent: [179, 137, 78, 255], feature: "climber" },
};

function photoReference(recipe: PhotoRecipe): Uint8Array {
  const target = canvas(IMAGE_SIZE, IMAGE_SIZE, recipe.backdrop);
  for (let y = 0; y < IMAGE_SIZE; y += 1) {
    const shade = Math.floor(y / 12);
    rect(target, 0, y, IMAGE_SIZE, 1, [
      Math.max(0, recipe.backdrop[0] - shade),
      Math.max(0, recipe.backdrop[1] - shade),
      Math.max(0, recipe.backdrop[2] - shade),
      255,
    ]);
  }
  const skin: Rgba = [183, 139, 105, 255];
  rect(target, 50, 17, 28, 26, skin);
  rect(target, 43, 43, 42, 49, recipe.garment);
  rect(target, 31, 47, 12, 43, recipe.garment);
  rect(target, 85, 47, 12, 43, recipe.garment);
  rect(target, 45, 92, 17, 31, recipe.lower);
  rect(target, 66, 92, 17, 31, recipe.lower);
  rect(target, 48, 23, 7, 5, [52, 43, 39, 255]);
  rect(target, 69, 23, 7, 5, [52, 43, 39, 255]);
  rect(target, 59, 34, 10, 3, [112, 66, 58, 255]);
  if (recipe.feature === "coat") {
    rect(target, 49, 13, 30, 8, [48, 41, 38, 255]);
    rect(target, 47, 17, 6, 7, [48, 41, 38, 255]);
    rect(target, 58, 11, 7, 5, [48, 41, 38, 255]);
    rect(target, 72, 14, 8, 7, [48, 41, 38, 255]);
    line(target, 64, 45, 64, 90, recipe.accent, 3);
    rect(target, 47, 78, 12, 8, recipe.accent);
  } else if (recipe.feature === "apron") {
    rect(target, 49, 54, 30, 34, recipe.accent);
    rect(target, 90, 54, 3, 21, [179, 43, 45, 255]);
  } else if (recipe.feature === "hat") {
    rect(target, 29, 10, 70, 8, recipe.accent);
    rect(target, 42, 2, 44, 16, recipe.accent);
  } else if (recipe.feature === "field") {
    rect(target, 43, 43, 42, 68, recipe.garment);
    rect(target, 47, 48, 5, 59, recipe.accent);
    rect(target, 76, 48, 5, 59, recipe.accent);
    line(target, 54, 45, 64, 55, recipe.accent, 4);
    line(target, 74, 45, 64, 55, recipe.accent, 4);
    rect(target, 31, 79, 12, 8, recipe.accent);
    rect(target, 85, 79, 12, 8, recipe.accent);
    rect(target, 43, 80, 42, 5, [67, 78, 45, 255]);
    rect(target, 43, 104, 42, 7, [67, 78, 45, 255]);
    rect(target, 35, 65, 8, 13, [82, 70, 48, 255]);
  } else if (recipe.feature === "survey") {
    rect(target, 85, 60, 12, 10, recipe.accent);
    rect(target, 88, 62, 6, 6, [242, 214, 90, 255]);
    line(target, 55, 46, 73, 90, recipe.accent, 3);
  } else if (recipe.feature === "messenger") {
    line(target, 48, 46, 78, 90, recipe.accent, 5);
    rect(target, 74, 69, 15, 18, [78, 53, 40, 255]);
  } else if (recipe.feature === "front-coat") {
    rect(target, 55, 58, 7, 7, recipe.accent);
    rect(target, 68, 58, 7, 7, recipe.accent);
    line(target, 43, 73, 31, 75, [229, 218, 183, 255], 4);
    line(target, 84, 73, 97, 75, [229, 218, 183, 255], 4);
  } else if (recipe.feature === "rear-coat") {
    line(target, 43, 73, 31, 75, [229, 218, 183, 255], 4);
    line(target, 84, 73, 97, 75, [229, 218, 183, 255], 4);
    line(target, 51, 69, 61, 62, recipe.accent, 4);
    line(target, 61, 62, 74, 70, recipe.accent, 4);
    line(target, 74, 70, 79, 64, recipe.accent, 4);
  } else if (recipe.feature === "climber") {
    line(target, 47, 45, 75, 90, recipe.accent, 5);
    line(target, 80, 45, 54, 90, recipe.accent, 5);
    rect(target, 75, 66, 15, 17, [55, 57, 52, 255]);
  }
  return png(target);
}

type DrawingRecipe = Readonly<{ background: Rgba; ink: Rgba; accent: Rgba; feature: string }>;

const DRAWING_RECIPES: Readonly<Record<string, DrawingRecipe>> = {
  "v1-009-sketch": { background: [239, 231, 211, 255], ink: [78, 57, 43, 255], accent: [174, 142, 88, 255], feature: "moth" },
  "v1-010-suit": { background: [225, 218, 203, 255], ink: [48, 43, 39, 255], accent: [174, 75, 42, 255], feature: "chevron" },
  "v1-013-botanical": { background: [225, 232, 215, 255], ink: [55, 88, 57, 255], accent: [137, 163, 96, 255], feature: "leaves" },
  "v1-015-garment": { background: [230, 224, 214, 255], ink: [49, 43, 57, 255], accent: [111, 90, 116, 255], feature: "robe" },
  "v1-015-light": { background: [38, 26, 55, 255], ink: [82, 46, 95, 255], accent: [235, 162, 55, 255], feature: "light" },
  "v1-016-kite": { background: [231, 236, 231, 255], ink: [42, 62, 70, 255], accent: [208, 90, 66, 255], feature: "kite" },
  "v1-018-wash": { background: [203, 208, 194, 255], ink: [74, 87, 76, 255], accent: [103, 112, 96, 255], feature: "wash" },
  "v1-019-front": { background: [236, 232, 215, 255], ink: [73, 79, 74, 255], accent: [42, 111, 176, 255], feature: "river-front" },
  "v1-019-rear": { background: [236, 232, 215, 255], ink: [73, 79, 74, 255], accent: [42, 111, 176, 255], feature: "river-rear" },
  "v1-036-fin": { background: [221, 232, 229, 255], ink: [42, 65, 67, 255], accent: [26, 147, 151, 255], feature: "fin" },
};

function drawingReference(recipe: DrawingRecipe): Uint8Array {
  const target = canvas(IMAGE_SIZE, IMAGE_SIZE, recipe.background);
  if (["moth", "robe"].includes(recipe.feature)) {
    rect(target, 43, 23, 42, 80, recipe.ink);
    rect(target, 29, 34, 14, 61, recipe.ink);
    rect(target, 85, 34, 14, 61, recipe.ink);
  }
  if (recipe.feature === "moth") {
    const cream: Rgba = [222, 205, 166, 255];
    rect(target, 43, 23, 42, 80, cream);
    rect(target, 29, 34, 14, 61, cream);
    rect(target, 85, 34, 14, 61, cream);
    line(target, 64, 26, 64, 100, recipe.ink, 3);
    rect(target, 29, 82, 14, 8, recipe.ink);
    rect(target, 85, 82, 14, 8, recipe.ink);
    diamond(target, 39, 42, 17, recipe.accent);
    diamond(target, 89, 42, 17, recipe.accent);
    diamond(target, 39, 42, 6, recipe.ink);
    diamond(target, 89, 42, 6, recipe.ink);
  } else if (recipe.feature === "chevron") {
    const cream: Rgba = [223, 205, 166, 255];
    rect(target, 12, 25, 44, 69, recipe.ink);
    rect(target, 4, 36, 8, 48, recipe.ink);
    rect(target, 56, 36, 8, 48, recipe.ink);
    rect(target, 18, 94, 15, 25, recipe.ink);
    rect(target, 36, 94, 15, 25, recipe.ink);
    line(target, 13, 43, 34, 62, recipe.accent, 6);
    line(target, 34, 62, 55, 43, recipe.accent, 6);
    rect(target, 18, 83, 32, 4, cream);

    rect(target, 72, 25, 44, 69, recipe.ink);
    rect(target, 64, 36, 8, 48, recipe.ink);
    rect(target, 116, 36, 8, 48, recipe.ink);
    rect(target, 78, 94, 15, 25, recipe.ink);
    rect(target, 96, 94, 15, 25, recipe.ink);
    diamond(target, 94, 61, 10, cream);
    rect(target, 78, 83, 32, 4, cream);
  } else if (recipe.feature === "leaves") {
    for (let index = 0; index < 5; index += 1) {
      const x = 18 + index * 23;
      line(target, x, 105, x + 8, 30, recipe.ink, 3);
      diamond(target, x - 3, 48 + index * 7, 8, recipe.accent);
      diamond(target, x + 10, 70 - index * 4, 7, recipe.ink);
    }
  } else if (recipe.feature === "robe") {
    rect(target, 27, 35, 19, 22, recipe.accent);
    rect(target, 82, 35, 19, 22, recipe.accent);
    rect(target, 38, 18, 52, 13, [91, 75, 101, 255]);
  } else if (recipe.feature === "light") {
    for (let index = 0; index < 7; index += 1) {
      const color: Rgba = [235 - index * 16, 162 - index * 14, 55 + index * 7, 255];
      rect(target, 7 + index * 9, 13 + index * 13, 82 - index * 5, 9, color);
    }
  } else if (recipe.feature === "kite") {
    diamond(target, 49, 48, 29, recipe.accent);
    diamond(target, 82, 61, 22, recipe.ink);
    line(target, 64, 74, 58, 113, recipe.ink, 3);
    line(target, 58, 93, 45, 86, recipe.accent, 4);
    line(target, 58, 105, 72, 98, recipe.accent, 4);
  } else if (recipe.feature === "wash") {
    rect(target, 10, 17, 49, 33, recipe.ink);
    rect(target, 43, 43, 70, 29, recipe.accent);
    rect(target, 20, 68, 63, 38, [91, 103, 88, 255]);
  } else if (recipe.feature === "river-front" || recipe.feature === "river-rear") {
    rect(target, 33, 18, 62, 93, [206, 201, 184, 255]);
    if (recipe.feature === "river-front") {
      line(target, 37, 101, 88, 29, recipe.accent, 8);
      line(target, 88, 29, 76, 31, recipe.accent, 7);
      line(target, 88, 29, 86, 42, recipe.accent, 7);
    } else {
      line(target, 37, 34, 91, 96, recipe.accent, 8);
      line(target, 91, 96, 78, 93, recipe.accent, 7);
      line(target, 91, 96, 88, 83, recipe.accent, 7);
      rect(target, 48, 58, 34, 9, [245, 243, 226, 255]);
      rect(target, 54, 53, 6, 20, [245, 243, 226, 255]);
      rect(target, 70, 53, 6, 20, [245, 243, 226, 255]);
    }
  } else if (recipe.feature === "fin") {
    rect(target, 45, 28, 40, 76, [168, 188, 183, 255]);
    rect(target, 54, 48, 5, 5, recipe.ink);
    rect(target, 72, 48, 5, 5, recipe.ink);
    line(target, 45, 101, 45, 26, recipe.ink, 5);
    for (let step = 0; step < 7; step += 1) {
      line(target, 44 - step * 2, 88 - step * 9, 12 + step * 2, 79 - step * 7, recipe.accent, 6);
    }
  }
  return png(target);
}

const PALETTES: Readonly<Record<string, readonly Rgba[]>> = {
  "v1-012-palette": [[80, 92, 102, 255], [89, 102, 101, 255], [97, 108, 101, 255], [72, 82, 86, 255], [106, 113, 106, 255], [60, 68, 72, 255]],
  "v1-014-palette": [[225, 109, 78, 255], [63, 155, 130, 255], [26, 91, 97, 255], [143, 135, 126, 255], [242, 205, 64, 255]],
};

function paletteReference(colors: readonly Rgba[]): Uint8Array {
  const target = canvas(IMAGE_SIZE, IMAGE_SIZE, [226, 224, 217, 255]);
  const width = Math.floor(104 / colors.length);
  colors.forEach((color, index) => rect(target, 12 + index * width, 24, width, 80, color));
  return png(target);
}

function selectionsFor(part: HumanoidSkinPart, layer?: HumanoidSkinLayer, faces = FACES): HumanoidSkinRegionSelection[] {
  return (layer ? [layer] : LAYERS).flatMap((selectedLayer) => faces.map((face) => ({ part, layer: selectedLayer, face })));
}

function setSelectionColor(document: HumanoidSkinDocument, selections: readonly HumanoidSkinRegionSelection[], color: Rgba): void {
  const mask = createHumanoidSkinSelectionMask(document.profile, selections);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (mask[pixel]) document.pixels.set(color, pixel * 4);
  }
}

function setPixel(document: HumanoidSkinDocument, selection: HumanoidSkinRegionSelection, color: Rgba): void {
  setSelectionColor(document, [selection], color);
}

function createAtlas(profile: HumanoidSkinProfileId, variant: string): HumanoidSkinDocument {
  const document = createBlankHumanoidSkinDocument(profile, { baseColor: [72, 76, 80, 255] });
  setSelectionColor(document, selectionsFor("head", "base"), [199, 164, 128, 255]);
  setSelectionColor(document, selectionsFor("torso", "base"), [73, 78, 82, 255]);
  setSelectionColor(document, [...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [92, 96, 98, 255]);
  setSelectionColor(document, [...selectionsFor("right-leg", "base"), ...selectionsFor("left-leg", "base")], [54, 58, 62, 255]);
  setPixel(document, { part: "head", layer: "base", face: "front", x: 2, y: 3, width: 1, height: 1 }, [40, 48, 54, 255]);
  setPixel(document, { part: "head", layer: "base", face: "front", x: 5, y: 3, width: 1, height: 1 }, [40, 48, 54, 255]);

  if (variant === "workshop") {
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 2, y: 8, width: 1, height: 1 }, [221, 181, 92, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 5, y: 8, width: 1, height: 1 }, [221, 181, 92, 255]);
  } else if (variant === "blue-asymmetry") {
    setSelectionColor(document, selectionsFor("torso", "base"), [45, 80, 132, 255]);
    setSelectionColor(document, [...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [45, 80, 132, 255]);
    setPixel(document, { part: "head", layer: "base", face: "front", x: 1, y: 5, width: 2, height: 1 }, [164, 71, 73, 255]);
  } else if (variant === "opaque-wide") {
    setSelectionColor(document, selectionsFor("torso", "base"), [71, 54, 82, 255]);
  } else if (variant === "charcoal-cream") {
    setSelectionColor(document, selectionsFor("head", "base"), [223, 207, 164, 255]);
    setSelectionColor(document, [...selectionsFor("torso", "base"), ...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [50, 53, 56, 255]);
  } else if (variant === "revision-jacket") {
    setSelectionColor(document, selectionsFor("torso", "base"), [45, 94, 57, 255]);
    setSelectionColor(document, [...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [177, 137, 92, 255]);
    setSelectionColor(document, [...selectionsFor("right-leg", "base"), ...selectionsFor("left-leg", "base")], [29, 48, 78, 255]);
    setSelectionColor(document, [{ part: "head", layer: "outer", face: "top" }, { part: "head", layer: "outer", face: "back" }], [74, 50, 35, 255]);
    setSelectionColor(document, [{ part: "torso", layer: "outer", face: "front", x: 0, y: 0, width: 8, height: 2 }], [219, 198, 139, 210]);
  } else if (variant === "revision-boot") {
    setSelectionColor(document, selectionsFor("torso", "base"), [48, 79, 91, 255]);
    setSelectionColor(document, [...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [63, 91, 99, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 3, y: 1, width: 2, height: 10 }, [183, 151, 83, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "back", x: 1, y: 3, width: 6, height: 2 }, [37, 61, 72, 255]);
    setPixel(document, { part: "right-arm", layer: "base", face: "front", y: 8, width: 3, height: 4 }, [183, 151, 83, 255]);
    setPixel(document, { part: "left-arm", layer: "base", face: "front", y: 8, width: 3, height: 4 }, [183, 151, 83, 255]);
    setSelectionColor(document, [...selectionsFor("right-leg", "base"), ...selectionsFor("left-leg", "base")], [98, 65, 40, 255]);
    setPixel(document, { part: "right-leg", layer: "base", face: "front", x: 1, y: 0, width: 1, height: 8 }, [151, 111, 62, 255]);
    setPixel(document, { part: "left-leg", layer: "base", face: "front", x: 2, y: 0, width: 1, height: 8 }, [151, 111, 62, 255]);
    setSelectionColor(document, [{ part: "right-leg", layer: "base", face: "front", y: 8, width: 4, height: 4 }], [68, 43, 29, 255]);
    setSelectionColor(document, [{ part: "left-leg", layer: "base", face: "front", y: 8, width: 4, height: 4 }], [112, 72, 40, 255]);
  } else if (variant === "revision-emblem") {
    setSelectionColor(document, selectionsFor("torso", "base"), [39, 48, 56, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 3, y: 3, width: 1, height: 1 }, [211, 184, 103, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 3, y: 6, width: 1, height: 1 }, [211, 184, 103, 255]);
    setPixel(document, { part: "torso", layer: "base", face: "front", x: 3, y: 9, width: 1, height: 1 }, [211, 184, 103, 255]);
  } else if (variant === "revision-hood") {
    setSelectionColor(document, selectionsFor("torso", "base"), [52, 73, 89, 255]);
    setSelectionColor(document, [...selectionsFor("right-arm", "base"), ...selectionsFor("left-arm", "base")], [52, 73, 89, 255]);
    setSelectionColor(document, [{ part: "head", layer: "base", face: "top" }, { part: "head", layer: "base", face: "back" }], [54, 39, 35, 255]);
    setPixel(document, { part: "head", layer: "base", face: "front", y: 0, width: 8, height: 2 }, [54, 39, 35, 255]);
    setPixel(document, { part: "head", layer: "base", face: "front", x: 3, y: 5, width: 2, height: 1 }, [133, 72, 66, 255]);
  } else {
    throw new Error(`Unknown atlas variant '${variant}'.`);
  }
  const validation = validateHumanoidSkinDocument(document);
  if (!validation.ok) throw new Error(`Generated atlas '${variant}' is invalid.`);
  return document;
}

const ATLAS_VARIANTS: Readonly<Record<string, string>> = {
  "v1-023-atlas": "workshop",
  "v1-024-atlas": "blue-asymmetry",
  "v1-025-atlas": "opaque-wide",
  "v1-026-atlas": "charcoal-cream",
};

const REVISION_VARIANTS: Readonly<Record<string, string>> = {
  "v1-027": "revision-jacket",
  "v1-028": "revision-boot",
  "v1-029": "revision-emblem",
  "v1-030": "revision-hood",
};

function allParts(parts: readonly HumanoidSkinPart[], layer?: HumanoidSkinLayer): HumanoidSkinRegionSelection[] {
  return parts.flatMap((part) => selectionsFor(part, layer));
}

export function evaluationRegionMask(profile: HumanoidSkinProfileId, selector: string): Uint8Array {
  let selections: HumanoidSkinRegionSelection[] | undefined;
  if (selector === "torso.base.all-faces") selections = selectionsFor("torso", "base");
  else if (selector === "head.all") selections = selectionsFor("head");
  else if (selector === "right-leg.all") selections = selectionsFor("right-leg");
  else if (selector === "left-leg.all") selections = selectionsFor("left-leg");
  else if (selector === "right-arm.all") selections = selectionsFor("right-arm");
  else if (selector === "left-arm.all") selections = selectionsFor("left-arm");
  else if (selector === "arms.all") selections = allParts(["right-arm", "left-arm"]);
  else if (selector === "legs.all") selections = allParts(["right-leg", "left-leg"]);
  else if (selector === "outer-layer.all") selections = allParts(PARTS, "outer");
  else if (selector === "head.base.face") selections = [{ part: "head", layer: "base", face: "front" }];
  else if (selector === "left-leg.base.front.boot") selections = [{ part: "left-leg", layer: "base", face: "front", y: 8, width: 4, height: 4 }];
  else if (selector === "right-leg.base.front.boot") selections = [{ part: "right-leg", layer: "base", face: "front", y: 8, width: 4, height: 4 }];
  else if (selector === "left-leg.base.all-except-front-boot") {
    selections = [
      ...FACES.filter((face) => face !== "front").map((face) => ({ part: "left-leg" as const, layer: "base" as const, face })),
      { part: "left-leg", layer: "base", face: "front", width: 4, height: 8 },
    ];
  } else if (selector === "torso.base.rear") selections = [{ part: "torso", layer: "base", face: "back" }];
  else if (selector === "torso.base.front") selections = [{ part: "torso", layer: "base", face: "front" }];
  else if (selector === "torso.base.left") selections = [{ part: "torso", layer: "base", face: "left" }];
  else if (selector === "torso.base.right") selections = [{ part: "torso", layer: "base", face: "right" }];
  else if (selector === "torso.base.top") selections = [{ part: "torso", layer: "base", face: "top" }];
  else if (selector === "torso.base.bottom") selections = [{ part: "torso", layer: "base", face: "bottom" }];
  else if (selector === "torso.base.front.buttons") selections = [
    { part: "torso", layer: "base", face: "front", x: 3, y: 3, width: 1, height: 1 },
    { part: "torso", layer: "base", face: "front", x: 3, y: 6, width: 1, height: 1 },
    { part: "torso", layer: "base", face: "front", x: 3, y: 9, width: 1, height: 1 },
  ];
  else if (selector === "head.outer.all-faces") selections = selectionsFor("head", "outer");
  else if (selector === "head.base.all-faces") selections = selectionsFor("head", "base");
  else if (selector === "torso.all") selections = selectionsFor("torso");
  else if (selector === "head.base.front") selections = [{ part: "head", layer: "base", face: "front" }];
  else if (selector === "unused-atlas-regions") return createUnusedPixelMask(profile);
  if (!selections) throw new Error(`Evaluation region selector '${selector}' is not explicitly mapped.`);
  return createHumanoidSkinSelectionMask(profile, selections);
}

function combineMasks(profile: HumanoidSkinProfileId, selectors: readonly string[]): Uint8Array {
  const combined = new Uint8Array(64 * 64);
  for (const selector of selectors) {
    const mask = evaluationRegionMask(profile, selector);
    for (let pixel = 0; pixel < combined.length; pixel += 1) combined[pixel] = combined[pixel] || mask[pixel] ? 1 : 0;
  }
  return combined;
}

function encodeBinaryMask(mask: Uint8Array): Uint8Array {
  const pixels = new Uint8Array(mask.length * 4);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const value = mask[pixel] ? 255 : 0;
    pixels.set([value, value, value, 255], pixel * 4);
  }
  return encodeRgbaPng(64, 64, pixels);
}

function referenceBytes(reference: Reference, profile: HumanoidSkinProfileId): Uint8Array {
  if (reference.mediaKind === "synthetic-photo") {
    const recipe = PHOTO_RECIPES[reference.id];
    if (!recipe) throw new Error(`No synthetic photo recipe exists for '${reference.id}'.`);
    return photoReference(recipe);
  }
  if (reference.mediaKind === "synthetic-drawing") {
    const recipe = DRAWING_RECIPES[reference.id];
    if (!recipe) throw new Error(`No synthetic drawing recipe exists for '${reference.id}'.`);
    return drawingReference(recipe);
  }
  if (reference.mediaKind === "synthetic-palette") {
    const colors = PALETTES[reference.id];
    if (!colors) throw new Error(`No synthetic palette recipe exists for '${reference.id}'.`);
    return paletteReference(colors);
  }
  if (reference.mediaKind === "synthetic-atlas") {
    const variant = ATLAS_VARIANTS[reference.id];
    if (!variant) throw new Error(`No synthetic atlas recipe exists for '${reference.id}'.`);
    return exportHumanoidSkinPng(createAtlas(profile, variant));
  }
  throw new Error(`Unsupported reference media kind '${reference.mediaKind}'.`);
}

function generatedAsset(path: string, bytes: Uint8Array, kind: GeneratedEvaluationAsset["kind"], ownerId: string): GeneratedEvaluationAsset {
  return Object.freeze({ path, bytes, sha256: sha256(bytes), kind, ownerId });
}

function assertBundleIntegrity(repoRoot: string, bundle: EvaluationAssetBundle): void {
  const evaluationRoot = resolve(repoRoot, EVALUATION_ROOT);
  const seen = new Set<string>();
  const cases = new Map(bundle.caseSet.cases.map((item) => [item.id, item]));
  for (const asset of bundle.assets) {
    const absolute = resolve(repoRoot, asset.path);
    const confined = relative(evaluationRoot, absolute);
    if (confined.startsWith("..") || confined === "" || seen.has(absolute)) {
      throw new Error(`Generated evaluation asset path '${asset.path}' is unsafe or duplicated.`);
    }
    seen.add(absolute);
    if (sha256(asset.bytes) !== asset.sha256) throw new Error(`Generated evaluation asset '${asset.path}' failed its hash check.`);
    const decoded = decodeRgbaPng(asset.bytes);
    if (asset.kind === "reference") {
      const owner = bundle.caseSet.cases.flatMap((item) => item.references.map((reference) => ({ item, reference })))
        .find(({ reference }) => reference.id === asset.ownerId);
      if (!owner) throw new Error(`Generated reference '${asset.ownerId}' has no owning case.`);
      if (owner.reference.materializedAsset?.mimeType !== "image/png") throw new Error(`Generated reference '${asset.ownerId}' has an invalid MIME type.`);
      if (owner.reference.mediaKind === "synthetic-atlas") {
        if (!validateMaterializedAtlas(asset.bytes, owner.item.profile)) throw new Error(`Generated reference atlas '${asset.ownerId}' is invalid.`);
      } else if (decoded.width !== IMAGE_SIZE || decoded.height !== IMAGE_SIZE) {
        throw new Error(`Generated reference '${asset.ownerId}' must be ${IMAGE_SIZE}x${IMAGE_SIZE}.`);
      }
    } else if (asset.kind === "revision-baseline") {
      const owner = cases.get(asset.ownerId);
      if (!owner || !validateMaterializedAtlas(asset.bytes, owner.profile)) throw new Error(`Generated baseline '${asset.ownerId}' is invalid.`);
    } else {
      decodeMaterializedMask(asset.bytes);
    }
  }
}

function assertMaskSemantics(profile: HumanoidSkinProfileId, editable: Uint8Array, protectedMask: Uint8Array, immutable: Uint8Array): void {
  const mapped = createMappedPixelMask(profile);
  for (let pixel = 0; pixel < editable.length; pixel += 1) {
    if (editable[pixel] && protectedMask[pixel]) throw new Error("Editable and protected revision masks overlap.");
    if (editable[pixel] && immutable[pixel]) throw new Error("Editable and immutable revision masks overlap.");
    if (editable[pixel] && !mapped[pixel]) throw new Error("Editable revision mask includes unused atlas pixels.");
  }
  if (!editable.some(Boolean)) throw new Error("Editable revision mask must select at least one pixel.");
  if (!protectedMask.some(Boolean)) throw new Error("Protected revision mask must select at least one pixel.");
  if (!immutable.some(Boolean)) throw new Error("Immutable revision mask must select at least one pixel.");
}

export function buildEvaluationAssetBundle(sourceCaseSet: CaseSet): EvaluationAssetBundle {
  const caseSet = structuredClone(sourceCaseSet);
  const assets: GeneratedEvaluationAsset[] = [];
  let referenceCount = 0;
  let baselineCount = 0;
  let maskSetCount = 0;

  for (const evaluationCase of caseSet.cases) {
    for (const reference of evaluationCase.references) {
      if (reference.provenance.origin !== "project-authored-synthetic"
        || reference.provenance.rights !== "evaluation-use-approved"
        || reference.provenance.thirdPartyContent !== false) {
        throw new Error(`Reference '${reference.id}' is not approved project-authored synthetic input.`);
      }
      const path = `${EVALUATION_ROOT}/assets/references/${reference.id}.png`;
      const asset = generatedAsset(path, referenceBytes(reference, evaluationCase.profile), "reference", reference.id);
      reference.materializedAsset = { path, sha256: asset.sha256, mimeType: "image/png" };
      assets.push(asset);
      referenceCount += 1;
    }

    if (!evaluationCase.revision) continue;
    const variant = REVISION_VARIANTS[evaluationCase.id];
    if (!variant) throw new Error(`No revision baseline recipe exists for '${evaluationCase.id}'.`);
    const root = `${EVALUATION_ROOT}/assets/revisions/${evaluationCase.id}`;
    const baseline = generatedAsset(
      `${root}/baseline.png`,
      exportHumanoidSkinPng(createAtlas(evaluationCase.profile, variant)),
      "revision-baseline",
      evaluationCase.id,
    );
    evaluationCase.revision.baselineAsset = { path: baseline.path, sha256: baseline.sha256, mimeType: "image/png" };
    assets.push(baseline);
    baselineCount += 1;

    const editable = combineMasks(evaluationCase.profile, evaluationCase.revision.editableRegions);
    const declaredProtected = combineMasks(evaluationCase.profile, evaluationCase.revision.protectedRegions);
    if (evaluationCase.revision.protectionMode !== "all-mapped-except-editable") {
      throw new Error(`Revision '${evaluationCase.id}' has an unsupported protection mode.`);
    }
    const mapped = createMappedPixelMask(evaluationCase.profile);
    const protectedMask = Uint8Array.from(mapped, (value, pixel) => value && !editable[pixel] ? 1 : 0);
    for (let pixel = 0; pixel < declaredProtected.length; pixel += 1) {
      if (declaredProtected[pixel] && !protectedMask[pixel]) {
        throw new Error(`Revision '${evaluationCase.id}' declares a protected texel inside its editable mask.`);
      }
    }
    const immutable = combineMasks(evaluationCase.profile, evaluationCase.revision.immutableRegions);
    assertMaskSemantics(evaluationCase.profile, editable, protectedMask, immutable);
    const maskAssets = {
      editable: generatedAsset(`${root}/editable-mask.png`, encodeBinaryMask(editable), "editable-mask", evaluationCase.id),
      protected: generatedAsset(`${root}/protected-mask.png`, encodeBinaryMask(protectedMask), "protected-mask", evaluationCase.id),
      immutable: generatedAsset(`${root}/immutable-mask.png`, encodeBinaryMask(immutable), "immutable-mask", evaluationCase.id),
    };
    evaluationCase.revision.materializedMasks = {
      editable: { path: maskAssets.editable.path, sha256: maskAssets.editable.sha256, mimeType: "image/png" },
      protected: { path: maskAssets.protected.path, sha256: maskAssets.protected.sha256, mimeType: "image/png" },
      immutable: { path: maskAssets.immutable.path, sha256: maskAssets.immutable.sha256, mimeType: "image/png" },
    };
    assets.push(maskAssets.editable, maskAssets.protected, maskAssets.immutable);
    maskSetCount += 1;
  }

  if (referenceCount !== 25 || baselineCount !== 4 || maskSetCount !== 4) {
    throw new Error(`Evaluation asset counts changed unexpectedly (${referenceCount} references, ${baselineCount} baselines, ${maskSetCount} mask sets).`);
  }
  return Object.freeze({
    caseSet,
    caseSetText: `${JSON.stringify(caseSet, null, 2)}\n`,
    assets: Object.freeze(assets),
    referenceCount,
    baselineCount,
    maskSetCount,
  });
}

async function fileMatches(path: string, expected: Uint8Array | string): Promise<boolean> {
  try {
    const actual = await readFile(path);
    const bytes = typeof expected === "string" ? Buffer.from(expected) : Buffer.from(expected);
    return actual.equals(bytes);
  } catch {
    return false;
  }
}

export async function materializeEvaluationAssets(repoRoot: string, mode: "check" | "write") {
  const caseSetPath = join(repoRoot, CASE_SET_PATH);
  const source = JSON.parse(await readFile(caseSetPath, "utf8")) as CaseSet;
  const bundle = buildEvaluationAssetBundle(source);
  assertBundleIntegrity(repoRoot, bundle);
  if (mode === "write") {
    for (const asset of bundle.assets) {
      const absolute = join(repoRoot, asset.path);
      await mkdir(dirname(absolute), { recursive: true });
      await writeFile(absolute, asset.bytes);
    }
    await writeFile(caseSetPath, bundle.caseSetText);
  }

  const issues: string[] = [];
  if (!await fileMatches(caseSetPath, bundle.caseSetText)) issues.push(`${CASE_SET_PATH}: metadata differs from deterministic output`);
  for (const asset of bundle.assets) {
    if (!await fileMatches(join(repoRoot, asset.path), asset.bytes)) issues.push(`${asset.path}: bytes differ from deterministic output`);
  }
  return {
    mode,
    ok: issues.length === 0,
    referenceAssets: bundle.referenceCount,
    revisionBaselines: bundle.baselineCount,
    revisionMaskSets: bundle.maskSetCount,
    files: bundle.assets.length,
    thirdPartyInputs: 0,
    issues,
  };
}

export function validateMaterializedAtlas(bytes: Uint8Array, profile: HumanoidSkinProfileId): boolean {
  const decoded = decodeRgbaPng(bytes);
  if (decoded.width !== 64 || decoded.height !== 64) return false;
  return validateHumanoidSkinDocument(importHumanoidSkinPng(bytes, { profile })).ok;
}

export function decodeMaterializedMask(bytes: Uint8Array): Uint8Array {
  const decoded = decodeRgbaPng(bytes);
  if (decoded.width !== 64 || decoded.height !== 64) throw new Error("Evaluation masks must be 64x64 RGBA PNGs.");
  const mask = new Uint8Array(64 * 64);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const red = decoded.pixels[offset] ?? -1;
    if (decoded.pixels[offset + 1] !== red || decoded.pixels[offset + 2] !== red || decoded.pixels[offset + 3] !== 255 || ![0, 255].includes(red)) {
      throw new Error("Evaluation masks must contain only opaque black and white RGBA pixels.");
    }
    mask[pixel] = red === 255 ? 1 : 0;
  }
  return mask;
}

export function evaluationMaskPixelCount(mask: Uint8Array): number {
  return mask.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}

export function regionDimensions(profile: HumanoidSkinProfileId, part: HumanoidSkinPart, layer: HumanoidSkinLayer, face: HumanoidSkinFace) {
  const region = getHumanoidSkinRegion(profile, part, layer, face);
  return { width: region.width, height: region.height };
}

export function profileMappedPixelCount(profile: HumanoidSkinProfileId): number {
  return createMappedPixelMask(profile).reduce((sum, value) => sum + value, 0);
}

export function profileRegionCount(profile: HumanoidSkinProfileId): number {
  return getHumanoidSkinProfile(profile).regions.length;
}
