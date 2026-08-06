import type {
  Journey,
  RunState,
  RuntimeErrorEvidence,
  StepEvidence,
} from "./types.ts";

function tableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function buildReport(
  journey: Journey,
  state: RunState,
  steps: StepEvidence[],
  errors: RuntimeErrorEvidence[],
): string {
  const lines = [
    `# ${journey.title}`,
    "",
    journey.description ?? `Automated walkthrough evidence for \`${journey.id}\`.`,
    "",
    `- Run: \`${state.runId}\``,
    `- Status: **${state.status.toUpperCase()}**`,
    `- Started: ${state.startedAt}`,
    `- Finished: ${state.finishedAt ?? "in progress"}`,
    `- Steps: ${state.totals.passed} passed, ${state.totals.failed} failed`,
    `- Runtime errors: ${state.totals.runtimeErrors} actionable, ${state.totals.ignoredRuntimeErrors} ignored`,
    "",
    "## Steps",
    "",
    "| Viewport | Step | Action | Required | Result | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const step of steps) {
    const evidence = step.screenshot
      ? `[screenshot](${encodeURI(step.screenshot)})`
      : step.download
        ? `[download](${encodeURI(step.download)})`
        : "—";
    lines.push(
      `| ${tableCell(step.viewport)} | ${tableCell(step.title)} | \`${step.action}\` | ${step.required ? "yes" : "no"} | ${step.status} | ${evidence} |`,
    );
    if (step.error) {
      lines.push("", `> ${tableCell(step.error)}`, "");
    }
  }

  lines.push("", "## Runtime observations", "");
  if (errors.length === 0) {
    lines.push("No browser runtime errors were observed.");
  } else {
    lines.push(
      "| Viewport | Kind | Ignored | Observation |",
      "| --- | --- | --- | --- |",
    );
    for (const error of errors) {
      lines.push(
        `| ${tableCell(error.viewport)} | ${error.kind} | ${error.ignored ? "yes" : "no"} | ${tableCell(error.message)} |`,
      );
    }
  }

  lines.push(
    "",
    "## Interpretation",
    "",
    state.status === "passed"
      ? "All required steps passed and no actionable runtime errors were captured."
      : "This run is intentionally marked failed because a required step failed or an actionable runtime error was captured. Review the evidence above before changing product progress status.",
    "",
  );

  return lines.join("\n");
}
