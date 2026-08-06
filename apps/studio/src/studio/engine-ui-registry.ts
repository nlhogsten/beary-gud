import type { ComponentType } from "react";
import { HumanoidSkinEditor } from "./humanoid/HumanoidSkinEditor";
import { TransparentCharacterCompatibility } from "./TransparentCharacterCompatibility";

export type EngineUiId = "voxl-humanoid-skin" | "transparent-character";

export interface EngineUiRegistration {
  id: EngineUiId;
  label: string;
  description: string;
  status: "native" | "compatibility";
  Editor: ComponentType;
}

export const ENGINE_UI_REGISTRY: readonly EngineUiRegistration[] = [
  {
    id: "voxl-humanoid-skin",
    label: "Skin",
    description: "Cuboid humanoid",
    status: "native",
    Editor: HumanoidSkinEditor,
  },
  {
    id: "transparent-character",
    label: "Motion",
    description: "Transparent character",
    status: "compatibility",
    Editor: TransparentCharacterCompatibility,
  },
];

export function engineUi(engineId: EngineUiId): EngineUiRegistration {
  const registration = ENGINE_UI_REGISTRY.find((engine) => engine.id === engineId);
  if (!registration) throw new Error(`Unknown engine UI '${engineId}'.`);
  return registration;
}
