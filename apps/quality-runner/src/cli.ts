#!/usr/bin/env bun

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runWalkthrough } from "./runner.ts";

interface CliOptions {
  journeyId: string;
  baseUrl?: string;
  headed: boolean;
}

const USAGE = `Usage:
  bun run --cwd apps/quality-runner walkthrough <journey> [--base-url URL] [--headed]

Examples:
  bun run --cwd apps/quality-runner walkthrough studio-smoke
  bun run --cwd apps/quality-runner walkthrough humanoid-2d-3d --base-url http://127.0.0.1:5740
`;

function parseArguments(args: string[]): CliOptions {
  if (args[0] !== "walkthrough") throw new Error(USAGE);
  const journeyId = args[1];
  if (!journeyId || !/^[a-z0-9][a-z0-9_-]*$/i.test(journeyId)) {
    throw new Error(`Journey must be a safe journey ID.\n\n${USAGE}`);
  }

  let baseUrl: string | undefined;
  let headed = false;
  for (let index = 2; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--headed") {
      headed = true;
      continue;
    }
    if (argument === "--base-url") {
      const value = args[index + 1];
      if (!value) throw new Error("--base-url requires a URL.");
      try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        throw new Error(`Invalid --base-url value: ${value}`);
      }
      baseUrl = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n\n${USAGE}`);
  }

  return { journeyId, headed, ...(baseUrl ? { baseUrl } : {}) };
}

async function main(): Promise<void> {
  const cli = parseArguments(process.argv.slice(2));
  const sourceDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
  const appDirectory = resolve(sourceDirectory, "..");
  const repoRoot = resolve(appDirectory, "../..");
  const journeyPath = resolve(appDirectory, "journeys", `${cli.journeyId}.json`);
  const result = await runWalkthrough({
    repoRoot,
    journeyPath,
    baseUrl: cli.baseUrl ?? process.env.VOXL_BASE_URL,
    headed: cli.headed,
  });

  console.log(`Quality run: ${result.state.status}`);
  console.log(`Evidence: ${result.runDirectory}`);
  console.log(
    `Steps: ${result.state.totals.passed} passed, ${result.state.totals.failed} failed; runtime errors: ${result.state.totals.runtimeErrors}`,
  );
  if (result.state.status !== "passed") process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
