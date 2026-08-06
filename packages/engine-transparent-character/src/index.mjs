import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";

export const DEFAULT_WORKSPACE_ROOT = resolve(import.meta.dirname, "../../..");

export const transparentCharacterDescriptor = Object.freeze({
  id: "transparent-character",
  version: "1.0.0",
  title: "Transparent character",
  documentTypes: ["voxl.transparent-character/v1"],
  inputTypes: ["application/vnd.voxl.transparent-character+json", "text/plain"],
  outputFormats: ["image/png", "video/quicktime"],
  capabilities: {
    create: false,
    revise: false,
    validate: true,
    render: true,
    export: true,
    edit2d: true,
    edit3d: false,
    animate: true,
  },
});

function workspacePaths(workspaceRoot) {
  const root = resolve(workspaceRoot);
  return {
    root,
    characters: join(root, "characters"),
    exports: join(root, "exports"),
  };
}

function requireSafeName(name) {
  if (
    typeof name !== "string"
    || name.length === 0
    || name === "."
    || name === ".."
    || name.includes("/")
    || name.includes("\\")
  ) {
    throw new Error("Character name must be one non-empty folder name.");
  }
  return name;
}

function hex(value) {
  const normalized = value.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function crc32(buffer) {
  let value = -1;
  for (const byte of buffer) {
    value ^= byte;
    for (let index = 0; index < 8; index += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  body.copy(output, 4);
  output.writeUInt32BE(crc32(body), data.length + 8);
  return output;
}

function encodePng(width, height, rgba) {
  const header = Buffer.from([
    width >>> 24,
    width >>> 16,
    width >>> 8,
    width,
    height >>> 24,
    height >>> 16,
    height >>> 8,
    height,
    8,
    6,
    0,
    0,
    0,
  ]);
  const rows = Array.from({ length: height }, (_, y) => Buffer.concat([
    Buffer.from([0]),
    rgba.subarray(y * width * 4, (y + 1) * width * 4),
  ]));
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function loadCharacter(name, { workspaceRoot = DEFAULT_WORKSPACE_ROOT } = {}) {
  const slug = requireSafeName(name);
  const paths = workspacePaths(workspaceRoot);
  const directory = join(paths.characters, slug);
  if (!existsSync(directory)) {
    throw new Error(`Character '${slug}' does not exist in characters/.`);
  }

  const config = JSON.parse(await readFile(join(directory, "character.json"), "utf8"));
  const files = (await readdir(join(directory, "frames")))
    .filter((file) => file.endsWith(".txt"))
    .sort();
  if (files.length === 0) throw new Error("No .txt frames found.");

  const frames = await Promise.all(files.map(async (file) => (
    await readFile(join(directory, "frames", file), "utf8")
  ).trim().split(/\r?\n/)));

  return { slug, directory, config, frames, files };
}

export function validateCharacter(document) {
  const { config, frames } = document;
  const palette = config.palette ?? {};
  const expectedHeight = frames[0]?.length ?? 0;
  const expectedWidth = frames[0]?.[0]?.length ?? 0;
  if (!expectedWidth || !expectedHeight) throw new Error("Frames cannot be empty.");

  for (const [frameIndex, frame] of frames.entries()) {
    if (frame.length !== expectedHeight) {
      throw new Error(`Frame ${frameIndex} has ${frame.length} rows; expected ${expectedHeight}.`);
    }
    for (const [rowIndex, row] of frame.entries()) {
      if (row.length !== expectedWidth) {
        throw new Error(`Frame ${frameIndex}, row ${rowIndex} has ${row.length} cells; expected ${expectedWidth}.`);
      }
      for (const symbol of row) {
        if (symbol !== "0" && !palette[symbol]) {
          throw new Error(`Frame ${frameIndex}, row ${rowIndex} uses '${symbol}', which is not in palette.`);
        }
      }
    }
  }

  return { width: expectedWidth, height: expectedHeight };
}

export function validateCharacterResult(document) {
  try {
    const geometry = validateCharacter(document);
    return { ok: true, issues: [], geometry };
  } catch (error) {
    return {
      ok: false,
      issues: [{
        code: "invalid_transparent_character",
        message: error instanceof Error ? error.message : "The character document is invalid.",
        severity: "error",
      }],
    };
  }
}

export function rasterizeCharacterFrame(frame, config, offset = 0) {
  const scale = config.pixelScale ?? 24;
  const width = frame[0].length * scale;
  const height = frame.length * scale;
  const data = Buffer.alloc(width * height * 4);
  const alternating = new Set(config.animation?.alternatingSymbols ?? []);

  for (let y = 0; y < frame.length; y += 1) {
    for (let x = 0; x < frame[y].length; x += 1) {
      const symbol = frame[y][x];
      if (symbol === "0" || (alternating.has(symbol) && (x + offset) % 2 === 0)) continue;
      const [red, green, blue] = hex(config.palette[symbol]);
      for (let pixelY = 0; pixelY < scale; pixelY += 1) {
        for (let pixelX = 0; pixelX < scale; pixelX += 1) {
          const index = ((y * scale + pixelY) * width + x * scale + pixelX) * 4;
          data[index] = red;
          data[index + 1] = green;
          data[index + 2] = blue;
          data[index + 3] = 255;
        }
      }
    }
  }

  return { width, height, data };
}

function createContactSheet(images) {
  const gap = 12;
  const columns = Math.min(4, images.length);
  const rows = Math.ceil(images.length / columns);
  const width = columns * images[0].width + (columns - 1) * gap;
  const height = rows * images[0].height + (rows - 1) * gap;
  const data = Buffer.alloc(width * height * 4);

  images.forEach((image, index) => {
    const offsetX = (index % columns) * (image.width + gap);
    const offsetY = Math.floor(index / columns) * (image.height + gap);
    for (let y = 0; y < image.height; y += 1) {
      image.data.copy(
        data,
        ((offsetY + y) * width + offsetX) * 4,
        y * image.width * 4,
        (y + 1) * image.width * 4,
      );
    }
  });

  return { width, height, data };
}

function runFfmpeg(args, ffmpegPath) {
  const result = spawnSync(ffmpegPath, args, { stdio: "pipe" });
  if (result.status !== 0) {
    const detail = result.stderr?.toString().slice(-600) || result.error?.message || "Unknown ffmpeg error.";
    throw new Error(`FFmpeg failed: ${detail}`);
  }
}

function artifact(path, mediaType, profile) {
  return {
    filename: basename(path),
    mediaType,
    path,
    ...(profile ? { profile } : {}),
  };
}

export async function renderCharacter(
  document,
  { workspaceRoot = DEFAULT_WORKSPACE_ROOT, ffmpegPath = "ffmpeg" } = {},
) {
  const geometry = validateCharacter(document);
  const slug = requireSafeName(document.slug);
  const paths = workspacePaths(workspaceRoot);
  const outputDirectory = join(paths.exports, slug);
  const sequenceDirectory = join(outputDirectory, "png");
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(sequenceDirectory, { recursive: true });

  const { config, frames } = document;
  const offsets = config.animation?.alternatingSymbols?.length
    ? Array.from({ length: config.animation.frameCount ?? 4 }, (_, index) => index)
    : frames.map((_, index) => index);
  const rendered = [];
  const artifacts = [];

  for (let index = 0; index < offsets.length; index += 1) {
    const image = rasterizeCharacterFrame(frames[index % frames.length], config, offsets[index]);
    const path = join(sequenceDirectory, `${slug}_${String(index).padStart(3, "0")}.png`);
    rendered.push(image);
    await writeFile(path, encodePng(image.width, image.height, image.data));
    artifacts.push(artifact(path, "image/png", "png-sequence"));
  }

  const sheet = createContactSheet(rendered);
  const contactSheetPath = join(outputDirectory, `${slug}_contact-sheet.png`);
  await writeFile(contactSheetPath, encodePng(sheet.width, sheet.height, sheet.data));
  artifacts.push(artifact(contactSheetPath, "image/png", "contact-sheet"));

  const fps = config.fps ?? 12;
  const duration = config.loopDuration ?? 30;
  const pattern = join(sequenceDirectory, `${slug}_%03d.png`);
  const cyclePath = join(outputDirectory, `${slug}_cycle.mov`);
  const loopPath = join(outputDirectory, `${slug}_loop_${duration}s.mov`);
  const common = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    pattern,
    "-c:v",
    "prores_ks",
    "-profile:v",
    "4",
    "-pix_fmt",
    "yuva444p10le",
  ];
  runFfmpeg([...common, cyclePath], ffmpegPath);
  runFfmpeg([
    "-y",
    "-stream_loop",
    "-1",
    "-framerate",
    String(fps),
    "-i",
    pattern,
    "-t",
    String(duration),
    "-c:v",
    "prores_ks",
    "-profile:v",
    "4",
    "-pix_fmt",
    "yuva444p10le",
    loopPath,
  ], ffmpegPath);
  artifacts.push(artifact(cyclePath, "video/quicktime", "prores-alpha-cycle"));
  artifacts.push(artifact(loopPath, "video/quicktime", "prores-alpha-loop"));

  return {
    ok: true,
    character: slug,
    cells: geometry,
    frames: rendered.length,
    exports: outputDirectory,
    artifacts,
  };
}

export async function exportCharacter(
  document,
  profile,
  { workspaceRoot = DEFAULT_WORKSPACE_ROOT, ffmpegPath = "ffmpeg" } = {},
) {
  const result = await renderCharacter(document, { workspaceRoot, ffmpegPath });
  const matches = result.artifacts.filter((item) => item.profile === profile);
  if (matches.length === 0) throw new Error(`Unsupported transparent-character export profile '${profile}'.`);
  if (profile === "png-sequence") {
    return {
      filename: `${document.slug}_png-sequence`,
      mediaType: "application/vnd.voxl.png-sequence",
      profile,
      files: matches,
      path: join(result.exports, "png"),
    };
  }
  return matches[0];
}

export async function importBashCharacter(
  file,
  name,
  { workspaceRoot = DEFAULT_WORKSPACE_ROOT } = {},
) {
  const slug = requireSafeName(name);
  const source = await readFile(resolve(file), "utf8");
  const matches = [...source.matchAll(/"([0-9A-Za-z]+)"/g)]
    .map((match) => match[1])
    .filter((value) => /^[0-9RGYCBM]+$/.test(value));
  if (!/canvas=\(/.test(source) || matches.length === 0) {
    throw new Error("Unsupported Bash. Expected a quoted canvas=(...) grid; scripts are never executed.");
  }

  const palette = {
    "1": "#af5f00",
    "5": "#af875f",
    "2": "#171717",
    "3": "#f7f7f7",
    "4": "#ff3b30",
    R: "#ff4d45",
    Y: "#ffd449",
    G: "#5de38c",
    C: "#63d9ff",
    B: "#6988ff",
    M: "#f178ff",
  };
  const paths = workspacePaths(workspaceRoot);
  const directory = join(paths.characters, slug);
  if (existsSync(directory)) throw new Error(`Character '${slug}' already exists; choose a new name.`);
  await mkdir(join(directory, "frames"), { recursive: true });
  await writeFile(join(directory, "character.json"), `${JSON.stringify({
    name: slug,
    pixelScale: 24,
    fps: 12,
    loopDuration: 30,
    palette,
    animation: {
      alternatingSymbols: /\(i \+ offset\)/.test(source) ? ["R", "G", "Y", "C", "B", "M"] : [],
      frameCount: 4,
    },
  }, null, 2)}\n`);
  await writeFile(join(directory, "frames", "000.txt"), `${matches.join("\n")}\n`);

  return {
    ok: true,
    imported: basename(file),
    character: slug,
    sourceHash: createHash("sha256").update(source).digest("hex").slice(0, 12),
  };
}

export async function listCharacters({ workspaceRoot = DEFAULT_WORKSPACE_ROOT } = {}) {
  return (await readdir(workspacePaths(workspaceRoot).characters)).sort();
}

export function createTransparentCharacterEngine(
  { workspaceRoot = DEFAULT_WORKSPACE_ROOT, ffmpegPath = "ffmpeg" } = {},
) {
  return {
    descriptor: transparentCharacterDescriptor,
    validate: validateCharacterResult,
    async render({ document }) {
      const result = await renderCharacter(document, { workspaceRoot, ffmpegPath });
      return result.artifacts;
    },
    export({ document, profile }) {
      return exportCharacter(document, profile, { workspaceRoot, ffmpegPath });
    },
  };
}
