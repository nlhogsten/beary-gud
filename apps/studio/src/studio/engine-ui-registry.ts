import { lazy, type ComponentType } from "react";

const HumanoidSkinEditor = lazy(async () => {
  const module = await import("./humanoid/HumanoidSkinEditor");
  return { default: module.HumanoidSkinEditor };
});

const TransparentCharacterEditor = lazy(async () => {
  const module = await import("./transparent-character/TransparentCharacterEditor");
  return { default: module.TransparentCharacterEditor };
});

export type EngineUiId = "voxl-humanoid-skin" | "transparent-character";

export interface EngineUiRegistration {
  id: EngineUiId;
  label: string;
  description: string;
  status: "native";
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
    status: "native",
    Editor: TransparentCharacterEditor,
  },
];

export function engineUi(engineId: EngineUiId): EngineUiRegistration {
  const registration = ENGINE_UI_REGISTRY.find((engine) => engine.id === engineId);
  if (!registration) throw new Error(`Unknown engine UI '${engineId}'.`);
  return registration;
}
