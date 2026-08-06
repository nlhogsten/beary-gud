import { readFile } from "node:fs/promises";
import {
  SUPPORTED_ACTIONS,
  type Journey,
  type JourneyAction,
  type JourneyStep,
  type JourneyViewport,
} from "./types.ts";

const DEFAULT_VIEWPORT: JourneyViewport = {
  name: "desktop",
  width: 1440,
  height: 1000,
};

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return assertString(value, field);
}

function parseViewport(value: unknown, index: number): JourneyViewport {
  if (!value || typeof value !== "object") {
    throw new Error(`viewports[${index}] must be an object.`);
  }

  const candidate = value as Record<string, unknown>;
  const width = candidate.width;
  const height = candidate.height;
  if (!Number.isInteger(width) || Number(width) <= 0) {
    throw new Error(`viewports[${index}].width must be a positive integer.`);
  }
  if (!Number.isInteger(height) || Number(height) <= 0) {
    throw new Error(`viewports[${index}].height must be a positive integer.`);
  }

  return {
    name: assertString(candidate.name, `viewports[${index}].name`),
    width: Number(width),
    height: Number(height),
    ...(candidate.isMobile === undefined
      ? {}
      : { isMobile: Boolean(candidate.isMobile) }),
    ...(typeof candidate.deviceScaleFactor === "number"
      ? { deviceScaleFactor: candidate.deviceScaleFactor }
      : {}),
  };
}

function parseStep(value: unknown, index: number): JourneyStep {
  if (!value || typeof value !== "object") {
    throw new Error(`steps[${index}] must be an object.`);
  }

  const candidate = value as Record<string, unknown>;
  const action = assertString(candidate.action, `steps[${index}].action`);
  if (!SUPPORTED_ACTIONS.includes(action as JourneyAction)) {
    throw new Error(
      `steps[${index}].action must be one of: ${SUPPORTED_ACTIONS.join(", ")}.`,
    );
  }

  const step: JourneyStep = {
    id: assertString(candidate.id, `steps[${index}].id`),
    title: assertString(candidate.title, `steps[${index}].title`),
    action: action as JourneyAction,
    ...(optionalString(candidate.target, `steps[${index}].target`)
      ? { target: String(candidate.target) }
      : {}),
    ...(optionalString(candidate.value, `steps[${index}].value`)
      ? { value: String(candidate.value) }
      : {}),
    ...(optionalString(candidate.path, `steps[${index}].path`)
      ? { path: String(candidate.path) }
      : {}),
    ...(optionalString(candidate.expected, `steps[${index}].expected`)
      ? { expected: String(candidate.expected) }
      : {}),
    ...(candidate.required === undefined
      ? {}
      : { required: Boolean(candidate.required) }),
    ...(typeof candidate.timeoutMs === "number"
      ? { timeoutMs: candidate.timeoutMs }
      : {}),
  };

  if (step.action === "navigate" && !step.path) {
    throw new Error(`steps[${index}] navigate requires path.`);
  }
  if (
    [
      "click",
      "press",
      "fill",
      "select",
      "assert-visible",
      "assert-hidden",
      "canvas-click",
      "canvas-drag",
      "download",
      "upload",
    ].includes(
      step.action,
    ) &&
    !step.target
  ) {
    throw new Error(`steps[${index}] ${step.action} requires target.`);
  }
  if (
    ["press", "fill", "select", "canvas-click", "canvas-drag", "upload"].includes(
      step.action,
    ) &&
    !step.value
  ) {
    throw new Error(`steps[${index}] ${step.action} requires value.`);
  }

  return step;
}

export function parseJourney(raw: unknown): Journey {
  if (!raw || typeof raw !== "object") {
    throw new Error("Journey must be a JSON object.");
  }

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0) {
    throw new Error("Journey must contain at least one step.");
  }
  if (candidate.viewports !== undefined && !Array.isArray(candidate.viewports)) {
    throw new Error("Journey viewports must be an array.");
  }
  if (
    candidate.ignoredErrorPatterns !== undefined &&
    (!Array.isArray(candidate.ignoredErrorPatterns) ||
      candidate.ignoredErrorPatterns.some((pattern) => typeof pattern !== "string"))
  ) {
    throw new Error("Journey ignoredErrorPatterns must be an array of strings.");
  }

  const viewports = (candidate.viewports as unknown[] | undefined)?.map(parseViewport);
  const journey: Journey = {
    id: assertString(candidate.id, "id"),
    title: assertString(candidate.title, "title"),
    steps: candidate.steps.map(parseStep),
    viewports: viewports?.length ? viewports : [DEFAULT_VIEWPORT],
    ...(optionalString(candidate.description ?? candidate.purpose, "description")
      ? { description: String(candidate.description ?? candidate.purpose) }
      : {}),
    ...(optionalString(candidate.baseUrl, "baseUrl")
      ? { baseUrl: String(candidate.baseUrl) }
      : {}),
    ...(candidate.ignoredErrorPatterns
      ? { ignoredErrorPatterns: candidate.ignoredErrorPatterns as string[] }
      : {}),
  };

  const duplicateStep = journey.steps.find(
    (step, index) => journey.steps.findIndex((other) => other.id === step.id) !== index,
  );
  if (duplicateStep) {
    throw new Error(`Journey step IDs must be unique; found ${duplicateStep.id}.`);
  }

  return journey;
}

export async function loadJourney(journeyPath: string): Promise<Journey> {
  return parseJourney(JSON.parse(await readFile(journeyPath, "utf8")) as unknown);
}
