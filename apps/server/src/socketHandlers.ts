import type { Server, Socket } from "socket.io";
import {
  type RoomSnapshot,
  type ThrowableReactionEmoji,
  type VoteCard,
} from "@lealplanningpoker/shared";
import { RoomStore, RoomStoreError } from "./roomStore";

interface SocketSession {
  roomId: string;
  participantToken: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}

export interface CreateRoomPayload {
  hostName: string;
}

export interface JoinRoomPayload {
  roomId: string;
  displayName: string;
  participantToken?: string;
}

export interface SyncRoomPayload {
  roomId: string;
  participantToken: string;
}

export interface RenameParticipantPayload {
  roomId: string;
  participantToken: string;
  displayName: string;
}

export interface VotePayload {
  roomId: string;
  participantToken: string;
  vote: VoteCard;
}

export interface StoryPayload {
  roomId: string;
  hostToken: string;
  story: string;
}

export interface ThrowReactionPayload {
  roomId: string;
  participantToken: string;
  targetParticipantId: string;
  emoji: ThrowableReactionEmoji;
}

export interface HostRoomPayload {
  roomId: string;
  hostToken: string;
}

type SuccessEnvelope<T extends object> = {
  ok: true;
} & T;

interface FailureEnvelope {
  ok: false;
  error: SocketErrorPayload;
}

type ActionAck<T extends object> = (response: SuccessEnvelope<T> | FailureEnvelope) => void;

class SocketHandlerError extends Error {
  constructor(
    readonly code: "INVALID_PAYLOAD" | "RATE_LIMITED",
    message: string,
  ) {
    super(message);
    this.name = "SocketHandlerError";
  }
}

export interface SocketHandlerController {
  notifyRoomChanged: (roomId: string) => void;
  notifyRoomClosed: (roomId: string, error: SocketErrorPayload) => void;
}

export interface SocketHandlerOptions {
  onRoomChanged?: (roomId: string) => void;
  onRoomClosed?: (roomId: string, error: SocketErrorPayload) => void;
}

export function registerSocketHandlers(
  io: Server,
  store: RoomStore,
  options: SocketHandlerOptions = {},
): SocketHandlerController {
  const sessionBySocketId = new Map<string, SocketSession>();
  const socketsByRoomId = new Map<string, Set<string>>();
  const socketsByToken = new Map<string, Set<string>>();
  const eventTimestampsBySocketId = new Map<string, number[]>();

  io.on("connection", (socket) => {
    socket.on(
      "room:create",
      (
        payload: CreateRoomPayload,
        ack?: ActionAck<{
          roomId: string;
          participantToken: string;
          hostToken: string;
          snapshot: RoomSnapshot;
        }>,
      ) => {
        respond(socket, ack, () => {
          const result = store.createRoom({ hostName: requireStringField(payload, "hostName") });
          switchSession(socket, result.roomId, result.participantToken);
          broadcastRoom(result.roomId, socket.id);
          options.onRoomChanged?.(result.roomId);
          return {
            roomId: result.roomId,
            participantToken: result.participantToken,
            hostToken: result.hostToken,
            snapshot: result.snapshot,
          };
        });
      },
    );

    socket.on(
      "room:join",
      (
        payload: JoinRoomPayload,
        ack?: ActionAck<{
          roomId: string;
          participantToken: string;
          snapshot: RoomSnapshot;
        }>,
      ) => {
        respond(socket, ack, () => {
          const result = store.joinRoom({
            roomId: requireStringField(payload, "roomId"),
            displayName: requireStringField(payload, "displayName"),
            participantToken: requireOptionalStringField(payload, "participantToken"),
          });
          switchSession(socket, result.roomId, result.participantToken);
          broadcastRoom(result.roomId, socket.id);
          options.onRoomChanged?.(result.roomId);
          return {
            roomId: result.roomId,
            participantToken: result.participantToken,
            snapshot: result.snapshot,
          };
        });
      },
    );

    socket.on(
      "room:sync",
      (payload: SyncRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const participantToken = requireStringField(payload, "participantToken");
          const snapshot = store.syncRoom({ roomId, participantToken });
          switchSession(socket, roomId, participantToken);
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "participant:rename",
      (payload: RenameParticipantPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const participantToken = requireStringField(payload, "participantToken");
          const displayName = requireStringField(payload, "displayName");
          const snapshot = store.renameParticipant({ roomId, participantToken, displayName });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "vote:submit",
      (payload: VotePayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const participantToken = requireStringField(payload, "participantToken");
          const vote = requireStringField(payload, "vote") as VoteCard;
          const snapshot = store.submitVote({ roomId, participantToken, vote });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "reaction:throw",
      (payload: ThrowReactionPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const participantToken = requireStringField(payload, "participantToken");
          const targetParticipantId = requireStringField(payload, "targetParticipantId");
          const emoji = requireStringField(payload, "emoji") as ThrowableReactionEmoji;
          const snapshot = store.throwReaction({
            roomId,
            participantToken,
            targetParticipantId,
            emoji,
          });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "host:story:set",
      (payload: StoryPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const hostToken = requireStringField(payload, "hostToken");
          const story = requireStringField(payload, "story");
          const snapshot = store.setStory({ roomId, hostToken, story });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "host:reveal",
      (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const hostToken = requireStringField(payload, "hostToken");
          const snapshot = store.revealVotes({ roomId, hostToken });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "host:reset",
      (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const hostToken = requireStringField(payload, "hostToken");
          const snapshot = store.resetVotes({ roomId, hostToken });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on(
      "host:finalize",
      (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(socket, ack, () => {
          const roomId = requireStringField(payload, "roomId");
          const hostToken = requireStringField(payload, "hostToken");
          const snapshot = store.finalizeStory({ roomId, hostToken });
          broadcastRoom(roomId, socket.id);
          options.onRoomChanged?.(roomId);
          return { snapshot };
        });
      },
    );

    socket.on("disconnect", () => {
      detachSocket(socket);
      eventTimestampsBySocketId.delete(socket.id);
    });
  });

  function respond<T extends object>(
    socket: Socket,
    ack: ActionAck<T> | undefined,
    action: () => T,
  ): void {
    try {
      assertWithinRateLimit(socket.id);
      const result = action();
      if (ack) {
        ack({ ok: true, ...result } as SuccessEnvelope<T>);
      }
    } catch (error) {
      const payload = toSocketError(error);
      if (ack) {
        ack({ ok: false, error: payload });
        return;
      }

      socket.emit("room:error", payload);
    }
  }

  function switchSession(socket: Socket, roomId: string, participantToken: string): void {
    const current = sessionBySocketId.get(socket.id);
    if (current && (current.roomId !== roomId || current.participantToken !== participantToken)) {
      detachSocket(socket, current);
    }

    sessionBySocketId.set(socket.id, { roomId, participantToken });
    addToBucket(socketsByRoomId, roomId, socket.id);
    addToBucket(socketsByToken, participantToken, socket.id);
  }

  function detachSocket(
    socket: Socket,
    session = sessionBySocketId.get(socket.id),
    shouldLeaveRoom = true,
  ): void {
    if (!session) {
      return;
    }

    sessionBySocketId.delete(socket.id);
    removeFromBucket(socketsByRoomId, session.roomId, socket.id);

    const tokenBucket = socketsByToken.get(session.participantToken);
    if (!tokenBucket) {
      return;
    }

    tokenBucket.delete(socket.id);
    if (tokenBucket.size > 0) {
      return;
    }

    socketsByToken.delete(session.participantToken);
    if (!shouldLeaveRoom) {
      return;
    }

    try {
      store.leaveRoom({
        roomId: session.roomId,
        participantToken: session.participantToken,
      });
      broadcastRoom(session.roomId, socket.id);
      options.onRoomChanged?.(session.roomId);
    } catch (error) {
      if (!isRoomNotFound(error)) {
        socket.emit("room:error", toSocketError(error));
      }
    }
  }

  function broadcastRoom(roomId: string, excludeSocketId?: string): void {
    const socketIds = socketsByRoomId.get(roomId);
    if (!socketIds) {
      return;
    }

    for (const socketId of [...socketIds]) {
      if (socketId === excludeSocketId) {
        continue;
      }

      const targetSocket = io.sockets.sockets.get(socketId);
      if (!targetSocket) {
        removeFromBucket(socketsByRoomId, roomId, socketId);
        continue;
      }

      emitSnapshot(targetSocket);
    }
  }

  function emitSnapshot(socket: Socket): void {
    const session = sessionBySocketId.get(socket.id);
    if (!session) {
      return;
    }

    try {
      const snapshot = store.getSnapshot(session);
      socket.emit("room:snapshot", snapshot);
    } catch (error) {
      if (isRoomNotFound(error)) {
        socket.emit("room:closed", {
          roomId: session.roomId,
          error: toSocketError(error),
        });
        detachSocket(socket, session);
        return;
      }

      socket.emit("room:error", toSocketError(error));
    }
  }

  function addToBucket(bucket: Map<string, Set<string>>, key: string, value: string): void {
    const values = bucket.get(key) ?? new Set<string>();
    values.add(value);
    bucket.set(key, values);
  }

  function removeFromBucket(bucket: Map<string, Set<string>>, key: string, value: string): void {
    const values = bucket.get(key);
    if (!values) {
      return;
    }

    values.delete(value);
    if (values.size === 0) {
      bucket.delete(key);
    }
  }

  function assertWithinRateLimit(socketId: string): void {
    const now = Date.now();
    const recent = (eventTimestampsBySocketId.get(socketId) ?? []).filter(
      (timestamp) => now - timestamp < 10_000,
    );
    recent.push(now);
    eventTimestampsBySocketId.set(socketId, recent);

    if (recent.length > 60) {
      throw new SocketHandlerError("RATE_LIMITED", "Too many requests. Try again shortly.");
    }
  }

  return {
    notifyRoomChanged(roomId) {
      broadcastRoom(roomId);
    },
    notifyRoomClosed(roomId, error) {
      const socketIds = socketsByRoomId.get(roomId);
      if (!socketIds) {
        return;
      }

      for (const socketId of [...socketIds]) {
        const targetSocket = io.sockets.sockets.get(socketId);
        if (!targetSocket) {
          removeFromBucket(socketsByRoomId, roomId, socketId);
          continue;
        }

        targetSocket.emit("room:closed", { roomId, error });
        detachSocket(targetSocket, sessionBySocketId.get(targetSocket.id), false);
        eventTimestampsBySocketId.delete(targetSocket.id);
      }

      options.onRoomClosed?.(roomId, error);
    },
  };
}

function isRoomNotFound(error: unknown): boolean {
  return error instanceof RoomStoreError && error.code === "ROOM_NOT_FOUND";
}

function toSocketError(error: unknown): SocketErrorPayload {
  if (error instanceof RoomStoreError || error instanceof SocketHandlerError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unexpected server error.",
  };
}

function requireStringField(payload: unknown, field: string): string {
  const value =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)[field]
      : undefined;
  if (typeof value !== "string") {
    throw new SocketHandlerError("INVALID_PAYLOAD", `Invalid ${field}.`);
  }

  return value;
}

function requireOptionalStringField(payload: unknown, field: string): string | undefined {
  const value =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)[field]
      : undefined;
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new SocketHandlerError("INVALID_PAYLOAD", `Invalid ${field}.`);
  }

  return value;
}
