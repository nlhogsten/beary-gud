import { access, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const projectRoot = resolve(import.meta.dirname, "..");
for (const file of [
  "public/compatibility/index.html",
  "public/studio.js",
  "public/skin-editor.js",
  "public/skin-editor-core.js",
  "scripts/studio.mjs",
  "characters",
]) await access(resolve(projectRoot, file));
const characterNames = await readdir(resolve(projectRoot, "characters"));
if (!characterNames.length) throw new Error("Add at least one character source under characters/<name>/ before building.");
console.log("Local studio build is ready.");
