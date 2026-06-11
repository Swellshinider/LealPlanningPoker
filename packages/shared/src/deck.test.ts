import { describe, expect, it } from "vitest";
import { FIBONACCI_DECK } from "./deck";

describe("FIBONACCI_DECK", () => {
  it("exports the planning poker deck in the expected order", () => {
    expect(FIBONACCI_DECK).toEqual([
      "0",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "21",
      "?",
      "coffee"
    ]);
  });
});
