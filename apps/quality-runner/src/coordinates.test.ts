import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  parseCanvasClickPosition,
  parseCanvasDragPosition,
} from "./coordinates.ts";

describe("normalized canvas coordinates", () => {
  test("parses click and drag ratios", () => {
    assert.deepEqual(parseCanvasClickPosition("0.5, 0.25"), {
      xRatio: 0.5,
      yRatio: 0.25,
    });
    assert.deepEqual(parseCanvasDragPosition("0.75,0.5,0.25,0.6"), {
      startXRatio: 0.75,
      startYRatio: 0.5,
      endXRatio: 0.25,
      endYRatio: 0.6,
    });
  });

  for (const value of [
    "0.5,0.5,0.25",
    "0.5,0.5,0.25,",
    "-0.1,0.5,0.25,0.5",
    "0.5,1.1,0.25,0.5",
    "start,0.5,0.25,0.5",
  ]) {
    test(`rejects unsafe drag coordinates: ${value}`, () => {
      assert.throws(
        () => parseCanvasDragPosition(value),
        /canvas-drag value must be 4 comma-separated ratios between 0 and 1/,
      );
    });
  }
});
