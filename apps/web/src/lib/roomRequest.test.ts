import { describe, expect, it } from "vitest";
import type { RoomSnapshot } from "@lealplanningpoker/shared";
import { RoomRequestError, getConnectionErrorMessage } from "./roomTransport";
import { asRoomRequestError, extractRoomParticipant } from "./roomRequest";

const snapshot: RoomSnapshot = {
  roomId: "ROOM01",
  hostName: "Mina",
  story: "",
  phase: "voting",
  activeReactions: [],
  updatedAt: "2026-06-11T12:00:00.000Z",
  viewer: { participantId: "ANA_PARTICIPANT", isHost: false },
  participants: [
    {
      id: "HOST_PARTICIPANT",
      name: "Mina",
      isHost: true,
      connected: true,
      vote: null,
      hasVoted: false,
      joinedAt: "2026-06-11T12:00:00.000Z",
      updatedAt: "2026-06-11T12:00:00.000Z",
    },
    {
      id: "ANA_PARTICIPANT",
      name: "Ana",
      isHost: false,
      connected: true,
      vote: null,
      hasVoted: false,
      joinedAt: "2026-06-11T12:00:00.000Z",
      updatedAt: "2026-06-11T12:00:00.000Z",
    },
  ],
  history: [],
};

describe("extractRoomParticipant", () => {
  it("returns the viewer's participant", () => {
    expect(extractRoomParticipant(snapshot)?.id).toBe("ANA_PARTICIPANT");
  });

  it("returns null when the viewer is no longer present", () => {
    expect(
      extractRoomParticipant({ ...snapshot, viewer: { participantId: "GHOST", isHost: false } }),
    ).toBeNull();
  });
});

describe("asRoomRequestError", () => {
  it("passes RoomRequestError instances through unchanged", () => {
    const error = new RoomRequestError("ROOM_CLOSED", "bye");
    expect(asRoomRequestError(error)).toBe(error);
  });

  it("wraps generic errors as UNKNOWN_ERROR", () => {
    const error = asRoomRequestError(new Error("boom"));
    expect(error).toBeInstanceOf(RoomRequestError);
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.message).toBe("boom");
  });

  it("uses the connection message for non-error throws", () => {
    const error = asRoomRequestError("nope");
    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.message).toBe(getConnectionErrorMessage());
  });
});
