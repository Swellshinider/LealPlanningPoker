import { describe, expect, it } from "vitest";
import { formatVoteLabel } from "./uiText";

describe("ui text helpers", () => {
  it("formats coffee cards as an icon", () => {
    expect(formatVoteLabel("coffee")).toBe("☕");
    expect(formatVoteLabel("13")).toBe("13");
  });
});
