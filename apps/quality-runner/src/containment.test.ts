import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pageContainmentIssue } from "./containment.ts";

describe("page containment", () => {
  test("accepts content contained by the viewport", () => {
    assert.equal(pageContainmentIssue({
      viewportWidth: 390,
      documentWidth: 390,
      bodyWidth: 388,
    }), undefined);
  });

  test("reports the exact horizontal overflow", () => {
    assert.equal(pageContainmentIssue({
      viewportWidth: 390,
      documentWidth: 418,
      bodyWidth: 400,
    }), "Page content is 28px wider than the 390px viewport.");
  });
});
