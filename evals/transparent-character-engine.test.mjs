import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { EngineRegistry } from "../packages/engine-contracts/src/index.mjs";
import {
  createTransparentCharacterEngine,
  importBashCharacter,
  loadCharacter,
  rasterizeCharacterFrame,
  validateCharacter,
} from "../packages/engine-transparent-character/src/index.mjs";

const root = resolve(import.meta.dirname, "..");

test("loads and validates the existing source without migration", async () => {
  const sourcePath = join(root, "characters/bear/character.json");
  const sourceBefore = await readFile(sourcePath, "utf8");
  const document = await loadCharacter("bear", { workspaceRoot: root });

  assert.deepEqual(validateCharacter(document), { width: 50, height: 19 });
  assert.equal(document.slug, "bear");
  assert.equal(await readFile(sourcePath, "utf8"), sourceBefore);
});

test("preserves stable Rainbow Bear geometry, transparency, and palette pixels", async () => {
  const document = await loadCharacter("bear", { workspaceRoot: root });
  const image = rasterizeCharacterFrame(document.frames[0], document.config, 0);

  assert.equal(image.width, 600);
  assert.equal(image.height, 228);
  assert.deepEqual([...image.data.subarray(0, 4)], [0, 0, 0, 0]);

  const brownPixel = ((3 * 12) * image.width + 5 * 12) * 4;
  assert.deepEqual([...image.data.subarray(brownPixel, brownPixel + 4)], [175, 95, 0, 255]);
});

test("discovers and validates the real engine through the shared registry", async () => {
  const registry = new EngineRegistry([createTransparentCharacterEngine({ workspaceRoot: root })]);
  const document = await loadCharacter("bear", { workspaceRoot: root });

  assert.equal(registry.getDescriptor("transparent-character").capabilities.animate, true);
  const result = await registry.invoke("transparent-character", "validate", document);
  assert.deepEqual(result, {
    ok: true,
    issues: [],
    geometry: { width: 50, height: 19 },
  });
});

test("discovers and invokes the real engine through the engine-neutral CLI", async (context) => {
  const engines = JSON.parse(execFileSync("bun", ["apps/character-cli/src/voxl.mjs", "engines"], {
    cwd: root,
    encoding: "utf8",
  }));
  assert.deepEqual(engines.map(({ id }) => id), ["transparent-character", "voxl-humanoid-skin"]);

  const directory = await mkdtemp(join(tmpdir(), "voxl-cli-request-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const requestPath = join(directory, "validate.json");
  const document = await loadCharacter("bear", { workspaceRoot: root });
  await writeFile(requestPath, JSON.stringify(document));
  const result = JSON.parse(execFileSync("node", [
    "apps/character-cli/src/voxl.mjs",
    "invoke",
    "transparent-character",
    "validate",
    requestPath,
  ], { cwd: root, encoding: "utf8" }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.geometry, { width: 50, height: 19 });
});

test("keeps invalid CLI request paths out of public errors", () => {
  const privatePath = "/private/secret/request.json";
  const result = spawnSync("node", [
    "apps/character-cli/src/voxl.mjs",
    "invoke",
    "transparent-character",
    "validate",
    privatePath,
  ], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /private\/secret|request\.json/);
  assert.match(result.stderr, /invalid_cli_request/);
});

test("renders valid alpha exports through the shared registry", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "voxl-transparent-character-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  await mkdir(join(workspaceRoot, "characters"), { recursive: true });
  await cp(join(root, "characters/bear"), join(workspaceRoot, "characters/bear"), { recursive: true });

  const registry = new EngineRegistry([createTransparentCharacterEngine({ workspaceRoot })]);
  const document = await loadCharacter("bear", { workspaceRoot });
  const artifacts = await registry.invoke("transparent-character", "render", { document });
  const loop = artifacts.find(({ profile }) => profile === "prores-alpha-loop");

  assert.ok(loop);
  assert.ok(existsSync(loop.path));
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=codec_name,pix_fmt",
    "-of",
    "json",
    loop.path,
  ], { encoding: "utf8" }));
  assert.equal(probe.streams[0].codec_name, "prores");
  assert.match(probe.streams[0].pix_fmt, /^yuva444p/);
});

test("rejects character names that could escape the workspace", async () => {
  await assert.rejects(
    loadCharacter("../bear", { workspaceRoot: root }),
    /one non-empty folder name/,
  );
});

test("imports supported legacy canvas data without executing the source", async (context) => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "voxl-safe-import-"));
  context.after(() => rm(workspaceRoot, { recursive: true, force: true }));
  await mkdir(join(workspaceRoot, "characters"), { recursive: true });
  const marker = join(workspaceRoot, "must-not-exist");
  const source = join(workspaceRoot, "legacy.sh");
  await writeFile(source, `canvas=(\n"01"\n"10"\n)\ntouch "${marker}"\n`);

  const result = await importBashCharacter(source, "safe-import", { workspaceRoot });
  const imported = await loadCharacter("safe-import", { workspaceRoot });

  assert.equal(result.ok, true);
  assert.equal(existsSync(marker), false);
  assert.deepEqual(validateCharacter(imported), { width: 2, height: 2 });
});
