import { beforeEach, describe, expect, it } from "vitest";
import { RoomStore, RoomStoreError } from "./roomStore";

function createStore() {
  const ids = [
    "ROOM01",
    "HOST_PARTICIPANT",
    "HOST_TOKEN",
    "ANA_PARTICIPANT",
    "ANA_TOKEN",
    "BOB_PARTICIPANT",
    "BOB_TOKEN"
  ];
  const now = new Date("2026-06-11T12:00:00.000Z");
  return new RoomStore({
    idFactory: () => {
      const id = ids.shift();
      if (!id) {
        throw new Error("No more ids");
      }
      return id;
    },
    now: () => new Date(now)
  });
}

function expectRoomError(fn: () => unknown, code: RoomStoreError["code"]) {
  try {
    fn();
    throw new Error("Expected the store to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(RoomStoreError);
    expect((error as RoomStoreError).code).toBe(code);
  }
}

describe("RoomStore", () => {
  let store: RoomStore;

  beforeEach(() => {
    store = createStore();
  });

  it("creates a room with a host participant in lobby phase", () => {
    const result = store.createRoom({ hostName: "Mina" });

    expect(result.roomId).toBe("ROOM01");
    expect(result.hostToken).toBe("HOST_TOKEN");
    expect(result.participantToken).toBe("HOST_TOKEN");
    expect(result.snapshot.phase).toBe("lobby");
    expect(result.snapshot.hostName).toBe("Mina");
    expect(result.snapshot.viewer).toEqual({
      participantId: "HOST_PARTICIPANT",
      isHost: true
    });
    expect(result.snapshot.participants).toEqual([
      {
        id: "HOST_PARTICIPANT",
        name: "Mina",
        isHost: true,
        connected: true,
        vote: null,
        hasVoted: false,
        joinedAt: "2026-06-11T12:00:00.000Z",
        updatedAt: "2026-06-11T12:00:00.000Z"
      }
    ]);
  });

  it("lets participants join, rename themselves, and reconnect with the same token", () => {
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana",
      participantToken: undefined
    });

    expect(joined.participantToken).toBe("ANA_TOKEN");
    expect(joined.snapshot.participants).toHaveLength(2);

    const renamed = store.renameParticipant({
      roomId: created.roomId,
      participantToken: joined.participantToken,
      displayName: "Ana Lu"
    });

    expect(
      renamed.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.name
    ).toBe("Ana Lu");

    const disconnected = store.leaveRoom({
      roomId: created.roomId,
      participantToken: joined.participantToken
    });

    expect(
      disconnected.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.connected
    ).toBe(false);

    const rejoined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana Later",
      participantToken: joined.participantToken
    });

    expect(
      rejoined.snapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.connected
    ).toBe(true);
    expect(
      rejoined.snapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.name
    ).toBe("Ana Later");
  });

  it("tracks votes during voting and hides other votes until reveal", () => {
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    store.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });

    store.submitVote({
      roomId: created.roomId,
      participantToken: created.hostToken,
      vote: "8"
    });
    store.submitVote({
      roomId: created.roomId,
      participantToken: joined.participantToken,
      vote: "3"
    });

    const hostSnapshot = store.getSnapshot({
      roomId: created.roomId,
      participantToken: created.hostToken
    });
    const participantSnapshot = store.getSnapshot({
      roomId: created.roomId,
      participantToken: joined.participantToken
    });

    expect(hostSnapshot.phase).toBe("voting");
    expect(hostSnapshot.participants.find((participant) => participant.id === "HOST_PARTICIPANT")?.vote).toBe("8");
    expect(hostSnapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.vote).toBe("3");

    expect(participantSnapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.vote).toBe("3");
    expect(participantSnapshot.participants.find((participant) => participant.id === "HOST_PARTICIPANT")?.vote).toBe(null);

    store.revealVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    const revealedSnapshot = store.getSnapshot({
      roomId: created.roomId,
      participantToken: joined.participantToken
    });

    expect(revealedSnapshot.phase).toBe("revealed");
    expect(revealedSnapshot.participants.find((participant) => participant.id === "HOST_PARTICIPANT")?.vote).toBe("8");
    expect(revealedSnapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.vote).toBe("3");
  });

  it("rejects participant tokens for host-only actions and blocks votes after reveal", () => {
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    expectRoomError(
      () =>
        store.revealVotes({
          roomId: created.roomId,
          hostToken: joined.participantToken
        }),
      "NOT_HOST"
    );

    store.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });
    store.revealVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    expectRoomError(
      () =>
        store.submitVote({
          roomId: created.roomId,
          participantToken: joined.participantToken,
          vote: "5"
        }),
      "VOTES_LOCKED"
    );
  });

  it("finalizes a round into history and resetVotes starts a fresh voting round", () => {
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    store.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });
    store.submitVote({
      roomId: created.roomId,
      participantToken: created.hostToken,
      vote: "5"
    });
    store.submitVote({
      roomId: created.roomId,
      participantToken: joined.participantToken,
      vote: "8"
    });
    store.revealVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    const finalized = store.finalizeStory({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    expect(finalized.phase).toBe("finalized");
    expect(finalized.history).toHaveLength(1);
    expect(finalized.history[0]).toMatchObject({
      story: "Improve onboarding",
      voteSummary: [
        { card: "5", count: 1 },
        { card: "8", count: 1 }
      ]
    });

    const reset = store.resetVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    expect(reset.phase).toBe("voting");
    expect(reset.history).toHaveLength(1);
    expect(reset.participants.every((participant) => participant.vote === null)).toBe(true);
  });

  it("expires stale rooms", () => {
    const expiringStore = new RoomStore({
      idFactory: () => "ROOM01",
      now: () => new Date("2026-06-11T12:00:00.000Z"),
      roomTtlMs: 1_000
    });

    const created = expiringStore.createRoom({ hostName: "Mina" });
    expiringStore.expireRooms(new Date("2026-06-11T12:00:01.500Z"));

    expectRoomError(
      () =>
        expiringStore.getSnapshot({
          roomId: created.roomId,
          participantToken: created.hostToken
        }),
      "ROOM_NOT_FOUND"
    );
  });
});
