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

describe("visibility and containment journey schema", () => {
  test("accepts an explicit hidden assertion", () => {
    const journey = parseJourney(dragJourney({
      action: "assert-hidden",
      target: "text=Skin version",
      value: undefined,
    }));
    assert.equal(journey.steps[0]?.action, "assert-hidden");
  });

  test("requires a target for hidden assertions", () => {
    assert.throws(
      () => parseJourney(dragJourney({
        action: "assert-hidden",
        target: undefined,
        value: undefined,
      })),
      /assert-hidden requires target/,
    );
  });

  test("accepts page containment without a target or value", () => {
    const journey = parseJourney(dragJourney({
      action: "assert-page-contained",
      target: undefined,
      value: undefined,
    }));
    assert.equal(journey.steps[0]?.action, "assert-page-contained");
  });

  test("requires both a target and key for keyboard activation", () => {
    const journey = parseJourney(dragJourney({
      action: "press",
      target: "role=button[name=\"Restore Baseline\"]",
      value: "Enter",
    }));
    assert.equal(journey.steps[0]?.action, "press");
    assert.throws(
      () => parseJourney(dragJourney({ action: "press", value: undefined })),
      /press requires value/,
    );
  });
});
