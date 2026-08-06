import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("hosted entry uses the typed React engine UI registry", async () => {
  const [page, shell, registry] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/studio/StudioShell.tsx", root), "utf8"),
    readFile(new URL("app/studio/engine-ui-registry.ts", root), "utf8"),
  ]);
  assert.match(page, /<StudioShell\s*\/>/);
  assert.doesNotMatch(page, /iframe/i);
  assert.match(shell, /ENGINE_UI_REGISTRY\.map/);
  assert.match(registry, /id: "voxl-humanoid-skin"/);
  assert.match(registry, /id: "transparent-character"/);
  assert.match(registry, /status: "native"/);
  assert.match(registry, /status: "compatibility"/);
});

test("React skin editor uses canvases, compatible persistence, and package-owned UV profiles", async () => {
  const [editor, core] = await Promise.all([
    readFile(new URL("app/studio/humanoid/HumanoidSkinEditor.tsx", root), "utf8"),
    readFile(new URL("app/studio/humanoid/core.ts", root), "utf8"),
  ]);
  assert.match(editor, /voxl-humanoid-skin-draft-v1/);
  assert.match(editor, /<canvas/);
  assert.doesNotMatch(editor, /\.map\(.*pixel/i);
  assert.match(core, /packages\/engine-voxl-humanoid-skin\/src\/profiles\.mjs/);
  assert.doesNotMatch(core, /function buildRegions/);
});
