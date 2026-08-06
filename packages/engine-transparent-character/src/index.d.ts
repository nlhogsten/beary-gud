import type {
  AssetEngine,
  ExportedArtifact,
  RenderedArtifact,
  ValidationResult,
} from "../../engine-contracts/src/index.mjs";

export type TransparentCharacterConfig = {
  name?: string;
  pixelScale?: number;
  fps?: number;
  loopDuration?: number;
  palette: Record<string, string>;
  animation?: {
    alternatingSymbols?: string[];
    frameCount?: number;
  };
};

export type TransparentCharacterDocument = {
  slug: string;
  directory: string;
  config: TransparentCharacterConfig;
  frames: string[][];
  files: string[];
};

export type CharacterGeometry = {
  width: number;
  height: number;
};

export type RasterImage = {
  width: number;
  height: number;
  data: Buffer;
};

export type LocalArtifact = RenderedArtifact & {
  path: string;
  profile?: string;
};

export type RenderCharacterResult = {
  ok: true;
  character: string;
  cells: CharacterGeometry;
  frames: number;
  exports: string;
  artifacts: LocalArtifact[];
};

export type TransparentCharacterOptions = {
  workspaceRoot?: string;
  ffmpegPath?: string;
};

export const DEFAULT_WORKSPACE_ROOT: string;
export const transparentCharacterDescriptor: Readonly<{
  id: "transparent-character";
  version: "1.0.0";
  title: "Transparent character";
  documentTypes: readonly ["voxl.transparent-character/v1"];
  inputTypes: readonly string[];
  outputFormats: readonly ["image/png", "video/quicktime"];
  capabilities: Readonly<{
    create: false;
    revise: false;
    validate: true;
    render: true;
    export: true;
    edit2d: true;
    edit3d: false;
    animate: true;
  }>;
}>;

export function loadCharacter(
  name: string,
  options?: Pick<TransparentCharacterOptions, "workspaceRoot">,
): Promise<TransparentCharacterDocument>;

export function validateCharacter(document: TransparentCharacterDocument): CharacterGeometry;

export function validateCharacterResult(
  document: TransparentCharacterDocument,
): ValidationResult & { geometry?: CharacterGeometry };

export function rasterizeCharacterFrame(
  frame: string[],
  config: TransparentCharacterConfig,
  offset?: number,
): RasterImage;

export function renderCharacter(
  document: TransparentCharacterDocument,
  options?: TransparentCharacterOptions,
): Promise<RenderCharacterResult>;

export function exportCharacter(
  document: TransparentCharacterDocument,
  profile: "png-sequence" | "contact-sheet" | "prores-alpha-cycle" | "prores-alpha-loop",
  options?: TransparentCharacterOptions,
): Promise<ExportedArtifact | (ExportedArtifact & { files: LocalArtifact[]; path: string })>;

export function importBashCharacter(
  file: string,
  name: string,
  options?: Pick<TransparentCharacterOptions, "workspaceRoot">,
): Promise<{
  ok: true;
  imported: string;
  character: string;
  sourceHash: string;
}>;

export function listCharacters(
  options?: Pick<TransparentCharacterOptions, "workspaceRoot">,
): Promise<string[]>;

export function createTransparentCharacterEngine(
  options?: TransparentCharacterOptions,
): AssetEngine<TransparentCharacterDocument>;
