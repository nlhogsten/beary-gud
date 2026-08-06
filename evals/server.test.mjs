import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the studio workspace owns one native Vite application", async () => {
  await access(new URL("apps/studio/index.html", root));
  for (const path of [
    "apps/studio/public/compatibility/index.html",
    "apps/studio/public/studio.css",
    "apps/studio/public/studio.js",
    "apps/studio/public/skin-editor.js",
    "apps/studio/public/skin-editor-core.js",
  ]) {
    await assert.rejects(access(new URL(path, root)));
  }

  const viteConfig = await readFile(new URL("apps/studio/vite.config.ts", root), "utf8");
  assert.match(viteConfig, /"\/api"/);
  assert.match(viteConfig, /127\.0\.0\.1:5741/);
});

test("runtime-specific configuration is not stored at repository root", async () => {
  for (const path of ["vite.config.ts", "drizzle.config.ts", "index.html"]) {
    await assert.rejects(access(new URL(path, root)));
  }
});
