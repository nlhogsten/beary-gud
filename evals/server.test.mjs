import assert from "node:assert/strict";
import test from "node:test";
import { createStudioServer } from "../scripts/server.mjs";

async function withServer(run) {
  const server = createStudioServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("a missing static file returns 404 without crashing the server", async () => {
  await withServer(async (origin) => {
    const missing = await fetch(`${origin}/missing-file.png`);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), "Not found");

    const healthy = await fetch(`${origin}/api/health`);
    assert.equal(healthy.status, 200);
    assert.deepEqual(await healthy.json(), { ok: true });
  });
});

test("serves the editor and its split frontend assets", async () => {
  await withServer(async (origin) => {
    for (const path of ["/", "/studio.css", "/studio.js", "/skin-editor.js", "/skin-editor-core.js", "/favicon.svg"]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200, path);
    }
  });
});
