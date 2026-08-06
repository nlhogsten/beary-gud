import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("shared shell loads independent editor modules and storage boundaries", async () => {
  const [html, motionModule, skinModule] = await Promise.all([
    readFile(new URL("public/compatibility/index.html", root), "utf8"),
    readFile(new URL("public/studio.js", root), "utf8"),
    readFile(new URL("public/skin-editor.js", root), "utf8"),
  ]);
  assert.match(html, /data-engine-panel="transparent-character"/);
  assert.match(html, /data-engine-panel="voxl-humanoid-skin"/);
  assert.match(html, /src="\/studio\.js"/);
  assert.match(html, /src="\/skin-editor\.js"/);
  assert.match(motionModule, /transparent-character-studio-drafts-v1/);
  assert.match(skinModule, /voxl-humanoid-skin-draft-v1/);
  assert.doesNotMatch(motionModule, /voxl-humanoid-skin-draft-v1/);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "shared shell must not contain duplicate element IDs");
});
