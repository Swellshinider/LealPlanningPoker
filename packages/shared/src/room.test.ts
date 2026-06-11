import { describe, expect, it } from "vitest";
import { normalizeDisplayName, shouldRevealVoteForViewer, summarizeVotes } from "./room";

describe("normalizeDisplayName", () => {
  it("trims whitespace and falls back to Anonymous", () => {
    expect(normalizeDisplayName("   Alex   Morgan  ")).toBe("Alex Morgan");
    expect(normalizeDisplayName("   ")).toBe("Anonymous");
  });
});

describe("summarizeVotes", () => {
  it("counts votes in deck order and ignores empty selections", () => {
    expect(summarizeVotes(["3", "1", "3", null, "coffee", undefined, "1"])).toEqual([
      { card: "1", count: 2 },
      { card: "3", count: 2 },
      { card: "coffee", count: 1 }
    ]);
  });
});

describe("shouldRevealVoteForViewer", () => {
  it("reveals votes to the host, the owner, and everyone after reveal", () => {
    expect(shouldRevealVoteForViewer({ phase: "voting", isHost: true, isSelf: false })).toBe(true);
    expect(shouldRevealVoteForViewer({ phase: "voting", isHost: false, isSelf: true })).toBe(true);
    expect(shouldRevealVoteForViewer({ phase: "voting", isHost: false, isSelf: false })).toBe(false);
    expect(shouldRevealVoteForViewer({ phase: "revealed", isHost: false, isSelf: false })).toBe(true);
    expect(shouldRevealVoteForViewer({ phase: "finalized", isHost: false, isSelf: false })).toBe(true);
  });
});
