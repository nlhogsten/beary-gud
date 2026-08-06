import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("generation evaluation workspaces are wired without a production provider", async () => {
  const [rootPackage, runnerPackage, contractsPackage, cli] = await Promise.all([
    readJson("package.json"),
    readJson("apps/evaluation-runner/package.json"),
    readJson("packages/generation-provider-contracts/package.json"),
    readFile("apps/evaluation-runner/src/cli.ts", "utf8"),
  ]);
  assert.equal(runnerPackage.name, "@voxl/evaluation-runner");
  assert.equal(contractsPackage.name, "@voxl/generation-provider-contracts");
  assert.match(rootPackage.scripts.test, /apps\/evaluation-runner/);
  assert.match(rootPackage.scripts.test, /packages\/generation-provider-contracts/);
  assert.match(rootPackage.scripts.typecheck, /apps\/evaluation-runner/);
  assert.match(rootPackage.scripts["eval:check"], /evaluation-runner check/);
  assert.match(rootPackage.scripts["eval:adapters"], /evaluation-runner adapters/);
  assert.match(rootPackage.scripts["eval:replay"], /evaluation-runner replay/);
  assert.match(cli, /admittedProviderAdapters: \[\]/);
  assert.doesNotMatch(cli, /eval:run|command === "run"/);
});

test("fixed evaluation inputs meet the precommitted coverage floor", async () => {
  const [cases, rubric] = await Promise.all([
    readJson("evaluations/voxl-humanoid-skin/v1/cases.v1.json"),
    readJson("evaluations/voxl-humanoid-skin/v1/rubric.v1.json"),
  ]);
  assert.equal(cases.cases.length, 36);
  assert.equal(new Set(cases.cases.map((item) => item.id)).size, 36);
  assert.equal(cases.cases.filter((item) => item.profile === "wide-arm-64").length, 18);
  assert.equal(cases.cases.filter((item) => item.profile === "slim-arm-64").length, 18);
  assert.equal(cases.cases.filter((item) => item.mode === "revise").length, 4);
  assert.equal(cases.cases.filter((item) => item.references.length > 0).length, 18);
  const covered = new Set(cases.cases.flatMap((item) => item.categories));
  assert.deepEqual(cases.requiredCategories.filter((category) => !covered.has(category)), []);
  assert.ok(Math.abs(rubric.dimensions.reduce((sum, item) => sum + item.weight, 0) - 1) < 1e-9);
});

test("attempt evidence distinguishes offline replay from provider execution", async () => {
  const [schema, brief, contracts] = await Promise.all([
    readJson("evaluations/voxl-humanoid-skin/v1/attempt-record.schema.v1.json"),
    readFile("evaluations/voxl-humanoid-skin/v1/experiment-brief.md", "utf8"),
    readFile("packages/generation-provider-contracts/src/index.ts", "utf8"),
  ]);
  assert.deepEqual(schema.properties.execution.properties.kind.enum, ["artifact-replay", "provider"]);
  assert.ok(schema.properties.rawOutput.oneOf.some((item) => item.type === "null"));
  assert.match(brief, /excluded from every provider quality, latency, failure-rate, and cost aggregate/);
  assert.doesNotMatch(contracts, /humanoid|wide-arm|slim-arm|pixels/);
});
