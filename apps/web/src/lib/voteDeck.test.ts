import { describe, expect, it } from "vitest";
import { FIBONACCI_DECK } from "@lealplanningpoker/shared";
import { DECK, isCustomVoteSelected, resolveCustomVote } from "./voteDeck";

describe("DECK", () => {
  it("mirrors the fibonacci deck as a mutable array", () => {
    expect(DECK).toEqual([...FIBONACCI_DECK]);
  });
});

describe("resolveCustomVote", () => {
  it("accepts whole-number strings, trimming and stripping leading zeros", () => {
    expect(resolveCustomVote("21")).toBe("21");
    expect(resolveCustomVote("100")).toBe("100");
    expect(resolveCustomVote("  100 ")).toBe("100");
    expect(resolveCustomVote("0005")).toBe("5");
  });

  it("rejects built-in non-numeric cards and non-numeric input", () => {
    expect(resolveCustomVote("?")).toBeNull();
    expect(resolveCustomVote("coffee")).toBeNull();
    expect(resolveCustomVote("abc")).toBeNull();
    expect(resolveCustomVote("")).toBeNull();
    expect(resolveCustomVote("1.5")).toBeNull();
  });

  it("rejects numbers that exceed the custom-vote digit cap", () => {
    expect(resolveCustomVote("12345")).toBeNull();
  });
});

describe("isCustomVoteSelected", () => {
  it("is true only for non-built-in numeric selections", () => {
    expect(isCustomVoteSelected("100")).toBe(true);
    expect(isCustomVoteSelected("8")).toBe(false);
    expect(isCustomVoteSelected(null)).toBe(false);
  });
});
