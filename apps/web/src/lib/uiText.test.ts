import { describe, expect, it } from "vitest";
import { formatVoteLabel, getParticipantVoteLabel } from "./uiText";

describe("ui text helpers", () => {
  it("formats coffee cards as readable UI text", () => {
    expect(formatVoteLabel("coffee")).toBe("Coffee");
    expect(formatVoteLabel("13")).toBe("13");
  });

  it("describes participant vote state without exposing hidden votes", () => {
    expect(getParticipantVoteLabel({ hasVoted: true, visibleVote: null })).toBe("Voted");
    expect(getParticipantVoteLabel({ hasVoted: false, visibleVote: null })).toBe("Waiting");
    expect(getParticipantVoteLabel({ hasVoted: true, visibleVote: "coffee" })).toBe("Coffee");
    expect(getParticipantVoteLabel({ hasVoted: true, visibleVote: "5" })).toBe("5");
  });
});
