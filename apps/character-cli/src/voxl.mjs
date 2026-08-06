#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  EngineContractError,
  EngineRegistry,
} from "../../../packages/engine-contracts/src/index.mjs";
import {
  createTransparentCharacterEngine,
} from "../../../packages/engine-transparent-character/src/index.mjs";
import {
  createHumanoidSkinEngine,
} from "../../../packages/engine-voxl-humanoid-skin/src/index.mjs";

export function createLocalEngineRegistry(options = {}) {
  return new EngineRegistry([
    createTransparentCharacterEngine(options),
    createHumanoidSkinEngine(),
  ]);
}

async function readRequest(path) {
  if (!path) throw new Error("A JSON request file is required.");
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

export async function runVoxlCli(args, { registry = createLocalEngineRegistry() } = {}) {
  const [command, engineId, operation, requestPath] = args;
  if (command === "engines") return registry.list();
  if (command === "describe") return registry.getDescriptor(engineId);
  if (command === "invoke") {
    return registry.invoke(engineId, operation, await readRequest(requestPath));
  }
  throw new Error("Usage: voxl <engines|describe ENGINE|invoke ENGINE OPERATION REQUEST.json>");
}

function publicError(error) {
  if (error instanceof EngineContractError) return error.toJSON();
  return {
    name: "VoxlCliError",
    code: "invalid_cli_request",
    message: "The CLI request could not be processed. Check the command and JSON request file.",
    details: {},
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try {
    console.log(JSON.stringify(await runVoxlCli(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(JSON.stringify(publicError(error), null, 2));
    process.exitCode = 1;
  }
}
