import { describe, expect, it } from "vitest";
import { formatVoteLabel } from "./uiText";

describe("ui text helpers", () => {
  it("formats coffee cards as readable UI text", () => {
    expect(formatVoteLabel("coffee")).toBe("Coffee");
    expect(formatVoteLabel("13")).toBe("13");
  });
});
