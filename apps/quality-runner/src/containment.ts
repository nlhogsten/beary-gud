export interface PageContainmentMeasurement {
  viewportWidth: number;
  documentWidth: number;
  bodyWidth: number;
}

export function pageContainmentIssue(
  measurement: PageContainmentMeasurement,
): string | undefined {
  const contentWidth = Math.max(measurement.documentWidth, measurement.bodyWidth);
  if (contentWidth <= measurement.viewportWidth) return undefined;
  return `Page content is ${contentWidth - measurement.viewportWidth}px wider than the ${measurement.viewportWidth}px viewport.`;
}
