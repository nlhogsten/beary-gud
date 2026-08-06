import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluationReadiness,
  loadAndValidateSpecification,
  planEvaluationCase,
  replayArtifact,
} from "./core.ts";
import { loadProviderCatalog } from "./catalog.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const [command = "check", ...args] = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (command === "check") {
  const [specification, catalog] = await Promise.all([
    loadAndValidateSpecification(repoRoot),
    loadProviderCatalog(repoRoot),
  ]);
  console.log(JSON.stringify(evaluationReadiness(specification, catalog), null, 2));
} else if (command === "adapters") {
  const catalog = await loadProviderCatalog(repoRoot);
  console.log(JSON.stringify({
    providerCandidates: catalog.list(),
    cataloguedCount: catalog.list().length,
    provenanceAdmittedCount: catalog.listAdmitted().length,
    executableAdapterCount: 0,
  }, null, 2));
} else if (command === "plan") {
  const adapterId = option("--adapter");
  const caseId = option("--case");
  if (!adapterId || !caseId) throw new Error("plan requires --adapter and --case.");
  const [specification, catalog] = await Promise.all([
    loadAndValidateSpecification(repoRoot),
    loadProviderCatalog(repoRoot),
  ]);
  console.log(JSON.stringify(planEvaluationCase({ specification, catalog, adapterId, caseId }), null, 2));
} else if (command === "replay") {
  const caseId = option("--case");
  const candidatePath = option("--candidate");
  if (!caseId || !candidatePath) throw new Error("replay requires --case and --candidate.");
  const attemptId = option("--attempt-id") ?? `replay:${new Date().toISOString().replaceAll(":", "-")}`;
  const outputRoot = resolve(repoRoot, option("--output-root") ?? ".runs/evaluations");
  const result = await replayArtifact({
    repoRoot,
    outputRoot,
    attemptId,
    caseId,
    candidateBytes: await readFile(resolve(process.cwd(), candidatePath)),
  });
  console.log(JSON.stringify({
    warning: "Artifact replay proves the harness only; it is not a provider result.",
    attemptId,
    status: result.attempt.outcome.status,
    directory: result.directory,
  }, null, 2));
} else {
  throw new Error(`Unknown evaluation command '${command}'.`);
}
