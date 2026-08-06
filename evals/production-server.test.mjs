import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createApp } from "../apps/server/src/app.ts";

test("Hono server exposes health and engine discovery", async () => {
  const app = createApp();

  const health = await app.request("/api/health");
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: "voxl-server" });

  const engines = await app.request("/api/engines");
  assert.equal(engines.status, 200);
  const payload = await engines.json();
  assert.deepEqual(payload.engines.map((engine) => engine.id), [
    "transparent-character",
    "voxl-humanoid-skin",
  ]);
});

test("Hono server returns a serializable public 404", async () => {
  const response = await createApp().request("/missing");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: {
      code: "not_found",
      message: "The requested VOXL route does not exist.",
    },
  });
});

test("host execution defaults the Bun server to loopback", async () => {
  const source = await readFile(new URL("../apps/server/src/index.ts", import.meta.url), "utf8");
  assert.match(source, /process\.env\.HOST \?\? "127\.0\.0\.1"/);
  assert.match(source, /Bun\.serve/);
});
