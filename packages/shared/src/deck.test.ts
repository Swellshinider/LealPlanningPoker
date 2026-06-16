import { describe, expect, it } from "vitest";
import { FIBONACCI_DECK, MAX_CUSTOM_VOTE_DIGITS, normalizeVoteCard } from "./deck";

describe("FIBONACCI_DECK", () => {
  it("exports the planning poker deck in the expected order", () => {
    expect(FIBONACCI_DECK).toEqual(["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"]);
  });
});

describe("normalizeVoteCard", () => {
  it("accepts built-in cards and custom whole numbers", () => {
    expect(normalizeVoteCard("coffee")).toBe("coffee");
    expect(normalizeVoteCard(" 34 ")).toBe("34");
    expect(normalizeVoteCard("004")).toBe("4");
    expect(normalizeVoteCard("000")).toBe("0");
    expect(normalizeVoteCard("0")).toBe("0");
  });

  it("rejects decimals, signs, text, and empty values", () => {
    expect(normalizeVoteCard("1.5")).toBeNull();
    expect(normalizeVoteCard("-1")).toBeNull();
    expect(normalizeVoteCard("+1")).toBeNull();
    expect(normalizeVoteCard("small")).toBeNull();
    expect(normalizeVoteCard(" ")).toBeNull();
  });

  it("rejects custom vote values longer than the configured digit limit", () => {
    expect(MAX_CUSTOM_VOTE_DIGITS).toBe(4);
    expect(normalizeVoteCard("9999")).toBe("9999");
    expect(normalizeVoteCard("10000")).toBeNull();
  });
});
