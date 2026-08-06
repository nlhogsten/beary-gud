import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const run = (...args) => execFileSync("bun", ["apps/character-cli/src/studio.mjs", ...args], { cwd: root, encoding: "utf8" });

test("validates the editable bear source", () => {
  const result = JSON.parse(run("validate", "bear"));
  assert.equal(result.ok, true); assert.equal(result.height, 19); assert.equal(result.width, 50);
});

test("refuses unsupported Bash instead of running it", () => {
  assert.throws(() => run("import-bash", "package.json", "unsafe"), /Unsupported Bash/);
});

test("renders alpha assets", () => {
  run("render", "bear");
  assert.ok(existsSync(resolve(root, "exports/bear/png/bear_000.png")));
  assert.ok(existsSync(resolve(root, "exports/bear/bear_cycle.mov")));
  assert.ok(existsSync(resolve(root, "exports/bear/bear_loop_30s.mov")));
});
