export const SUPPORTED_ACTIONS = [
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
] as const;

export type JourneyAction = (typeof SUPPORTED_ACTIONS)[number];

export interface JourneyStep {
  id: string;
  title: string;
  action: JourneyAction;
  target?: string;
  value?: string;
  path?: string;
  expected?: string;
  required?: boolean;
  timeoutMs?: number;
}

export interface JourneyViewport {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
  deviceScaleFactor?: number;
}

export interface Journey {
  id: string;
  title: string;
  description?: string;
  baseUrl?: string;
  viewports?: JourneyViewport[];
  ignoredErrorPatterns?: string[];
  steps: JourneyStep[];
}

export type StepStatus = "passed" | "failed";

export interface StepEvidence {
  viewport: string;
  sequence: number;
  id: string;
  title: string;
  action: JourneyAction;
  target?: string;
  expected?: string;
  required: boolean;
  status: StepStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  screenshot?: string;
  download?: string;
  observed?: string;
  error?: string;
}

export type RuntimeErrorKind =
  | "console"
  | "page"
  | "request"
  | "response"
  | "runner";

export interface RuntimeErrorEvidence {
  viewport: string;
  kind: RuntimeErrorKind;
  message: string;
  url?: string;
  status?: number;
  timestamp: string;
  ignored: boolean;
}

export interface RunState {
  schemaVersion: 1;
  runId: string;
  journeyId: string;
  status: "running" | "passed" | "failed";
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  current?: {
    viewport: string;
    stepId: string;
    sequence: number;
  };
  totals: {
    steps: number;
    passed: number;
    failed: number;
    requiredFailed: number;
    runtimeErrors: number;
    ignoredRuntimeErrors: number;
  };
}

export interface RunOptions {
  repoRoot: string;
  journeyPath: string;
  baseUrl?: string;
  headed: boolean;
}

export interface RunResult {
  runDirectory: string;
  state: RunState;
  steps: StepEvidence[];
  errors: RuntimeErrorEvidence[];
}
