export const TRANSPARENT_DRAFT_STORAGE_KEY = "transparent-character-studio-drafts-v1";
export const TRANSPARENT_HISTORY_STORAGE_KEY = "transparent-character-studio-history-v1";
export const FRAME_COUNT = 4;
export const CANVAS_WIDTH = 50;
export const CANVAS_HEIGHT = 19;
export const HISTORY_LIMIT = 50;

export type ExportMode = "Animated PNG" | "Sprite sheet";
export type EffectId = "smoke" | "cycle" | "drift";

export interface CharacterEffects {
  smoke: boolean;
  cycle: boolean;
  drift: boolean;
}

export interface TransparentCharacter {
  name: string;
  lines: string[];
  scale: number;
  fps: number;
  palette: Record<string, string>;
  effects: CharacterEffects;
}

export interface TransparentVersionDocument {
  kind: "voxl.transparent-character/v1";
  formatVersion: 1;
  lines: string[];
  scale: number;
  fps: number;
  palette: Record<string, string>;
  effects: CharacterEffects;
}

export interface ActivityEntry {
  time: string;
  message: string;
}

export interface TransparentStudioState {
  version: 2;
  current: string;
  characters: TransparentCharacter[];
  mode: ExportMode;
  activity: ActivityEntry[];
}

export interface HistoryEntry {
  state: TransparentStudioState;
  label: string;
}

export interface TransparentStudioHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export const starterLines = [
  "0000000000000000000000000000000000000MMMMMMMMM0000",
  "0000000000000000000000000000000000MMMMMMMMMMMM0000",
  "00000000000000000000000000000000BBBBBMMMMMMM000000",
  "000001100000000000000000000000BBBBBBBBBB0000000000",
  "0000111100000000000000000000CCCCCCCCBBBB0000000000",
  "0001121100000000000000000CCCCCCCCCCCCC000000000000",
  "00011155200000000000000GGGGGGGGGGGGCCC000000000000",
  "00001555334RRRRRYYYYYGGGGGGGGGGGGGG000000000000000",
  "000011510000000RRRRRYYYYYYYYYYYYGGG000000000000000",
  "000115511000000000RRRRRRYYYYYYYY000000000000000000",
  "0011155511000000000000RRRRR00000000000000000000000",
  "01115555510000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "11115555511000000000000000000000000000000000000000",
  "01111555110000000000000000000000000000000000000000",
  "00111111100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "00110001100000000000000000000000000000000000000000",
  "01110011100000000000000000000000000000000000000000",
] as const;

export const defaultPalette: Readonly<Record<string, string>> = {
  1: "#af5f00",
  5: "#af875f",
  2: "#171717",
  3: "#f7f7f7",
  4: "#ff3b30",
  R: "#ff4d45",
  Y: "#ffd449",
  G: "#5de38c",
  C: "#63d9ff",
  B: "#6988ff",
  M: "#f178ff",
};

const animationSymbols = ["R", "Y", "G", "C", "B", "M"] as const;
const paletteCandidates = [..."6789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"];

function clamp(value: unknown, fallback: number): number {
  return Math.max(1, Math.min(60, Number(value) || fallback));
}

export function cloneState(state: TransparentStudioState): TransparentStudioState {
  return structuredClone(state);
}

export function initialTransparentState(now = new Date().toISOString()): TransparentStudioState {
  return {
    version: 2,
    current: "Rainbow Bear",
    characters: [{
      name: "Rainbow Bear",
      lines: [...starterLines],
      scale: 10,
      fps: 12,
      palette: { ...defaultPalette },
      effects: { smoke: true, cycle: true, drift: false },
    }],
    mode: "Animated PNG",
    activity: [{ time: now, message: "Studio opened" }],
  };
}

function normalizedLines(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length !== CANVAS_HEIGHT) return undefined;
  const lines = value.filter((line): line is string => typeof line === "string");
  if (lines.length !== CANVAS_HEIGHT || lines.some((line) => line.length !== CANVAS_WIDTH)) return undefined;
  return lines;
}

export function normalizeTransparentState(value: unknown): TransparentStudioState {
  const fallback = initialTransparentState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.characters)) return fallback;
  const characters = candidate.characters.flatMap((item): TransparentCharacter[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const lines = normalizedLines(source.lines);
    if (!lines) return [];
    const effects = source.effects && typeof source.effects === "object"
      ? source.effects as Partial<CharacterEffects>
      : {};
    const palette = source.palette && typeof source.palette === "object" && !Array.isArray(source.palette)
      ? source.palette as Record<string, string>
      : {};
    return [{
      name: typeof source.name === "string" && source.name.trim() ? source.name.trim() : "Character",
      lines: [...lines],
      scale: clamp(source.scale, 10),
      fps: clamp(source.fps, 12),
      palette: { ...defaultPalette, ...palette },
      effects: {
        smoke: effects.smoke === true,
        cycle: effects.cycle === true,
        drift: effects.drift === true,
      },
    }];
  });
  if (!characters.length) return fallback;
  const requestedCurrent = typeof candidate.current === "string" ? candidate.current : "";
  const current = characters.some((item) => item.name === requestedCurrent)
    ? requestedCurrent
    : characters[0]?.name ?? fallback.current;
  const activity = Array.isArray(candidate.activity)
    ? candidate.activity.flatMap((item): ActivityEntry[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      return typeof entry.time === "string" && typeof entry.message === "string"
        ? [{ time: entry.time, message: entry.message }]
        : [];
    }).slice(-100)
    : [];
  return {
    version: 2,
    current,
    characters,
    mode: candidate.mode === "Sprite sheet" || candidate.mode === "Compact sprite"
      ? "Sprite sheet"
      : "Animated PNG",
    activity,
  };
}

export function normalizeTransparentHistory(value: unknown): TransparentStudioHistory {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { past: [], future: [] };
  const candidate = value as Partial<TransparentStudioHistory>;
  return {
    past: Array.isArray(candidate.past) ? candidate.past.slice(-HISTORY_LIMIT) : [],
    future: Array.isArray(candidate.future) ? candidate.future.slice(-HISTORY_LIMIT) : [],
  };
}

export function currentCharacter(state: TransparentStudioState): TransparentCharacter {
  return state.characters.find((item) => item.name === state.current) ?? state.characters[0]!;
}

export function serializeTransparentVersionDocument(character: TransparentCharacter): string {
  return JSON.stringify({
    kind: "voxl.transparent-character/v1",
    formatVersion: 1,
    lines: [...character.lines],
    scale: character.scale,
    fps: character.fps,
    palette: { ...character.palette },
    effects: { ...character.effects },
  } satisfies TransparentVersionDocument);
}

export function parseTransparentVersionDocument(documentJson: string): Omit<TransparentCharacter, "name"> {
  const value: unknown = JSON.parse(documentJson);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Motion version document is invalid.");
  }
  const candidate = value as Partial<TransparentVersionDocument>;
  const lines = normalizedLines(candidate.lines);
  const paletteEntries = candidate.palette && typeof candidate.palette === "object" && !Array.isArray(candidate.palette)
    ? Object.entries(candidate.palette)
    : [];
  const paletteIsValid = paletteEntries.length > 0 && paletteEntries.every(([symbol, color]) => (
    symbol.length === 1 && symbol !== "0" && typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)
  ));
  const effects = candidate.effects;
  if (
    candidate.kind !== "voxl.transparent-character/v1"
    || candidate.formatVersion !== 1
    || !lines
    || !Number.isInteger(candidate.scale)
    || Number(candidate.scale) < 1
    || Number(candidate.scale) > 60
    || !Number.isInteger(candidate.fps)
    || Number(candidate.fps) < 1
    || Number(candidate.fps) > 60
    || !paletteIsValid
    || !effects
    || typeof effects !== "object"
    || effects.smoke === undefined
    || effects.cycle === undefined
    || effects.drift === undefined
    || typeof effects.smoke !== "boolean"
    || typeof effects.cycle !== "boolean"
    || typeof effects.drift !== "boolean"
  ) throw new Error("Motion version document is invalid.");
  const palette = Object.fromEntries(paletteEntries);
  if (lines.some((line) => [...line].some((symbol) => symbol !== "0" && !palette[symbol]))) {
    throw new Error("Motion version uses a color that is missing from its palette.");
  }
  return {
    lines: [...lines],
    scale: Number(candidate.scale),
    fps: Number(candidate.fps),
    palette,
    effects: {
      smoke: effects.smoke,
      cycle: effects.cycle,
      drift: effects.drift,
    },
  };
}

export function countChangedTransparentPixels(leftJson: string, rightJson: string): number {
  const left = parseTransparentVersionDocument(leftJson);
  const right = parseTransparentVersionDocument(rightJson);
  let changed = 0;
  for (let y = 0; y < CANVAS_HEIGHT; y += 1) {
    for (let x = 0; x < CANVAS_WIDTH; x += 1) {
      if (left.lines[y]?.[x] !== right.lines[y]?.[x]) changed += 1;
    }
  }
  return changed;
}

export function countChangedTransparentSettings(leftJson: string, rightJson: string): number {
  const left = parseTransparentVersionDocument(leftJson);
  const right = parseTransparentVersionDocument(rightJson);
  let changed = Number(left.scale !== right.scale) + Number(left.fps !== right.fps);
  for (const effect of ["smoke", "cycle", "drift"] as const) {
    if (left.effects[effect] !== right.effects[effect]) changed += 1;
  }
  const paletteSymbols = new Set([...Object.keys(left.palette), ...Object.keys(right.palette)]);
  for (const symbol of paletteSymbols) {
    if (left.palette[symbol] !== right.palette[symbol]) changed += 1;
  }
  return changed;
}

export function blankCharacter(name: string): TransparentCharacter {
  return {
    name,
    lines: Array.from({ length: CANVAS_HEIGHT }, () => "0".repeat(CANVAS_WIDTH)),
    scale: 10,
    fps: 12,
    palette: { ...defaultPalette },
    effects: { smoke: false, cycle: false, drift: false },
  };
}

export function addActivity(state: TransparentStudioState, message: string): TransparentStudioState {
  return {
    ...state,
    activity: [...state.activity, { time: new Date().toISOString(), message }].slice(-100),
  };
}

export function replaceCurrentCharacter(
  state: TransparentStudioState,
  update: (character: TransparentCharacter) => TransparentCharacter,
): TransparentStudioState {
  return {
    ...state,
    characters: state.characters.map((item) => item.name === state.current ? update(item) : item),
  };
}

export function commitTransparentEdit(
  state: TransparentStudioState,
  history: TransparentStudioHistory,
  label: string,
  mutate: (draft: TransparentStudioState) => TransparentStudioState,
): { state: TransparentStudioState; history: TransparentStudioHistory; changed: boolean } {
  const before = cloneState(state);
  const next = mutate(cloneState(state));
  if (JSON.stringify(before) === JSON.stringify(next)) return { state, history, changed: false };
  return {
    state: addActivity(next, label),
    history: { past: [...history.past, { state: before, label }].slice(-HISTORY_LIMIT), future: [] },
    changed: true,
  };
}

export function undoTransparentEdit(state: TransparentStudioState, history: TransparentStudioHistory) {
  const entry = history.past.at(-1);
  if (!entry) return { state, history, label: undefined };
  return {
    state: addActivity(normalizeTransparentState(entry.state), `Undid: ${entry.label}`),
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, { state: cloneState(state), label: entry.label }].slice(-HISTORY_LIMIT),
    },
    label: entry.label,
  };
}

export function redoTransparentEdit(state: TransparentStudioState, history: TransparentStudioHistory) {
  const entry = history.future.at(-1);
  if (!entry) return { state, history, label: undefined };
  return {
    state: addActivity(normalizeTransparentState(entry.state), `Redid: ${entry.label}`),
    history: {
      past: [...history.past, { state: cloneState(state), label: entry.label }].slice(-HISTORY_LIMIT),
      future: history.future.slice(0, -1),
    },
    label: entry.label,
  };
}

export function paintCharacterPixel(
  character: TransparentCharacter,
  x: number,
  y: number,
  symbol: string,
): TransparentCharacter {
  const row = character.lines[y];
  if (!row || row[x] === symbol) return character;
  const lines = [...character.lines];
  lines[y] = `${row.slice(0, x)}${symbol}${row.slice(x + 1)}`;
  return { ...character, lines };
}

export function colorFor(
  symbol: string,
  frame: number,
  character: TransparentCharacter,
): string | undefined {
  if (symbol === "0") return undefined;
  let paletteSymbol = symbol;
  const cycleIndex = animationSymbols.findIndex((item) => item === symbol);
  if (character.effects.cycle && cycleIndex >= 0) {
    paletteSymbol = animationSymbols[(cycleIndex + frame) % animationSymbols.length] ?? symbol;
  }
  return character.palette[paletteSymbol] ?? character.palette[symbol];
}

export function pixelIsHidden(symbol: string, x: number, frame: number, character: TransparentCharacter) {
  return character.effects.smoke
    && animationSymbols.some((item) => item === symbol)
    && (x + frame) % 2 === 0;
}

export function nextPaletteSymbol(palette: Record<string, string>): string | undefined {
  return paletteCandidates.find((symbol) => !palette[symbol]);
}

export function slugifyCharacter(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "character";
}

export function createCharacterCanvas(
  character: TransparentCharacter,
  frame: number,
  scale = character.scale,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const driftPadding = character.effects.drift ? 4 : 0;
  canvas.width = CANVAS_WIDTH * scale;
  canvas.height = (CANVAS_HEIGHT + driftPadding) * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.imageSmoothingEnabled = false;
  const drift = character.effects.drift ? [4, 2, 0, 2][frame] ?? 0 : 0;
  character.lines.forEach((row, y) => {
    [...row].forEach((symbol, x) => {
      const color = colorFor(symbol, frame, character);
      if (!color || pixelIsHidden(symbol, x, frame, character)) return;
      context.fillStyle = color;
      context.fillRect(x * scale, (y + drift) * scale, scale, scale);
    });
  });
  return canvas;
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png");
  });
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(arrays.reduce((sum, array) => sum + array.length, 0));
  let offset = 0;
  arrays.forEach((array) => {
    output.set(array, offset);
    offset += array.length;
  });
  return output;
}

function uint32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

export function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const body = concatBytes(new TextEncoder().encode(type), data);
  return concatBytes(uint32(data.length), body, uint32(crc32(body)));
}

interface PngParts {
  ihdr: Uint8Array;
  idat: Uint8Array[];
}

function pngParts(bytes: Uint8Array): PngParts {
  let ihdr: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") ihdr = data;
    if (type === "IDAT") idat.push(data);
    offset += length + 12;
  }
  if (!ihdr) throw new Error("PNG is missing its IHDR chunk");
  return { ihdr, idat };
}

function frameControl(width: number, height: number, fps: number, sequence: number): Uint8Array {
  const data = new Uint8Array(26);
  const view = new DataView(data.buffer);
  view.setUint32(0, sequence);
  view.setUint32(4, width);
  view.setUint32(8, height);
  view.setUint32(12, 0);
  view.setUint32(16, 0);
  view.setUint16(20, 1);
  view.setUint16(22, fps);
  return data;
}

export async function makeAnimatedPng(character: TransparentCharacter): Promise<Blob> {
  const encoded: PngParts[] = [];
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    const blob = await canvasBlob(createCharacterCanvas(character, frame));
    encoded.push(pngParts(new Uint8Array(await blob.arrayBuffer())));
  }
  const first = encoded[0];
  if (!first) throw new Error("No animation frames were encoded");
  const header = new DataView(first.ihdr.buffer, first.ihdr.byteOffset, 8);
  const chunks = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", first.ihdr),
    pngChunk("acTL", concatBytes(uint32(encoded.length), uint32(0))),
  ];
  let sequence = 0;
  encoded.forEach((parts, frameIndex) => {
    chunks.push(pngChunk("fcTL", frameControl(header.getUint32(0), header.getUint32(4), character.fps, sequence++)));
    parts.idat.forEach((data) => {
      chunks.push(frameIndex === 0
        ? pngChunk("IDAT", data)
        : pngChunk("fdAT", concatBytes(uint32(sequence++), data)));
    });
  });
  chunks.push(pngChunk("IEND", new Uint8Array()));
  return new Blob(chunks.map((chunk) => chunk.slice().buffer), { type: "image/apng" });
}

export async function makeSpriteSheet(character: TransparentCharacter): Promise<Blob> {
  const frames = Array.from({ length: FRAME_COUNT }, (_, frame) => createCharacterCanvas(character, frame));
  const first = frames[0];
  if (!first) throw new Error("No sprite frames were created");
  const sheet = document.createElement("canvas");
  sheet.width = first.width * frames.length;
  sheet.height = first.height;
  const context = sheet.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  context.imageSmoothingEnabled = false;
  frames.forEach((canvas, index) => context.drawImage(canvas, index * canvas.width, 0));
  return canvasBlob(sheet);
}
