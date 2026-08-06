import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createProductionApp } from "../scripts/serve.mjs";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("production server exposes health and falls back to the Vite app", async () => {
  const distRoot = await mkdtemp(join(tmpdir(), "voxl-dist-"));
  await writeFile(join(distRoot, "index.html"), "<main>VOXL</main>", "utf8");

  await withServer(createProductionApp({ distRoot }), async (origin) => {
    const health = await fetch(`${origin}/api/health`);
    assert.deepEqual(await health.json(), { ok: true, service: "voxl-studio" });

    const route = await fetch(`${origin}/projects/example`);
    assert.equal(route.status, 200);
    assert.equal(await route.text(), "<main>VOXL</main>");
  });
});

test("the local production command defaults to loopback", async () => {
  const serverSource = await readFile(new URL("../scripts/serve.mjs", import.meta.url), "utf8");
  assert.match(serverSource, /process\.env\.HOST \|\| "127\.0\.0\.1"/);
});
