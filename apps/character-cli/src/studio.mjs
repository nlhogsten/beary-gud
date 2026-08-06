#!/usr/bin/env node
import {
  importBashCharacter,
  listCharacters,
  loadCharacter,
  renderCharacter,
  validateCharacter,
} from "../../../packages/engine-transparent-character/src/index.mjs";

const [command, first, second] = process.argv.slice(2);

try {
  if (command === "render") {
    const document = await loadCharacter(first);
    const result = await renderCharacter(document);
    console.log(JSON.stringify({
      ok: result.ok,
      character: result.character,
      cells: result.cells,
      frames: result.frames,
      exports: result.exports,
    }, null, 2));
  } else if (command === "validate") {
    const document = await loadCharacter(first);
    console.log(JSON.stringify({ ok: true, character: first, ...validateCharacter(document) }));
  } else if (command === "import-bash") {
    console.log(JSON.stringify(await importBashCharacter(first, second), null, 2));
  } else if (command === "list") {
    console.log((await listCharacters()).join("\n"));
  } else {
    throw new Error("Usage: studio <render|validate|import-bash|list> ...");
  }
} catch (error) {
  console.error(`Studio error: ${error instanceof Error ? error.message : "Unknown error."}`);
  process.exitCode = 1;
}
