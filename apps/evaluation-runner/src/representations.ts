import {
  HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS,
  HumanoidSkinRepresentationError,
  createBlankHumanoidSkinDocument,
  createHumanoidSkinSelectionMask,
  decodeRgbaPng,
  encodeRgbaPng,
  getHumanoidSkinProfile,
  normalizeHumanoidSkinGenerationCandidate,
  renderHumanoidSkinGenerationRepresentation,
  validateHumanoidSkinDocument,
  type HumanoidSkinDocument,
  type HumanoidSkinGenerationRepresentationId,
  type HumanoidSkinProfileId,
} from "@voxl/engine-voxl-humanoid-skin";

const EVALUATION_PROFILES = ["wide-arm-64", "slim-arm-64"] as const;

type HarnessCheck = Readonly<{
  id: string;
  profile: HumanoidSkinProfileId;
  representationId: HumanoidSkinGenerationRepresentationId;
  kind: "creation-round-trip" | "revision-preservation" | "actionable-rejection";
  passed: boolean;
  detail: string;
}>;

export type OfflineRepresentationHarnessReport = Readonly<{
  schemaVersion: "voxl.offline-generation-representation-report/v1";
  ok: boolean;
  profiles: readonly HumanoidSkinProfileId[];
  representations: readonly HumanoidSkinGenerationRepresentationId[];
  creationRoundTrips: number;
  revisionPreservationChecks: number;
  actionableRejections: number;
  execution: Readonly<{
    providerAdapterUsed: false;
    networkUsed: false;
    credentialsRead: false;
    paidCall: false;
    entitlementUsed: false;
  }>;
  checks: readonly HarnessCheck[];
}>;

function paintFixture(document: HumanoidSkinDocument): void {
  const profile = getHumanoidSkinProfile(document.profile);
  profile.regions.forEach((region, index) => {
    if (region.layer === "outer" && index % 3 === 0) return;
    const rgba = [
      (index * 41 + 17) % 241,
      (index * 67 + 23) % 239,
      (index * 89 + 31) % 237,
      region.layer === "outer" && index % 4 === 0 ? 160 : 255,
    ];
    for (let y = region.y; y < region.y + region.height; y += 1) {
      for (let x = region.x; x < region.x + region.width; x += 1) {
        document.pixels.set(rgba, (y * document.width + x) * 4);
      }
    }
  });
}

function samePixels(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function expectedRevisionPixels(
  baseline: HumanoidSkinDocument,
  generated: HumanoidSkinDocument,
  editableMask: Uint8Array,
): Uint8Array {
  const expected = Buffer.from(baseline.pixels);
  for (let pixel = 0; pixel < editableMask.length; pixel += 1) {
    if (!editableMask[pixel]) continue;
    const offset = pixel * 4;
    expected.set(generated.pixels.subarray(offset, offset + 4), offset);
  }
  return expected;
}

function rejectionCode(callback: () => unknown): string | null {
  try {
    callback();
    return null;
  } catch (error) {
    return error instanceof HumanoidSkinRepresentationError ? error.code : null;
  }
}

export function verifyOfflineRepresentationHarness(): OfflineRepresentationHarnessReport {
  const checks: HarnessCheck[] = [];
  for (const profile of EVALUATION_PROFILES) {
    const baseline = createBlankHumanoidSkinDocument(profile, { baseColor: [20, 30, 40, 255] });
    const generated = createBlankHumanoidSkinDocument(profile, { baseColor: [31, 47, 61, 255] });
    paintFixture(generated);
    const editableMask = createHumanoidSkinSelectionMask(profile, [
      { part: "torso", layer: "base", face: "front" },
    ]);
    const protectedMask = createHumanoidSkinSelectionMask(profile, [
      { part: "head", layer: "base", face: "front" },
    ]);
    const immutableMask = createHumanoidSkinSelectionMask(profile, [
      { part: "head", layer: "base", face: "back" },
    ]);
    const expectedRevision = expectedRevisionPixels(baseline, generated, editableMask);

    for (const representationId of HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS) {
      const representation = renderHumanoidSkinGenerationRepresentation(generated, representationId);
      const creation = normalizeHumanoidSkinGenerationCandidate({
        representationId,
        profile,
        candidatePng: representation.template.bytes,
      });
      const creationPassed = samePixels(creation.document.pixels, generated.pixels)
        && validateHumanoidSkinDocument(creation.document).ok;
      checks.push({
        id: `${profile}:${representationId}:creation`,
        profile,
        representationId,
        kind: "creation-round-trip",
        passed: creationPassed,
        detail: creationPassed
          ? "Simulated provider pixels round-tripped exactly into a valid document."
          : "Simulated provider pixels did not round-trip exactly.",
      });

      const revision = normalizeHumanoidSkinGenerationCandidate({
        representationId,
        profile,
        candidatePng: representation.template.bytes,
        baselineDocument: baseline,
        editableMask,
        protectedMask,
        immutableMask,
      });
      const revisionPassed = samePixels(revision.document.pixels, expectedRevision)
        && revision.report.protectedChangedTexelsAfterComposite === 0
        && revision.report.immutableChangedTexelsAfterComposite === 0
        && validateHumanoidSkinDocument(revision.document).ok;
      checks.push({
        id: `${profile}:${representationId}:revision`,
        profile,
        representationId,
        kind: "revision-preservation",
        passed: revisionPassed,
        detail: revisionPassed
          ? "Only editable texels changed; protected and immutable texels remained exact."
          : "Revision compositing changed a protected texel or produced an invalid document.",
      });
    }

    const direct = renderHumanoidSkinGenerationRepresentation(generated, "direct-atlas-v1");
    const wrongDimensionsCode = rejectionCode(() => normalizeHumanoidSkinGenerationCandidate({
      representationId: direct.id,
      profile,
      candidatePng: encodeRgbaPng(512, 512, Buffer.alloc(512 * 512 * 4)),
    }));
    checks.push({
      id: `${profile}:direct-atlas-v1:dimensions`,
      profile,
      representationId: "direct-atlas-v1",
      kind: "actionable-rejection",
      passed: wrongDimensionsCode === "candidate_dimensions_invalid",
      detail: `Observed rejection code: ${wrongDimensionsCode ?? "none"}.`,
    });

    const sheet = renderHumanoidSkinGenerationRepresentation(generated, "surface-sheet-v1");
    const corrupted = decodeRgbaPng(sheet.template.bytes);
    const marker = sheet.layout.panels?.[0]?.marker;
    if (!marker) throw new Error("Surface-sheet layout is missing its first structural marker.");
    const markerOffset = (marker.y * corrupted.width + marker.x) * 4;
    corrupted.pixels[markerOffset] = (corrupted.pixels[markerOffset] ?? 0) ^ 0xff;
    const markerCode = rejectionCode(() => normalizeHumanoidSkinGenerationCandidate({
      representationId: sheet.id,
      profile,
      candidatePng: encodeRgbaPng(corrupted.width, corrupted.height, corrupted.pixels),
    }));
    checks.push({
      id: `${profile}:surface-sheet-v1:marker`,
      profile,
      representationId: "surface-sheet-v1",
      kind: "actionable-rejection",
      passed: markerCode === "surface_sheet_structure_changed",
      detail: `Observed rejection code: ${markerCode ?? "none"}.`,
    });
  }

  return Object.freeze({
    schemaVersion: "voxl.offline-generation-representation-report/v1",
    ok: checks.every((check) => check.passed),
    profiles: EVALUATION_PROFILES,
    representations: HUMANOID_SKIN_GENERATION_REPRESENTATION_IDS,
    creationRoundTrips: checks.filter((check) => check.kind === "creation-round-trip" && check.passed).length,
    revisionPreservationChecks: checks.filter((check) => check.kind === "revision-preservation" && check.passed).length,
    actionableRejections: checks.filter((check) => check.kind === "actionable-rejection" && check.passed).length,
    execution: Object.freeze({
      providerAdapterUsed: false,
      networkUsed: false,
      credentialsRead: false,
      paidCall: false,
      entitlementUsed: false,
    }),
    checks: Object.freeze(checks),
  });
}
