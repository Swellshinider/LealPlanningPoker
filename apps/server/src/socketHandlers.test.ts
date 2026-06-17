import { describe, expect, it, vi } from "vitest";
import { registerSocketHandlers } from "./socketHandlers";
import { RoomStore } from "./roomStore";

type Handler = (...args: unknown[]) => void;

interface FakeSocket {
  id: string;
  handlers: Map<string, Handler>;
  emitted: Array<{ event: string; payload: unknown }>;
  on: (event: string, handler: Handler) => FakeSocket;
  emit: (event: string, payload: unknown) => void;
}

function createFakeSocket(id = "socket-1"): FakeSocket {
  const socket: FakeSocket = {
    id,
    handlers: new Map(),
    emitted: [],
    on(event, handler) {
      this.handlers.set(event, handler);
      return this;
    },
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
  };

  return socket;
}

function createFakeIo(...sockets: FakeSocket[]) {
  let connectionHandler: ((socket: FakeSocket) => void) | undefined;
  const socketMap = new Map(sockets.map((socket) => [socket.id, socket]));

  return {
    io: {
      on(event: string, handler: (socket: FakeSocket) => void) {
        if (event === "connection") {
          connectionHandler = handler;
        }
      },
      sockets: {
        sockets: socketMap,
      },
    },
    connect(socket = sockets[0]) {
      if (!connectionHandler) {
        throw new Error("Connection handler was not registered.");
      }

      connectionHandler(socket);
    },
  };
}

function createStore() {
  let nextId = 0;
  let nextRoom = 0;

  return new RoomStore({
    idFactory: () => `ID_${(nextId += 1).toString().padStart(3, "0")}`,
    roomIdFactory: () => `ROOM-${(nextRoom += 1).toString().padStart(4, "0")}`,
    now: () => new Date("2026-06-11T12:00:00.000Z"),
  });
}

describe("registerSocketHandlers", () => {
  it("returns INVALID_PAYLOAD errors for malformed room:create payloads with ack", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    registerSocketHandlers(io as never, createStore());
    connect();

    const ack = vi.fn();
    const handler = socket.handlers.get("room:create");

    if (!handler) {
      throw new Error("room:create handler not registered");
    }

    handler(null, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid hostName.",
      },
    });
  });

  it("emits room:error instead of throwing when malformed payloads arrive without ack", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    registerSocketHandlers(io as never, createStore());
    connect();

    const handler = socket.handlers.get("room:create");

    if (!handler) {
      throw new Error("room:create handler not registered");
    }

    expect(() => handler(null)).not.toThrow();
    expect(socket.emitted).toContainEqual({
      event: "room:error",
      payload: {
        code: "INVALID_PAYLOAD",
        message: "Invalid hostName.",
      },
    });
  });

  it("does not leak raw exception messages for unknown errors", () => {
    class ExplodingStore extends RoomStore {
      override createRoom(): never {
        throw new Error("sensitive internal message");
      }
    }

    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    registerSocketHandlers(io as never, new ExplodingStore());
    connect();

    const ack = vi.fn();
    const handler = socket.handlers.get("room:create");

    if (!handler) {
      throw new Error("room:create handler not registered");
    }

    handler({ hostName: "Mina" }, ack);

    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Unexpected server error.",
      },
    });
  });

  it("rate limits repeated socket events", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    registerSocketHandlers(io as never, createStore());
    connect();

    const handler = socket.handlers.get("room:create");

    if (!handler) {
      throw new Error("room:create handler not registered");
    }

    for (let index = 0; index < 60; index += 1) {
      const ack = vi.fn();
      handler({ hostName: `Host ${index}` }, ack);
      expect(ack.mock.calls[0]?.[0]?.ok).toBe(true);
    }

    const overflowAck = vi.fn();
    handler({ hostName: "Overflow" }, overflowAck);

    expect(overflowAck).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again shortly.",
      },
    });
  });

  it("acknowledges successful reaction throws with the updated snapshot", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    const store = createStore();
    registerSocketHandlers(io as never, store);
    connect();

    const createAck = vi.fn();
    socket.handlers.get("room:create")?.({ hostName: "Mina" }, createAck);
    const created = createAck.mock.calls[0]?.[0];

    const joinAck = vi.fn();
    socket.handlers.get("room:join")?.(
      {
        roomId: created.roomId,
        displayName: "Ana",
      },
      joinAck,
    );
    const joined = joinAck.mock.calls[0]?.[0];

    const throwAck = vi.fn();
    socket.handlers.get("reaction:throw")?.(
      {
        roomId: created.roomId,
        participantToken: created.participantToken,
        emoji: "💯",
        targetParticipantId: joined.snapshot.viewer.participantId,
      },
      throwAck,
    );

    expect(throwAck).toHaveBeenCalledWith({
      ok: true,
      snapshot: expect.objectContaining({
        activeReactions: [
          expect.objectContaining({
            emoji: "💯",
            targetParticipantId: joined.snapshot.viewer.participantId,
          }),
        ],
      }),
    });
  });

  it("returns payload and domain errors for invalid reaction throws", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    const store = createStore();
    registerSocketHandlers(io as never, store);
    connect();

    const createAck = vi.fn();
    socket.handlers.get("room:create")?.({ hostName: "Mina" }, createAck);
    const created = createAck.mock.calls[0]?.[0];

    const malformedAck = vi.fn();
    socket.handlers.get("reaction:throw")?.(
      {
        roomId: created.roomId,
        participantToken: created.participantToken,
        targetParticipantId: created.snapshot.viewer.participantId,
      },
      malformedAck,
    );

    expect(malformedAck).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid emoji.",
      },
    });

    const domainAck = vi.fn();
    socket.handlers.get("reaction:throw")?.(
      {
        roomId: created.roomId,
        participantToken: created.participantToken,
        emoji: "👏",
        targetParticipantId: created.snapshot.viewer.participantId,
      },
      domainAck,
    );

    expect(domainAck).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "INVALID_REACTION",
        message: "Pick another player.",
      },
    });
  });

  it("handles host transfers and broadcasts the updated snapshot to other sockets", () => {
    const hostSocket = createFakeSocket("host-socket");
    const viewerSocket = createFakeSocket("viewer-socket");
    const { io, connect } = createFakeIo(hostSocket, viewerSocket);
    const store = createStore();
    registerSocketHandlers(io as never, store);
    connect(hostSocket);
    connect(viewerSocket);

    const createAck = vi.fn();
    hostSocket.handlers.get("room:create")?.({ hostName: "Mina" }, createAck);
    const created = createAck.mock.calls[0]?.[0];

    const joinAck = vi.fn();
    viewerSocket.handlers.get("room:join")?.(
      {
        roomId: created.roomId,
        displayName: "Ana",
      },
      joinAck,
    );
    const joined = joinAck.mock.calls[0]?.[0];

    const transferAck = vi.fn();
    hostSocket.handlers.get("host:transfer")?.(
      {
        roomId: created.roomId,
        participantToken: created.participantToken,
        targetParticipantId: joined.snapshot.viewer.participantId,
      },
      transferAck,
    );

    expect(transferAck).toHaveBeenCalledWith({
      ok: true,
      snapshot: expect.objectContaining({
        hostName: "Ana",
        viewer: {
          participantId: created.snapshot.viewer.participantId,
          isHost: false,
        },
      }),
    });
    expect(viewerSocket.emitted).toContainEqual({
      event: "room:snapshot",
      payload: expect.objectContaining({
        hostName: "Ana",
        viewer: {
          participantId: joined.snapshot.viewer.participantId,
          isHost: true,
        },
      }),
    });
  });

  it("validates host:transfer payloads and supports offline host claims", () => {
    const socket = createFakeSocket();
    const { io, connect } = createFakeIo(socket);
    const store = createStore();
    registerSocketHandlers(io as never, store);
    connect();

    const createAck = vi.fn();
    socket.handlers.get("room:create")?.({ hostName: "Mina" }, createAck);
    const created = createAck.mock.calls[0]?.[0];

    const malformedAck = vi.fn();
    socket.handlers.get("host:transfer")?.(
      {
        roomId: created.roomId,
        targetParticipantId: created.snapshot.viewer.participantId,
      },
      malformedAck,
    );

    expect(malformedAck).toHaveBeenCalledWith({
      ok: false,
      error: {
        code: "INVALID_PAYLOAD",
        message: "Invalid participantToken.",
      },
    });

    const joinAck = vi.fn();
    socket.handlers.get("room:join")?.(
      {
        roomId: created.roomId,
        displayName: "Ana",
      },
      joinAck,
    );
    const joined = joinAck.mock.calls[0]?.[0];

    store.leaveRoom({
      roomId: created.roomId,
      participantToken: created.participantToken,
    });

    const claimAck = vi.fn();
    socket.handlers.get("host:transfer")?.(
      {
        roomId: created.roomId,
        participantToken: joined.participantToken,
        targetParticipantId: joined.snapshot.viewer.participantId,
      },
      claimAck,
    );

    expect(claimAck).toHaveBeenCalledWith({
      ok: true,
      snapshot: expect.objectContaining({
        hostName: "Ana",
        viewer: {
          participantId: joined.snapshot.viewer.participantId,
          isHost: true,
        },
      }),
    });
  });
});
