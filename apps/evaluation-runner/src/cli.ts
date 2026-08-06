import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluationReadiness,
  loadAndValidateSpecification,
  replayArtifact,
} from "./core.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const [command = "check", ...args] = process.argv.slice(2);

function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

if (command === "check") {
  const specification = await loadAndValidateSpecification(repoRoot);
  console.log(JSON.stringify(evaluationReadiness(specification), null, 2));
} else if (command === "adapters") {
  console.log(JSON.stringify({ admittedProviderAdapters: [], count: 0 }, null, 2));
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
