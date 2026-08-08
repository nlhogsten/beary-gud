import {
  HUMANOID_SKIN_RENDER_PROGRAM_KIND,
  HumanoidSkinRenderProgramError,
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  describeHumanoidSkinRenderProgram,
  executeHumanoidSkinRenderProgram,
  getHumanoidSkinProfile,
  validateHumanoidSkinDocument,
  type HumanoidSkinDocument,
  type HumanoidSkinProfileId,
  type HumanoidSkinRenderProgram,
  type HumanoidSkinRenderProgramOperation,
  type HumanoidSkinRenderSurface,
} from "@voxl/engine-voxl-humanoid-skin";
import Ajv2020 from "ajv/dist/2020.js";

const EVALUATION_PROFILES = ["wide-arm-64", "slim-arm-64"] as const;

type ProgramCheck = Readonly<{
  id: string;
  profile: HumanoidSkinProfileId;
  kind: "contract" | "deterministic-creation" | "universal-addressability" | "revision-preservation" | "actionable-rejection";
  passed: boolean;
  detail: string;
}>;

export type OfflineRenderProgramHarnessReport = Readonly<{
  schemaVersion: "voxl.offline-render-program-report/v1";
  ok: boolean;
  programKind: typeof HUMANOID_SKIN_RENDER_PROGRAM_KIND;
  profiles: readonly HumanoidSkinProfileId[];
  contractChecks: number;
  deterministicCreationChecks: number;
  universalAddressabilityChecks: number;
  revisionPreservationChecks: number;
  actionableRejections: number;
  execution: Readonly<{
    providerAdapterUsed: false;
    networkUsed: false;
    credentialsRead: false;
    paidCall: false;
    entitlementUsed: false;
    arbitraryCodeExecuted: false;
  }>;
  checks: readonly ProgramCheck[];
}>;

function surface(part: HumanoidSkinRenderSurface["part"], layer: HumanoidSkinRenderSurface["layer"], face: HumanoidSkinRenderSurface["face"]): HumanoidSkinRenderSurface {
  return { part, layer, face };
}

function program(profile: HumanoidSkinProfileId, operations: HumanoidSkinRenderProgramOperation[]): HumanoidSkinRenderProgram {
  return { kind: HUMANOID_SKIN_RENDER_PROGRAM_KIND, formatVersion: 1, profile, operations };
}

function samePixels(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function onlyEditableChanged(baseline: HumanoidSkinDocument, candidate: HumanoidSkinDocument, mask: Uint8Array): boolean {
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * 4;
    const changed = candidate.pixels[offset] !== baseline.pixels[offset]
      || candidate.pixels[offset + 1] !== baseline.pixels[offset + 1]
      || candidate.pixels[offset + 2] !== baseline.pixels[offset + 2]
      || candidate.pixels[offset + 3] !== baseline.pixels[offset + 3];
    if (changed !== Boolean(mask[pixel])) return false;
  }
  return true;
}

export function verifyOfflineRenderProgramHarness(): OfflineRenderProgramHarnessReport {
  const checks: ProgramCheck[] = [];
  for (const profileId of EVALUATION_PROFILES) {
    const profile = getHumanoidSkinProfile(profileId);
    const contract = describeHumanoidSkinRenderProgram(profileId);
    const schemaFixture = program(profileId, [
      {
        op: "paint-surface-grid",
        surface: surface("right-leg", "base", "front"),
        palette: [[20, 30, 40, 255], [80, 90, 100, 255]],
        rows: Array.from(
          { length: 12 * profile.texelScale },
          (_, y) => Array.from({ length: 4 * profile.texelScale }, (_, x) => (x + y) % 2),
        ),
      },
      { op: "fill", surface: surface("head", "base", "front"), rgba: [1, 2, 3, 255] },
      {
        op: "paint-texels",
        surface: surface("head", "outer", "front"),
        texels: [{ x: 0, y: 0, rgba: [4, 5, 6, 128] }],
      },
      {
        op: "checker",
        surface: surface("torso", "base", "front"),
        colors: [[7, 8, 9, 255], [10, 11, 12, 255]],
        cellWidth: 1,
        cellHeight: 1,
      },
      {
        op: "stripes",
        surface: surface("right-arm", "base", "front"),
        colors: [[13, 14, 15, 255], [16, 17, 18, 255]],
        stripeWidth: 1,
        direction: "vertical",
      },
      {
        op: "copy-surface",
        from: surface("right-arm", "base", "front"),
        to: surface("left-arm", "base", "front"),
        transform: "mirror-x",
      },
    ]);
    const schemaAcceptsProfileProgram = new Ajv2020({ allErrors: true, strict: true })
      .compile(contract.jsonSchema)(schemaFixture);
    const contractPassed = contract.surfaces.length === profile.regions.length
      && contract.operations.some(({ op, role }) => op === "paint-surface-grid" && role === "primary")
      && contract.operations.some(({ op, role }) => op === "paint-texels" && role === "sparse-revision")
      && schemaAcceptsProfileProgram
      && contract.surfaces.every(({ id, width, height }) => {
        const region = profile.byKey[id];
        return region?.width === width && region.height === height;
      });
    checks.push({
      id: `${profileId}:contract`,
      profile: profileId,
      kind: "contract",
      passed: contractPassed,
      detail: contractPassed
        ? "Tool contract exposes every engine surface, dense pixel grids, and sparse texel correction in local coordinates."
        : "Tool contract is missing an engine surface or primary dense-pixel operation.",
    });

    const creationProgram = program(profileId, [
      { op: "fill", surface: surface("head", "base", "front"), rgba: [31, 61, 91, 255] },
      {
        op: "paint-surface-grid",
        surface: surface("torso", "base", "front"),
        palette: [[220, 80, 45, 255], [20, 45, 90, 255]],
        rows: Array.from(
          { length: 12 * profile.texelScale },
          (_, y) => Array.from({ length: 8 * profile.texelScale }, (_, x) => ((x * 3 + y * 5) % 7 < 3 ? 0 : 1)),
        ),
      },
      {
        op: "paint-texels",
        surface: surface("head", "outer", "front"),
        texels: [{ x: 2 * profile.texelScale, y: 2 * profile.texelScale, rgba: [40, 230, 170, 192] }],
      },
    ]);
    const first = executeHumanoidSkinRenderProgram({ program: creationProgram });
    const second = executeHumanoidSkinRenderProgram({ program: creationProgram });
    const creationPassed = first.programSha256 === second.programSha256
      && samePixels(first.document.pixels, second.document.pixels)
      && validateHumanoidSkinDocument(first.document).ok;
    checks.push({
      id: `${profileId}:deterministic-creation`,
      profile: profileId,
      kind: "deterministic-creation",
      passed: creationPassed,
      detail: creationPassed
        ? "The same program produced byte-identical valid pixels and provenance hashes."
        : "Repeated execution was not deterministic or valid.",
    });

    const expected = createBlankHumanoidSkinDocument(profileId);
    const universalOperations: HumanoidSkinRenderProgramOperation[] = profile.regions.map((region, regionIndex) => {
      const palette: [number, number, number, number][] = [];
      const paletteIndexes = new Map<string, number>();
      const rows = Array.from({ length: region.height }, (_, y) => Array.from({ length: region.width }, (_, x) => {
        const index = y * region.width + x;
        const rgba: [number, number, number, number] = [
          (regionIndex * 43 + x * 7) % 256,
          (regionIndex * 17 + y * 13) % 256,
          (regionIndex * 29 + x * 3 + y * 5) % 256,
          region.layer === "base" ? 255 : (regionIndex * 31 + index) % 256,
        ];
        const key = rgba.join(",");
        if (!paletteIndexes.has(key)) {
          paletteIndexes.set(key, palette.length);
          palette.push(rgba);
        }
        expected.pixels.set(rgba, ((region.y + y) * profile.width + region.x + x) * 4);
        return paletteIndexes.get(key) ?? 0;
      }));
      return {
        op: "paint-surface-grid",
        surface: surface(region.part, region.layer, region.face),
        palette,
        rows,
      };
    });
    const universal = executeHumanoidSkinRenderProgram({ program: program(profileId, universalOperations) });
    const universalPassed = samePixels(universal.document.pixels, expected.pixels)
      && validateHumanoidSkinDocument(universal.document).ok;
    checks.push({
      id: `${profileId}:universal-addressability`,
      profile: profileId,
      kind: "universal-addressability",
      passed: universalPassed,
      detail: universalPassed
        ? "Arbitrary fixture RGBA values were reproduced at every mapped texel."
        : "At least one mapped texel could not be expressed exactly.",
    });

    const baseline = createBlankHumanoidSkinDocument(profileId, { baseColor: [12, 24, 36, 255] });
    const editableMask = createHumanoidSkinSelectionMask(profileId, [
      { part: "torso", layer: "base", face: "front" },
    ]);
    const protectedMask = createHumanoidSkinSelectionMask(profileId, [
      { part: "head", layer: "base", face: "front" },
    ]);
    const immutableMask = createHumanoidSkinSelectionMask(profileId, [
      { part: "head", layer: "base", face: "back" },
    ]);
    const revision = executeHumanoidSkinRenderProgram({
      program: program(profileId, [
        { op: "fill", surface: surface("torso", "base", "front"), rgba: [90, 120, 210, 255] },
        { op: "fill", surface: surface("head", "base", "front"), rgba: [210, 10, 10, 255] },
        { op: "fill", surface: surface("head", "base", "back"), rgba: [10, 210, 10, 255] },
      ]),
      baselineDocument: baseline,
      editableMask,
      protectedMask,
      immutableMask,
    });
    const revisionPassed = onlyEditableChanged(baseline, revision.document, editableMask)
      && revision.report.protectedChangedTexelsBeforeComposite > 0
      && revision.report.immutableChangedTexelsBeforeComposite > 0
      && revision.report.protectedChangedTexelsAfterComposite === 0
      && revision.report.immutableChangedTexelsAfterComposite === 0;
    checks.push({
      id: `${profileId}:revision-preservation`,
      profile: profileId,
      kind: "revision-preservation",
      passed: revisionPassed,
      detail: revisionPassed
        ? "Non-editable, protected, and immutable texels were restored exactly."
        : "Revision execution changed a texel outside the editable mask.",
    });

    let rejectionCode: string | null = null;
    try {
      executeHumanoidSkinRenderProgram({
        program: program(profileId, [{ op: "run-code" } as unknown as HumanoidSkinRenderProgramOperation]),
      });
    } catch (error) {
      rejectionCode = error instanceof HumanoidSkinRenderProgramError ? error.code : null;
    }
    checks.push({
      id: `${profileId}:actionable-rejection`,
      profile: profileId,
      kind: "actionable-rejection",
      passed: rejectionCode === "render_program_invalid",
      detail: `Unknown code-like operation rejection: ${rejectionCode ?? "none"}.`,
    });
  }

  const passed = (kind: ProgramCheck["kind"]): number => checks.filter((check) => check.kind === kind && check.passed).length;
  return Object.freeze({
    schemaVersion: "voxl.offline-render-program-report/v1",
    ok: checks.every((check) => check.passed),
    programKind: HUMANOID_SKIN_RENDER_PROGRAM_KIND,
    profiles: EVALUATION_PROFILES,
    contractChecks: passed("contract"),
    deterministicCreationChecks: passed("deterministic-creation"),
    universalAddressabilityChecks: passed("universal-addressability"),
    revisionPreservationChecks: passed("revision-preservation"),
    actionableRejections: passed("actionable-rejection"),
    execution: Object.freeze({
      providerAdapterUsed: false,
      networkUsed: false,
      credentialsRead: false,
      paidCall: false,
      entitlementUsed: false,
      arbitraryCodeExecuted: false,
    }),
    checks: Object.freeze(checks),
  });
}
