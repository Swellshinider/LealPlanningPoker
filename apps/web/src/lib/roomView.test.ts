import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "@lealplanningpoker/shared";
import { buildRoomViewModel } from "./roomView";

const votingSnapshot: RoomSnapshot = {
  roomId: "ROOM01",
  hostName: "Mina",
  story: "Improve onboarding",
  phase: "voting",
  activeReactions: [
    {
      id: "REACTION_1",
      emoji: "👏",
      throwerParticipantId: "HOST_PARTICIPANT",
      targetParticipantId: "ANA_PARTICIPANT",
      createdAt: "2026-06-11T12:00:00.000Z",
      expiresAt: "2026-06-11T12:00:04.000Z"
    }
  ],
  updatedAt: "2026-06-11T12:00:00.000Z",
  viewer: {
    participantId: "ANA_PARTICIPANT",
    isHost: false
  },
  participants: [
    {
      id: "HOST_PARTICIPANT",
      name: "Mina",
      isHost: true,
      connected: true,
      vote: "8",
      hasVoted: true,
      joinedAt: "2026-06-11T12:00:00.000Z",
      updatedAt: "2026-06-11T12:00:00.000Z"
    },
    {
      id: "ANA_PARTICIPANT",
      name: "Ana",
      isHost: false,
      connected: true,
      vote: "3",
      hasVoted: true,
      joinedAt: "2026-06-11T12:00:00.000Z",
      updatedAt: "2026-06-11T12:00:00.000Z"
    }
  ],
  history: []
};

const revealedSnapshot: RoomSnapshot = {
  ...votingSnapshot,
  phase: "revealed",
  viewer: {
    participantId: "HOST_PARTICIPANT",
    isHost: true
  }
};

describe("buildRoomViewModel", () => {
  it("hides other votes while voting and keeps host actions constrained", () => {
    const model = buildRoomViewModel(votingSnapshot);

    expect(model.isHost).toBe(false);
    expect(model.canVote).toBe(true);
    expect(model.voteSummary).toEqual([]);
    expect(model.canReveal).toBe(false);
    expect(model.canFinalize).toBe(false);
    expect(model.canReset).toBe(false);
    expect(model.canSetStory).toBe(false);
    expect(model.resultStats).toBeNull();
    expect(model.activeReactions).toBe(votingSnapshot.activeReactions);
    expect(model.participants[0].visibleVote).toBeNull();
    expect(model.participants[1].visibleVote).toBe("3");
    expect(model.participants[0].tableVote).toBeNull();
    expect(model.participants[1].tableVote).toBeNull();
  });

  it("reveals vote summaries and host actions once the round is revealed", () => {
    const model = buildRoomViewModel(revealedSnapshot);

    expect(model.isHost).toBe(true);
    expect(model.canVote).toBe(false);
    expect(model.voteSummary).toEqual([
      { card: "3", count: 1 },
      { card: "8", count: 1 }
    ]);
    expect(model.canReveal).toBe(false);
    expect(model.canFinalize).toBe(true);
    expect(model.canReset).toBe(true);
    expect(model.canSetStory).toBe(false);
    expect(model.resultStats).toEqual({
      average: 5.5,
      confidence: 50,
      numericVoteCount: 2,
      unknownVoteCount: 0
    });
    expect(model.activeReactions).toBe(votingSnapshot.activeReactions);
    expect(model.participants.every((participant) => participant.visibleVote !== null)).toBe(true);
    expect(model.participants.map((participant) => participant.tableVote)).toEqual(["8", "3"]);
  });
});
