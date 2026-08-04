#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const chars = join(root, "characters");
const exportsRoot = join(root, "exports");
const hex = (value) => { const h = value.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const crc32 = (buffer) => { let c = -1; for (const byte of buffer) { c ^= byte; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]); const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), data.length + 8); return out; };
const png = (width, height, rgba) => Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", Buffer.from([width >>> 24, width >>> 16, width >>> 8, width, height >>> 24, height >>> 16, height >>> 8, height, 8, 6, 0, 0, 0])), chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: height }, (_, y) => Buffer.concat([Buffer.from([0]), rgba.subarray(y * width * 4, (y + 1) * width * 4)]))))), chunk("IEND", Buffer.alloc(0))]);

async function load(name) {
  const dir = join(chars, name);
  if (!existsSync(dir)) throw new Error(`Character '${name}' does not exist in characters/.`);
  const config = JSON.parse(await readFile(join(dir, "character.json"), "utf8"));
  const files = (await readdir(join(dir, "frames"))).filter((file) => file.endsWith(".txt")).sort();
  if (!files.length) throw new Error("No .txt frames found.");
  const frames = await Promise.all(files.map(async (file) => (await readFile(join(dir, "frames", file), "utf8")).trim().split(/\r?\n/)));
  return { dir, config, frames, files };
}
function validate(character) {
  const { config, frames } = character; const palette = config.palette ?? {}; const expectedHeight = frames[0].length; const expectedWidth = frames[0][0].length;
  if (!expectedWidth || !expectedHeight) throw new Error("Frames cannot be empty.");
  for (const [index, frame] of frames.entries()) {
    if (frame.length !== expectedHeight) throw new Error(`Frame ${index} has ${frame.length} rows; expected ${expectedHeight}.`);
    for (const [rowIndex, row] of frame.entries()) {
      if (row.length !== expectedWidth) throw new Error(`Frame ${index}, row ${rowIndex} has ${row.length} cells; expected ${expectedWidth}.`);
      for (const symbol of row) if (symbol !== "0" && !palette[symbol]) throw new Error(`Frame ${index}, row ${rowIndex} uses '${symbol}', which is not in palette.`);
    }
  }
  return { width: expectedWidth, height: expectedHeight };
}
function raster(frame, config, offset = 0) {
  const scale = config.pixelScale ?? 24; const width = frame[0].length * scale; const height = frame.length * scale; const data = Buffer.alloc(width * height * 4);
  const alternating = new Set(config.animation?.alternatingSymbols ?? []);
  for (let y = 0; y < frame.length; y++) for (let x = 0; x < frame[y].length; x++) {
    const symbol = frame[y][x]; if (symbol === "0" || (alternating.has(symbol) && (x + offset) % 2 === 0)) continue;
    const [r, g, b] = hex(config.palette[symbol]);
    for (let py = 0; py < scale; py++) for (let px = 0; px < scale; px++) { const i = ((y * scale + py) * width + x * scale + px) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255; }
  }
  return { width, height, data };
}
async function render(name) {
  const character = await load(name); const geometry = validate(character); const { config, frames } = character; const out = join(exportsRoot, name); const sequence = join(out, "png");
  await rm(out, { recursive: true, force: true }); await mkdir(sequence, { recursive: true });
  const offsets = config.animation?.alternatingSymbols?.length ? Array.from({ length: config.animation.frameCount ?? 4 }, (_, i) => i) : frames.map((_, i) => i);
  const rendered = [];
  for (let i = 0; i < offsets.length; i++) { const image = raster(frames[i % frames.length], config, offsets[i]); rendered.push(image); await writeFile(join(sequence, `${name}_${String(i).padStart(3, "0")}.png`), png(image.width, image.height, image.data)); }
  const sheet = contactSheet(rendered); await writeFile(join(out, `${name}_contact-sheet.png`), png(sheet.width, sheet.height, sheet.data));
  const fps = config.fps ?? 12; const duration = config.loopDuration ?? 30; const pattern = join(sequence, `${name}_%03d.png`);
  const common = ["-y", "-framerate", String(fps), "-i", pattern, "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le"];
  runFfmpeg([...common, join(out, `${name}_cycle.mov`)]); runFfmpeg(["-y", "-stream_loop", "-1", "-framerate", String(fps), "-i", pattern, "-t", String(duration), "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", join(out, `${name}_loop_${duration}s.mov`)]);
  console.log(JSON.stringify({ ok: true, character: name, cells: geometry, frames: rendered.length, exports: out }, null, 2));
}
function contactSheet(images) { const gap = 12; const cols = Math.min(4, images.length); const rows = Math.ceil(images.length / cols); const width = cols * images[0].width + (cols - 1) * gap; const height = rows * images[0].height + (rows - 1) * gap; const data = Buffer.alloc(width * height * 4); images.forEach((image, n) => { const dx = (n % cols) * (image.width + gap); const dy = Math.floor(n / cols) * (image.height + gap); for (let y = 0; y < image.height; y++) image.data.copy(data, ((dy + y) * width + dx) * 4, y * image.width * 4, (y + 1) * image.width * 4); }); return { width, height, data }; }
function runFfmpeg(args) { const result = spawnSync("ffmpeg", args, { stdio: "pipe" }); if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.stderr.toString().slice(-600)}`); }
async function importBash(file, name) {
  const source = await readFile(resolve(file), "utf8"); const matches = [...source.matchAll(/"([0-9A-Za-z]+)"/g)].map((m) => m[1]).filter((v) => /^[0-9RGYCBM]+$/.test(v));
  if (!/canvas=\(/.test(source) || !matches.length) throw new Error("Unsupported Bash. Expected a quoted canvas=(...) grid; scripts are never executed.");
  const palette = { "1": "#af5f00", "5": "#af875f", "2": "#171717", "3": "#f7f7f7", "4": "#ff3b30", R: "#ff4d45", Y: "#ffd449", G: "#5de38c", C: "#63d9ff", B: "#6988ff", M: "#f178ff" };
  const dir = join(chars, name); if (existsSync(dir)) throw new Error(`Character '${name}' already exists; choose a new name.`); await mkdir(join(dir, "frames"), { recursive: true });
  await writeFile(join(dir, "character.json"), JSON.stringify({ name, pixelScale: 24, fps: 12, loopDuration: 30, palette, animation: { alternatingSymbols: /\(i \+ offset\)/.test(source) ? ["R", "G", "Y", "C", "B", "M"] : [], frameCount: 4 } }, null, 2) + "\n");
  await writeFile(join(dir, "frames", "000.txt"), matches.join("\n") + "\n"); console.log(JSON.stringify({ ok: true, imported: basename(file), character: name, sourceHash: createHash("sha256").update(source).digest("hex").slice(0, 12) }, null, 2));
}
const [command, first, second] = process.argv.slice(2);
try { if (command === "render") await render(first); else if (command === "validate") { const character = await load(first); console.log(JSON.stringify({ ok: true, character: first, ...validate(character) })); } else if (command === "import-bash") await importBash(first, second); else if (command === "list") console.log((await readdir(chars)).join("\n")); else throw new Error("Usage: studio <render|validate|import-bash|list> ..."); } catch (error) { console.error(`Studio error: ${error.message}`); process.exitCode = 1; }
