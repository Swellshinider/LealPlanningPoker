import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  let extraId = 0;
  return new RoomStore({
    idFactory: () => {
      return ids.shift() ?? `EXTRA_${(extraId += 1).toString().padStart(3, "0")}`;
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

  it("creates compact room codes by default", () => {
    const defaultStore = new RoomStore({
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });

    const result = defaultStore.createRoom({ hostName: "Mina" });

    expect(result.roomId).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("can inject room ids separately from participant and token ids", () => {
    const ids = ["HOST_PARTICIPANT", "HOST_TOKEN"];
    const injectedStore = new RoomStore({
      roomIdFactory: () => "ABCD-2345",
      idFactory: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("No more ids");
        }
        return id;
      },
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });

    const result = injectedStore.createRoom({ hostName: "Mina" });

    expect(result.roomId).toBe("ABCD-2345");
    expect(result.hostToken).toBe("HOST_TOKEN");
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
    expect(hostSnapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.vote).toBeNull();
    expect(hostSnapshot.participants.find((participant) => participant.id === "ANA_PARTICIPANT")?.hasVoted).toBe(true);

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

  it("accepts custom whole-number votes and normalizes whitespace", () => {
    const created = store.createRoom({ hostName: "Mina" });

    store.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });

    const snapshot = store.submitVote({
      roomId: created.roomId,
      participantToken: created.hostToken,
      vote: " 34 "
    });

    expect(snapshot.participants.find((participant) => participant.id === "HOST_PARTICIPANT")?.vote).toBe("34");
  });

  it("rejects invalid custom votes", () => {
    const created = store.createRoom({ hostName: "Mina" });

    store.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });

    try {
      store.submitVote({
        roomId: created.roomId,
        participantToken: created.hostToken,
        vote: "1.5"
      });
      throw new Error("Expected the store to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RoomStoreError);
      expect((error as RoomStoreError).code).toBe("INVALID_VOTE");
      expect((error as RoomStoreError).message).toBe("Use a deck card or a whole-number custom vote.");
    }

    expectRoomError(
      () =>
        store.submitVote({
          roomId: created.roomId,
          participantToken: created.hostToken,
          vote: "small"
        }),
      "INVALID_VOTE"
    );

    expectRoomError(
      () =>
        store.submitVote({
          roomId: created.roomId,
          participantToken: created.hostToken,
          vote: "10000"
        }),
      "INVALID_VOTE"
    );
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

  it("finalizes custom votes into history summaries", () => {
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
      vote: "13"
    });
    store.submitVote({
      roomId: created.roomId,
      participantToken: joined.participantToken,
      vote: "10"
    });
    store.revealVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    const finalized = store.finalizeStory({
      roomId: created.roomId,
      hostToken: created.hostToken
    });

    expect(finalized.history[0].voteSummary).toEqual([
      { card: "13", count: 1 },
      { card: "10", count: 1 }
    ]);
    expect(finalized.history[0].votes.find((vote) => vote.participantId === "ANA_PARTICIPANT")?.vote).toBe("10");
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

  it("rejects joins after the room reaches the participant limit", () => {
    const ids = Array.from({ length: 120 }, (_, index) => `ID_${index.toString().padStart(3, "0")}`);
    const limitedStore = new RoomStore({
      roomIdFactory: () => "ABCD-2345",
      idFactory: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("No more ids");
        }
        return id;
      },
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });

    const created = limitedStore.createRoom({ hostName: "Mina" });

    for (let index = 0; index < 49; index += 1) {
      limitedStore.joinRoom({
        roomId: created.roomId,
        displayName: `Participant ${index}`
      });
    }

    expectRoomError(
      () =>
        limitedStore.joinRoom({
          roomId: created.roomId,
          displayName: "Overflow"
        }),
      "ROOM_FULL"
    );
  });

  it("keeps only the latest finalized history entries", () => {
    const ids = Array.from({ length: 400 }, (_, index) => `ITEM_${index.toString().padStart(3, "0")}`);
    let currentTime = new Date("2026-06-11T12:00:00.000Z");
    const historyStore = new RoomStore({
      roomIdFactory: () => "ABCD-2345",
      idFactory: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("No more ids");
        }
        return id;
      },
      now: () => new Date(currentTime)
    });

    const created = historyStore.createRoom({ hostName: "Mina" });

    for (let index = 0; index < 105; index += 1) {
      currentTime = new Date(currentTime.getTime() + 1_000);
      historyStore.setStory({
        roomId: created.roomId,
        hostToken: created.hostToken,
        story: `Story ${index}`
      });
      historyStore.submitVote({
        roomId: created.roomId,
        participantToken: created.hostToken,
        vote: "5"
      });
      historyStore.revealVotes({
        roomId: created.roomId,
        hostToken: created.hostToken
      });
      historyStore.finalizeStory({
        roomId: created.roomId,
        hostToken: created.hostToken
      });
    }

    const snapshot = historyStore.getSnapshot({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    expect(snapshot.history).toHaveLength(100);
    expect(snapshot.history[0]?.story).toBe("Story 5");
    expect(snapshot.history.at(-1)?.story).toBe("Story 104");
  });

  it("keeps live reactions only in the active snapshot window and allows throws in every phase", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    let nextId = 0;
    let nextRoom = 0;
    const timedStore = new RoomStore({
      idFactory: () => `ID_${(nextId += 1).toString().padStart(3, "0")}`,
      now: () => new Date(now),
      roomIdFactory: () => `ROOM-${(nextRoom += 1).toString().padStart(4, "0")}`
    });

    const created = timedStore.createRoom({ hostName: "Mina" });
    const joined = timedStore.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    const lobbySnapshot = timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: created.participantToken,
      emoji: "👏",
      targetParticipantId: "ID_003"
    });
    expect(lobbySnapshot.activeReactions).toHaveLength(1);

    timedStore.setStory({
      roomId: created.roomId,
      hostToken: created.hostToken,
      story: "Improve onboarding"
    });
    const votingSnapshot = timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: joined.participantToken,
      emoji: "🔥",
      targetParticipantId: "ID_001"
    });
    expect(votingSnapshot.activeReactions).toHaveLength(2);

    timedStore.revealVotes({
      roomId: created.roomId,
      hostToken: created.hostToken
    });
    timedStore.finalizeStory({
      roomId: created.roomId,
      hostToken: created.hostToken
    });
    const finalizedSnapshot = timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: created.participantToken,
      emoji: "💯",
      targetParticipantId: "ID_003"
    });
    expect(finalizedSnapshot.activeReactions).toHaveLength(3);

    now.setSeconds(now.getSeconds() + 5);
    expect(
      timedStore.getSnapshot({
        roomId: created.roomId,
        participantToken: created.participantToken
      }).activeReactions
    ).toEqual([]);
  });

  it("prunes expired reactions during join, sync, and subsequent throws", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    let nextId = 0;
    let nextRoom = 0;
    const timedStore = new RoomStore({
      idFactory: () => `ID_${(nextId += 1).toString().padStart(3, "0")}`,
      now: () => new Date(now),
      roomIdFactory: () => `ROOM-${(nextRoom += 1).toString().padStart(4, "0")}`
    });

    const created = timedStore.createRoom({ hostName: "Mina" });
    const joined = timedStore.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: created.participantToken,
      emoji: "👏",
      targetParticipantId: "ID_003"
    });

    now.setSeconds(now.getSeconds() + 5);

    expect(
      timedStore.joinRoom({
        roomId: created.roomId,
        displayName: "Ana Again",
        participantToken: joined.participantToken
      }).snapshot.activeReactions
    ).toEqual([]);

    timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: created.participantToken,
      emoji: "🔥",
      targetParticipantId: "ID_003"
    });

    now.setSeconds(now.getSeconds() + 5);
    expect(
      timedStore.syncRoom({
        roomId: created.roomId,
        participantToken: created.participantToken
      }).activeReactions
    ).toEqual([]);

    const latest = timedStore.throwReaction({
      roomId: created.roomId,
      participantToken: created.participantToken,
      emoji: "💀",
      targetParticipantId: "ID_003"
    });

    expect(latest.activeReactions).toHaveLength(1);
    expect(latest.activeReactions[0]?.emoji).toBe("💀");
  });

  it("rejects invalid reaction targets and emojis", () => {
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    expectRoomError(
      () =>
        store.throwReaction({
          roomId: created.roomId,
          participantToken: created.participantToken,
          emoji: "👏",
          targetParticipantId: "HOST_PARTICIPANT"
        }),
      "INVALID_REACTION"
    );

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: joined.participantToken
    });
    expectRoomError(
      () =>
        store.throwReaction({
          roomId: created.roomId,
          participantToken: created.participantToken,
          emoji: "🔥",
          targetParticipantId: "ANA_PARTICIPANT"
        }),
      "INVALID_REACTION"
    );

    expectRoomError(
      () =>
        store.throwReaction({
          roomId: created.roomId,
          participantToken: created.participantToken,
          emoji: "🙂" as never,
          targetParticipantId: "ANA_PARTICIPANT"
        }),
      "INVALID_REACTION"
    );

    expectRoomError(
      () =>
        store.throwReaction({
          roomId: created.roomId,
          participantToken: created.participantToken,
          emoji: "👏",
          targetParticipantId: "MISSING_PARTICIPANT"
        }),
      "PARTICIPANT_NOT_FOUND"
    );
  });

  it("caps active reactions per room at forty entries and evicts the oldest first", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    let nextId = 0;
    let nextRoom = 0;
    const timedStore = new RoomStore({
      idFactory: () => `ID_${(nextId += 1).toString().padStart(3, "0")}`,
      now: () => new Date(now),
      roomIdFactory: () => `ROOM-${(nextRoom += 1).toString().padStart(4, "0")}`
    });

    const created = timedStore.createRoom({ hostName: "Mina" });
    timedStore.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    let latestSnapshot = timedStore.getSnapshot({
      roomId: created.roomId,
      participantToken: created.participantToken
    });

    for (let index = 0; index < 41; index += 1) {
      latestSnapshot = timedStore.throwReaction({
        roomId: created.roomId,
        participantToken: created.participantToken,
        emoji: "🍅",
        targetParticipantId: "ID_003"
      });
      now.setMilliseconds(now.getMilliseconds() + 50);
    }

    expect(latestSnapshot.activeReactions).toHaveLength(40);
    expect(latestSnapshot.activeReactions.some((reaction) => reaction.id === "ID_005")).toBe(false);
  });
});

describe("RoomStore offline cleanup", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function createOfflineStore(options: { offlineCleanupMs?: number; closed?: string[] } = {}) {
    const ids = [
      "ROOM01",
      "HOST_PARTICIPANT",
      "HOST_TOKEN",
      "ANA_PARTICIPANT",
      "ANA_TOKEN",
      "BOB_PARTICIPANT",
      "BOB_TOKEN"
    ];
    const closed = options.closed ?? [];
    vi.useFakeTimers({ now: new Date("2026-06-11T12:00:00.000Z") });
    const store = new RoomStore({
      idFactory: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("No more ids");
        }
        return id;
      },
      now: () => new Date("2026-06-11T12:00:00.000Z"),
      offlineCleanupMs: options.offlineCleanupMs ?? 1000,
      onRoomClosed: (roomId) => {
        closed.push(roomId);
      }
    });
    return { store, closed };
  }

  it("removes a room after the offline cleanup window when everyone disconnects", () => {
    const { store, closed } = createOfflineStore();
    const created = store.createRoom({ hostName: "Mina" });

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    vi.advanceTimersByTime(999);
    expect(
      store.getSnapshot({
        roomId: created.roomId,
        participantToken: created.hostToken
      }).roomId
    ).toBe(created.roomId);
    expect(closed).toEqual([]);

    vi.advanceTimersByTime(2);
    expect(closed).toEqual([created.roomId]);
    expect(() =>
      store.getSnapshot({
        roomId: created.roomId,
        participantToken: created.hostToken
      })
    ).toThrow();
  });

  it("cancels the offline timer when a participant rejoins", () => {
    const { store, closed } = createOfflineStore();
    const created = store.createRoom({ hostName: "Mina" });

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    vi.advanceTimersByTime(500);

    store.syncRoom({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    vi.advanceTimersByTime(10_000);

    expect(closed).toEqual([]);
    expect(() =>
      store.getSnapshot({
        roomId: created.roomId,
        participantToken: created.hostToken
      })
    ).not.toThrow();
  });

  it("does not arm the timer when other participants are still connected", () => {
    const { store, closed } = createOfflineStore();
    const created = store.createRoom({ hostName: "Mina" });
    const joined = store.joinRoom({
      roomId: created.roomId,
      displayName: "Ana"
    });

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    vi.advanceTimersByTime(5_000);

    expect(closed).toEqual([]);
    expect(
      store.getSnapshot({
        roomId: created.roomId,
        participantToken: joined.participantToken
      }).participants
    ).toHaveLength(2);

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: joined.participantToken
    });

    vi.advanceTimersByTime(5_000);

    expect(closed).toEqual([created.roomId]);
  });

  it("skips offline cleanup when offlineCleanupMs is zero", () => {
    const { store, closed } = createOfflineStore({ offlineCleanupMs: 0 });
    const created = store.createRoom({ hostName: "Mina" });

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: created.hostToken
    });

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(closed).toEqual([]);
  });
});
