import {
  appendFile,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type { Locator, Page } from "playwright";
import {
  parseCanvasClickPosition,
  parseCanvasDragPosition,
} from "./coordinates.ts";
import { pageContainmentIssue } from "./containment.ts";
import { loadJourney } from "./journey.ts";
import { buildReport } from "./report.ts";
import type {
  JourneyStep,
  RunOptions,
  RunResult,
  RunState,
  RuntimeErrorEvidence,
  StepEvidence,
} from "./types.ts";

const RUN_SCHEMA_VERSION = 1;
const DEFAULT_BASE_URL = "http://127.0.0.1:5740";
const DEFAULT_TIMEOUT_MS = 10_000;

function isoTimestamp(): string {
  return new Date().toISOString();
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function fileTimestamp(value: string): string {
  return value.replaceAll(":", "-").replaceAll(".", "-");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolvePageUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function isIgnoredError(
  error: Omit<RuntimeErrorEvidence, "viewport" | "ignored">,
  patterns: string[],
): boolean {
  const subject = `${error.message}\n${error.url ?? ""}`;
  return patterns.some((pattern) => {
    try {
      return new RegExp(pattern, "i").test(subject);
    } catch {
      return subject.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

function locatorFor(page: Page, target: string): Locator {
  const roleMatch = target.match(
    /^role=([a-z][a-z0-9-]*)(?:\[name=(?:"([^"]*)"|'([^']*)'|([^\]]+))\])?$/i,
  );
  if (roleMatch?.[1]) {
    const role = roleMatch[1] as Parameters<Page["getByRole"]>[0];
    const name = roleMatch[2] ?? roleMatch[3] ?? roleMatch[4];
    return name === undefined
      ? page.getByRole(role)
      : page.getByRole(role, { name, exact: false });
  }

  if (target.startsWith("label=")) {
    return page.getByLabel(target.slice("label=".length));
  }
  if (target.startsWith("text=")) {
    return page.getByText(target.slice("text=".length), { exact: false });
  }
  if (target.startsWith("testid=")) {
    return page.getByTestId(target.slice("testid=".length));
  }
  if (target.startsWith("css=")) {
    return page.locator(target.slice("css=".length));
  }
  return page.locator(target);
}

function requireTarget(step: JourneyStep): string {
  if (!step.target) throw new Error(`${step.action} requires a target.`);
  return step.target;
}

function requireValue(step: JourneyStep): string {
  if (step.value === undefined) throw new Error(`${step.action} requires a value.`);
  return step.value;
}

function cleanDownloadName(value: string): string {
  const cleaned = basename(value).replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error("Download filename is not safe.");
  }
  return cleaned;
}

async function executeStep(
  page: Page,
  step: JourneyStep,
  baseUrl: string,
  downloadsDirectory: string,
): Promise<{ observed: string; download?: string }> {
  const timeout = step.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  switch (step.action) {
    case "navigate": {
      if (!step.path) throw new Error("navigate requires path.");
      const url = resolvePageUrl(baseUrl, step.path);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      return { observed: `Navigated to ${page.url()}.` };
    }
    case "click": {
      const target = requireTarget(step);
      await locatorFor(page, target).click({ timeout });
      return { observed: `Clicked ${target}.` };
    }
    case "press": {
      const target = requireTarget(step);
      const key = requireValue(step);
      await locatorFor(page, target).press(key, { timeout });
      return { observed: `Pressed ${key} on ${target}.` };
    }
    case "fill": {
      const target = requireTarget(step);
      await locatorFor(page, target).fill(requireValue(step), { timeout });
      return { observed: `Filled ${target}.` };
    }
    case "select": {
      const target = requireTarget(step);
      await locatorFor(page, target).selectOption(requireValue(step), { timeout });
      return { observed: `Selected ${requireValue(step)} in ${target}.` };
    }
    case "wait": {
      if (step.target) {
        const state = ["attached", "detached", "visible", "hidden"].includes(
          step.expected ?? "",
        )
          ? (step.expected as "attached" | "detached" | "visible" | "hidden")
          : "visible";
        await locatorFor(page, step.target).waitFor({ state, timeout });
        return { observed: `Waited for ${step.target} to be ${state}.` };
      }
      if (step.path) {
        await page.waitForURL(resolvePageUrl(baseUrl, step.path), { timeout });
        return { observed: `Waited for URL ${page.url()}.` };
      }
      await page.waitForLoadState("domcontentloaded", { timeout });
      return { observed: "Document reached the DOM content loaded state." };
    }
    case "screenshot":
      return { observed: "Captured the requested screenshot." };
    case "assert-visible": {
      const target = requireTarget(step);
      await locatorFor(page, target).waitFor({ state: "visible", timeout });
      return { observed: `${target} is visible.` };
    }
    case "assert-hidden": {
      const target = requireTarget(step);
      await locatorFor(page, target).waitFor({ state: "hidden", timeout });
      return { observed: `${target} is hidden or absent.` };
    }
    case "assert-page-contained": {
      const measurement = await page.evaluate(() => ({
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body?.scrollWidth ?? 0,
      }));
      const issue = pageContainmentIssue(measurement);
      if (issue) throw new Error(issue);
      return {
        observed: `Page content is contained within the ${measurement.viewportWidth}px viewport.`,
      };
    }
    case "canvas-click": {
      const target = requireTarget(step);
      const canvas = locatorFor(page, target);
      await canvas.waitFor({ state: "visible", timeout });
      const box = await canvas.boundingBox();
      if (!box) throw new Error(`Could not measure visible canvas ${target}.`);
      const { xRatio, yRatio } = parseCanvasClickPosition(requireValue(step));
      await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
      return {
        observed: `Clicked ${target} at normalized position ${xRatio},${yRatio}.`,
      };
    }
    case "canvas-drag": {
      const target = requireTarget(step);
      const canvas = locatorFor(page, target);
      await canvas.waitFor({ state: "visible", timeout });
      const box = await canvas.boundingBox();
      if (!box) throw new Error(`Could not measure visible canvas ${target}.`);
      const {
        startXRatio,
        startYRatio,
        endXRatio,
        endYRatio,
      } = parseCanvasDragPosition(requireValue(step));
      const start = {
        x: box.x + box.width * startXRatio,
        y: box.y + box.height * startYRatio,
      };
      const end = {
        x: box.x + box.width * endXRatio,
        y: box.y + box.height * endYRatio,
      };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      try {
        await page.mouse.move(end.x, end.y, { steps: 12 });
      } finally {
        await page.mouse.up();
      }
      return {
        observed: `Dragged ${target} from normalized position ${startXRatio},${startYRatio} to ${endXRatio},${endYRatio}.`,
      };
    }
    case "download": {
      const target = requireTarget(step);
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout }),
        locatorFor(page, target).click({ timeout }),
      ]);
      const suggestedFilename = cleanDownloadName(download.suggestedFilename());
      const filename = cleanDownloadName(step.value ?? suggestedFilename);
      if (step.value && suggestedFilename !== filename) {
        throw new Error(
          `Expected download filename ${filename}, but the application suggested ${suggestedFilename}.`,
        );
      }
      const absolutePath = join(downloadsDirectory, filename);
      await download.saveAs(absolutePath);
      const downloadStat = await stat(absolutePath);
      if (downloadStat.size === 0) {
        throw new Error(`Downloaded file ${filename} is empty.`);
      }
      return {
        observed: `Downloaded ${filename} (${downloadStat.size} bytes).`,
        download: `downloads/${filename}`,
      };
    }
    case "upload": {
      const target = requireTarget(step);
      const filename = cleanDownloadName(requireValue(step));
      const fixturePath = join(downloadsDirectory, filename);
      const fixtureStat = await stat(fixturePath);
      if (!fixtureStat.isFile()) {
        throw new Error(`Same-run download is not a file: ${filename}`);
      }
      await locatorFor(page, target).setInputFiles(fixturePath, { timeout });
      return {
        observed: `Uploaded same-run download ${filename} (${fixtureStat.size} bytes).`,
      };
    }
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runWalkthrough(options: RunOptions): Promise<RunResult> {
  const journey = await loadJourney(options.journeyPath);
  const startedAt = isoTimestamp();
  const runId = `quality-${fileTimestamp(startedAt)}-${safeSlug(journey.id)}`;
  const runDirectory = join(options.repoRoot, ".runs", runId);
  const screenshotsDirectory = join(runDirectory, "screenshots");
  const downloadsDirectory = join(runDirectory, "downloads");
  const statePath = join(runDirectory, "state.json");
  const stepsPath = join(runDirectory, "steps.jsonl");
  const errorsPath = join(runDirectory, "errors.jsonl");
  const manifestPath = join(runDirectory, "manifest.json");
  const reportPath = join(runDirectory, "report.md");
  const baseUrl = options.baseUrl ?? journey.baseUrl ?? DEFAULT_BASE_URL;
  const steps: StepEvidence[] = [];
  const errors: RuntimeErrorEvidence[] = [];
  let errorWriteQueue: Promise<void> = Promise.resolve();

  await mkdir(screenshotsDirectory, { recursive: true });
  await mkdir(downloadsDirectory, { recursive: true });
  await writeFile(stepsPath, "", "utf8");
  await writeFile(errorsPath, "", "utf8");

  const state: RunState = {
    schemaVersion: RUN_SCHEMA_VERSION,
    runId,
    journeyId: journey.id,
    status: "running",
    startedAt,
    updatedAt: startedAt,
    totals: {
      steps: 0,
      passed: 0,
      failed: 0,
      requiredFailed: 0,
      runtimeErrors: 0,
      ignoredRuntimeErrors: 0,
    },
  };

  const manifest = {
    schemaVersion: RUN_SCHEMA_VERSION,
    runId,
    journey: {
      id: journey.id,
      title: journey.title,
      source: relative(options.repoRoot, options.journeyPath),
      definition: JSON.parse(await readFile(options.journeyPath, "utf8")) as unknown,
    },
    configuration: {
      baseUrl,
      headed: options.headed,
      viewports: journey.viewports,
    },
    files: {
      state: "state.json",
      steps: "steps.jsonl",
      errors: "errors.jsonl",
      report: "report.md",
      screenshots: "screenshots/",
      downloads: "downloads/",
    },
    startedAt,
    finishedAt: null as string | null,
  };

  await writeJson(statePath, state);
  await writeJson(manifestPath, manifest);

  const recordRuntimeError = (
    viewport: string,
    value: Omit<RuntimeErrorEvidence, "viewport" | "ignored">,
  ): void => {
    const ignored = isIgnoredError(value, journey.ignoredErrorPatterns ?? []);
    const evidence: RuntimeErrorEvidence = { viewport, ...value, ignored };
    errors.push(evidence);
    if (ignored) state.totals.ignoredRuntimeErrors += 1;
    else state.totals.runtimeErrors += 1;
    errorWriteQueue = errorWriteQueue.then(() =>
      appendFile(errorsPath, `${JSON.stringify(evidence)}\n`, "utf8"),
    );
  };

  let browser: Awaited<ReturnType<(typeof import("playwright"))["chromium"]["launch"]>> | undefined;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: !options.headed });

    for (const viewport of journey.viewports ?? []) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile ?? false,
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        acceptDownloads: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

      page.on("console", (message) => {
        if (message.type() !== "error") return;
        recordRuntimeError(viewport.name, {
          kind: "console",
          message: message.text(),
          timestamp: isoTimestamp(),
        });
      });
      page.on("pageerror", (error) => {
        recordRuntimeError(viewport.name, {
          kind: "page",
          message: error.message,
          timestamp: isoTimestamp(),
        });
      });
      page.on("requestfailed", (request) => {
        recordRuntimeError(viewport.name, {
          kind: "request",
          message: request.failure()?.errorText ?? "Request failed.",
          url: request.url(),
          timestamp: isoTimestamp(),
        });
      });
      page.on("response", (response) => {
        if (response.status() < 400) return;
        recordRuntimeError(viewport.name, {
          kind: "response",
          message: `${response.status()} ${response.statusText()}`,
          url: response.url(),
          status: response.status(),
          timestamp: isoTimestamp(),
        });
      });

      for (const step of journey.steps) {
        const sequence = steps.length + 1;
        const stepStartedAt = isoTimestamp();
        const stepStartedMs = Date.now();
        const screenshotLabel =
          step.action === "screenshot" && step.value ? step.value : step.id;
        const screenshotName = `${String(sequence).padStart(3, "0")}-${safeSlug(viewport.name)}-${safeSlug(screenshotLabel)}.png`;
        const screenshotRelativePath = `screenshots/${screenshotName}`;
        const screenshotAbsolutePath = join(screenshotsDirectory, screenshotName);
        state.current = { viewport: viewport.name, stepId: step.id, sequence };
        state.updatedAt = stepStartedAt;
        await writeJson(statePath, state);

        let result: StepEvidence;
        try {
          const observation = await executeStep(
            page,
            step,
            baseUrl,
            downloadsDirectory,
          );
          await page.screenshot({
            path: screenshotAbsolutePath,
            fullPage: step.action === "screenshot" && step.value === "full-page",
          });
          const finishedAt = isoTimestamp();
          result = {
            viewport: viewport.name,
            sequence,
            id: step.id,
            title: step.title,
            action: step.action,
            ...(step.target ? { target: step.target } : {}),
            ...(step.expected ? { expected: step.expected } : {}),
            required: step.required !== false,
            status: "passed",
            startedAt: stepStartedAt,
            finishedAt,
            durationMs: Date.now() - stepStartedMs,
            screenshot: screenshotRelativePath,
            observed: observation.observed,
            ...(observation.download ? { download: observation.download } : {}),
          };
        } catch (error) {
          let failureScreenshot: string | undefined;
          try {
            await page.screenshot({ path: screenshotAbsolutePath, fullPage: true });
            failureScreenshot = screenshotRelativePath;
          } catch {
            // A closed or crashed page cannot provide failure evidence.
          }
          const finishedAt = isoTimestamp();
          result = {
            viewport: viewport.name,
            sequence,
            id: step.id,
            title: step.title,
            action: step.action,
            ...(step.target ? { target: step.target } : {}),
            ...(step.expected ? { expected: step.expected } : {}),
            required: step.required !== false,
            status: "failed",
            startedAt: stepStartedAt,
            finishedAt,
            durationMs: Date.now() - stepStartedMs,
            ...(failureScreenshot ? { screenshot: failureScreenshot } : {}),
            error: formatError(error),
          };
        }

        steps.push(result);
        state.totals.steps += 1;
        if (result.status === "passed") state.totals.passed += 1;
        else {
          state.totals.failed += 1;
          if (result.required) state.totals.requiredFailed += 1;
        }
        state.updatedAt = isoTimestamp();
        await appendFile(stepsPath, `${JSON.stringify(result)}\n`, "utf8");
        await writeJson(statePath, state);
      }

      await context.close();
    }
  } catch (error) {
    recordRuntimeError("runner", {
      kind: "runner",
      message: formatError(error),
      timestamp: isoTimestamp(),
    });
  } finally {
    await browser?.close();
    await errorWriteQueue;
  }

  const finishedAt = isoTimestamp();
  state.status =
    state.totals.requiredFailed > 0 || state.totals.runtimeErrors > 0
      ? "failed"
      : "passed";
  state.finishedAt = finishedAt;
  state.updatedAt = finishedAt;
  delete state.current;
  manifest.finishedAt = finishedAt;
  await writeJson(statePath, state);
  await writeJson(manifestPath, manifest);
  await writeFile(reportPath, buildReport(journey, state, steps, errors), "utf8");

  return { runDirectory, state, steps, errors };
}
