import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  GenerationProviderCatalog,
  type GenerationProviderManifest,
  type ProviderProvenanceDossier,
} from "@voxl/generation-provider-contracts";
import { canonicalJson, EVALUATION_RELATIVE_ROOT } from "./core.ts";

type JsonObject = Record<string, unknown>;

async function readJson(path: string): Promise<JsonObject> {
  return JSON.parse(await readFile(path, "utf8")) as JsonObject;
}

function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export async function loadProviderCatalog(repoRoot: string): Promise<GenerationProviderCatalog> {
  const evaluationRoot = join(repoRoot, EVALUATION_RELATIVE_ROOT);
  const providersRoot = join(evaluationRoot, "providers");
  const [manifestSchema, dossierSchema, providerFiles] = await Promise.all([
    readJson(join(evaluationRoot, "provider-manifest.schema.v1.json")),
    readJson(join(evaluationRoot, "provider-provenance-dossier.schema.v1.json")),
    readdir(providersRoot),
  ]);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateManifest = ajv.compile(manifestSchema);
  const validateDossier = ajv.compile(dossierSchema);
  const catalog = new GenerationProviderCatalog();

  for (const manifestName of providerFiles.filter((name) => name.endsWith(".manifest.v1.json")).sort()) {
    const manifest = await readJson(join(providersRoot, manifestName)) as unknown as GenerationProviderManifest;
    if (!validateManifest(manifest)) {
      throw new Error(`Provider manifest '${manifestName}' failed schema validation: ${ajv.errorsText(validateManifest.errors)}`);
    }
    const dossierPath = resolve(providersRoot, manifest.provenanceDossier.path);
    if (dirname(dossierPath) !== resolve(providersRoot) || relative(providersRoot, dossierPath).startsWith("..")) {
      throw new Error(`Provider manifest '${manifestName}' references a dossier outside the provider catalog.`);
    }
    const dossier = await readJson(dossierPath) as unknown as ProviderProvenanceDossier;
    if (!validateDossier(dossier)) {
      throw new Error(
        `Provider dossier '${manifest.provenanceDossier.path}' failed schema validation: ${ajv.errorsText(validateDossier.errors)}`,
      );
    }
    catalog.register({
      manifest,
      dossier,
      observedConfigurationSha256: canonicalSha256(manifest.configuration),
      observedDossierSha256: canonicalSha256(dossier),
    });
  }

  return catalog;
}
