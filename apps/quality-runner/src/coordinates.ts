function parseNormalizedRatios(
  value: string,
  count: number,
  action: string,
  example: string,
): number[] {
  const parts = value.split(",").map((part) => part.trim());
  const ratios = parts.map((part) => Number(part));
  if (
    parts.length !== count ||
    parts.some((part) => part === "") ||
    ratios.some((ratio) => !Number.isFinite(ratio) || ratio < 0 || ratio > 1)
  ) {
    throw new Error(
      `${action} value must be ${count} comma-separated ratios between 0 and 1, such as ${example}.`,
    );
  }
  return ratios;
}

export function parseCanvasClickPosition(value: string): {
  xRatio: number;
  yRatio: number;
} {
  const [xRatio, yRatio] = parseNormalizedRatios(
    value,
    2,
    "canvas-click",
    "0.5,0.5",
  );
  return { xRatio: xRatio!, yRatio: yRatio! };
}

export function parseCanvasDragPosition(value: string): {
  startXRatio: number;
  startYRatio: number;
  endXRatio: number;
  endYRatio: number;
} {
  const [startXRatio, startYRatio, endXRatio, endYRatio] = parseNormalizedRatios(
    value,
    4,
    "canvas-drag",
    "0.75,0.5,0.25,0.5",
  );
  return {
    startXRatio: startXRatio!,
    startYRatio: startYRatio!,
    endXRatio: endXRatio!,
    endYRatio: endYRatio!,
  };
}
