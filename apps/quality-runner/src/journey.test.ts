import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseJourney } from "./journey.ts";

function dragJourney(overrides: Record<string, unknown> = {}) {
  return {
    id: "rotation-check",
    title: "Rotation check",
    steps: [
      {
        id: "rotate-preview",
        title: "Rotate preview",
        action: "canvas-drag",
        target: "label=3D preview",
        value: "0.75,0.5,0.25,0.5",
        ...overrides,
      },
    ],
  };
}

describe("canvas-drag journey schema", () => {
  test("accepts a semantic target and normalized coordinate value", () => {
    const journey = parseJourney(dragJourney());
    assert.deepEqual(journey.steps[0], {
      id: "rotate-preview",
      title: "Rotate preview",
      action: "canvas-drag",
      target: "label=3D preview",
      value: "0.75,0.5,0.25,0.5",
    });
  });

  test("requires a target", () => {
    assert.throws(
      () => parseJourney(dragJourney({ target: undefined })),
      /canvas-drag requires target/,
    );
  });

  test("requires a coordinate value", () => {
    assert.throws(
      () => parseJourney(dragJourney({ value: undefined })),
      /canvas-drag requires value/,
    );
  });
});
