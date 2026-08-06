import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("quality runner is integrated into workspace gates", async () => {
  const [rootPackage, runnerPackage, gitignore] = await Promise.all([
    readJson("package.json"),
    readJson("apps/quality-runner/package.json"),
    readFile(".gitignore", "utf8"),
  ]);

  assert.equal(runnerPackage.name, "@voxl/quality-runner");
  assert.equal(runnerPackage.dependencies.playwright, "1.62.1");
  assert.match(rootPackage.scripts.typecheck, /apps\/quality-runner/);
  assert.match(rootPackage.scripts["qa:walkthrough"], /quality-runner walkthrough/);
  assert.match(rootPackage.scripts["qa:smoke"], /studio-smoke/);
  assert.match(gitignore, /^\.runs\/$/m);
});

test("browser journeys are valid, semantic, and target-neutral", async () => {
  const directory = "apps/quality-runner/journeys";
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();
  assert.deepEqual(filenames, [
    "humanoid-2d-3d.json",
    "humanoid-import-export.json",
    "studio-smoke.json",
    "transparent-edit-export.json",
  ]);

  const supportedActions = new Set([
    "navigate",
    "click",
    "fill",
    "select",
    "wait",
    "screenshot",
    "assert-visible",
    "canvas-click",
    "canvas-drag",
    "download",
    "upload",
  ]);
  const forbiddenBrands = new RegExp(["mine", "craft|mo", "jang"].join(""), "i");

  for (const filename of filenames) {
    const journey = await readJson(`${directory}/${filename}`);
    assert.equal(journey.id, filename.replace(/\.json$/, ""));
    assert.ok(journey.title.length > 0);
    assert.ok(journey.viewports.length > 0);
    assert.ok(journey.steps.length > 0);
    assert.equal(new Set(journey.steps.map((step) => step.id)).size, journey.steps.length);
    assert.doesNotMatch(JSON.stringify(journey), forbiddenBrands);

    for (const step of journey.steps) {
      assert.ok(supportedActions.has(step.action), `${filename}: ${step.action}`);
      assert.equal(step.required, true, `${filename}: ${step.id} must be explicit`);
      if (step.target) {
        assert.match(
          step.target,
          /^(role=|label=|text=|testid=|css=)/,
          `${filename}: ${step.id} should use a declared locator form`,
        );
      }
    }
  }
});

test("quality evidence and independent review contracts stay durable", async () => {
  const [runner, rubric] = await Promise.all([
    readFile("apps/quality-runner/src/runner.ts", "utf8"),
    readJson("apps/quality-runner/rubrics/voxl-studio-review.json"),
  ]);

  for (const artifact of [
    "state.json",
    "steps.jsonl",
    "errors.jsonl",
    "manifest.json",
    "report.md",
    "screenshots",
    "downloads",
  ]) {
    assert.match(runner, new RegExp(artifact.replace(".", "\\.")));
  }

  assert.equal(rubric.id, "voxl-studio-review");
  assert.ok(rubric.criteria.length >= 10);
  assert.ok(rubric.criteria.every((criterion) => criterion.id && criterion.pass));
  assert.ok(rubric.automaticFailureConditions.length >= 4);
  assert.match(rubric.reviewOutput.rule, /passes only when every required criterion/);
});

test("agent routers and matched skills preserve the VOXL workflow", async () => {
  const skillNames = [
    "add-voxl-engine",
    "run-voxl-generation-eval",
    "verify-voxl-studio",
  ];
  const [agents, claude] = await Promise.all([
    readFile("AGENTS.md", "utf8"),
    readFile("CLAUDE.md", "utf8"),
  ]);

  assert.match(agents, /docs\/VOXL_PROGRESS\.md/);
  assert.match(agents, /bun run check/);
  assert.match(claude, /docs\/VOXL_PROGRESS\.md/);
  assert.match(claude, /bun run check/);

  for (const name of skillNames) {
    const codexRoot = `.codex/skills/${name}`;
    const claudeRoot = `.claude/skills/${name}`;
    const [codexSkill, claudeSkill, codexReference, claudeReference, metadata] =
      await Promise.all([
        readFile(`${codexRoot}/SKILL.md`, "utf8"),
        readFile(`${claudeRoot}/SKILL.md`, "utf8"),
        readFile(`${codexRoot}/references/${
          name === "verify-voxl-studio"
            ? "evidence-contract.md"
            : name === "add-voxl-engine"
              ? "engine-checklist.md"
              : "evaluation-protocol.md"
        }`, "utf8"),
        readFile(`${claudeRoot}/references/${
          name === "verify-voxl-studio"
            ? "evidence-contract.md"
            : name === "add-voxl-engine"
              ? "engine-checklist.md"
              : "evaluation-protocol.md"
        }`, "utf8"),
        readFile(`${codexRoot}/agents/openai.yaml`, "utf8"),
      ]);

    assert.equal(codexSkill, claudeSkill);
    assert.equal(codexReference, claudeReference);
    assert.match(codexSkill, new RegExp(`^---\\nname: ${name}\\n`));
    assert.doesNotMatch(codexSkill, /TODO|\[TODO/);
    assert.match(metadata, new RegExp(`\\$${name}`));
    assert.match(metadata, /short_description: "[^"]{25,64}"/);
  }
});
