import { EngineRegistry } from "@voxl/engine-contracts";
import { createTransparentCharacterEngine } from "@voxl/engine-transparent-character";
import { createHumanoidSkinEngine } from "@voxl/engine-voxl-humanoid-skin";

export function createServerEngineRegistry() {
  return new EngineRegistry([
    createTransparentCharacterEngine(),
    createHumanoidSkinEngine(),
  ]);
}
