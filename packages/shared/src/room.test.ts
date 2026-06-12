import { describe, expect, it } from "vitest";
import { normalizeDisplayName, shouldRevealVoteForViewer, summarizeVotes } from "./room";

describe("normalizeDisplayName", () => {
  it("trims whitespace and falls back to Anonymous", () => {
    expect(normalizeDisplayName("   Alex   Morgan  ")).toBe("Alex Morgan");
    expect(normalizeDisplayName("   ")).toBe("Anonymous");
  });
});

describe("summarizeVotes", () => {
  it("counts built-in votes in deck order, custom votes numerically, and ignores empty selections", () => {
    expect(summarizeVotes(["10", "3", "1", "3", null, "coffee", "4", undefined, "1"])).toEqual([
      { card: "1", count: 2 },
      { card: "3", count: 2 },
      { card: "coffee", count: 1 },
      { card: "4", count: 1 },
      { card: "10", count: 1 }
    ]);
  });

  it("sorts large custom numeric strings without losing precision", () => {
    expect(summarizeVotes(["9007199254740993", "9007199254740992"])).toEqual([
      { card: "9007199254740992", count: 1 },
      { card: "9007199254740993", count: 1 }
    ]);
  });
});

describe("shouldRevealVoteForViewer", () => {
  it("reveals votes to the owner during voting and to everyone after reveal", () => {
    expect(shouldRevealVoteForViewer({ phase: "voting", isSelf: true })).toBe(true);
    expect(shouldRevealVoteForViewer({ phase: "voting", isSelf: false })).toBe(false);
    expect(shouldRevealVoteForViewer({ phase: "revealed", isSelf: false })).toBe(true);
    expect(shouldRevealVoteForViewer({ phase: "finalized", isSelf: false })).toBe(true);
  });
});
