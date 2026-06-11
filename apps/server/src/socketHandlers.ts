import type { Server, Socket } from "socket.io";
import { type RoomSnapshot, type VoteCard } from "../../../packages/shared/src";
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

export function registerSocketHandlers(io: Server, store: RoomStore): void {
  const sessionBySocketId = new Map<string, SocketSession>();
  const socketsByRoomId = new Map<string, Set<string>>();
  const socketsByToken = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    socket.on("room:create", (payload: CreateRoomPayload, ack?: ActionAck<{
      roomId: string;
      participantToken: string;
      hostToken: string;
      snapshot: RoomSnapshot;
    }>) => {
      respond(ack, () => {
        const result = store.createRoom({ hostName: payload.hostName });
        switchSession(socket, result.roomId, result.participantToken);
        broadcastRoom(result.roomId, socket.id);
        return {
          roomId: result.roomId,
          participantToken: result.participantToken,
          hostToken: result.hostToken,
          snapshot: result.snapshot
        };
      });
    });

    socket.on("room:join", (payload: JoinRoomPayload, ack?: ActionAck<{
      roomId: string;
      participantToken: string;
      snapshot: RoomSnapshot;
    }>) => {
      respond(ack, () => {
        const result = store.joinRoom({
          roomId: payload.roomId,
          displayName: payload.displayName,
          participantToken: payload.participantToken
        });
        switchSession(socket, result.roomId, result.participantToken);
        broadcastRoom(result.roomId, socket.id);
        return {
          roomId: result.roomId,
          participantToken: result.participantToken,
          snapshot: result.snapshot
        };
      });
    });

    socket.on("room:sync", (payload: SyncRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
      respond(ack, () => {
        const snapshot = store.syncRoom(payload);
        switchSession(socket, payload.roomId, payload.participantToken);
        broadcastRoom(payload.roomId, socket.id);
        return { snapshot };
      });
    });

    socket.on(
      "participant:rename",
      (payload: RenameParticipantPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(ack, () => {
          const snapshot = store.renameParticipant(payload);
          broadcastRoom(payload.roomId, socket.id);
          return { snapshot };
        });
      }
    );

    socket.on("vote:submit", (payload: VotePayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
      respond(ack, () => {
        const snapshot = store.submitVote(payload);
        broadcastRoom(payload.roomId, socket.id);
        return { snapshot };
      });
    });

    socket.on(
      "host:story:set",
      (payload: StoryPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(ack, () => {
          const snapshot = store.setStory(payload);
          broadcastRoom(payload.roomId, socket.id);
          return { snapshot };
        });
      }
    );

    socket.on(
      "host:reveal",
      (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
        respond(ack, () => {
          const snapshot = store.revealVotes(payload);
          broadcastRoom(payload.roomId, socket.id);
          return { snapshot };
        });
      }
    );

    socket.on("host:reset", (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
      respond(ack, () => {
        const snapshot = store.resetVotes(payload);
        broadcastRoom(payload.roomId, socket.id);
        return { snapshot };
      });
    });

    socket.on("host:finalize", (payload: HostRoomPayload, ack?: ActionAck<{ snapshot: RoomSnapshot }>) => {
      respond(ack, () => {
        const snapshot = store.finalizeStory(payload);
        broadcastRoom(payload.roomId, socket.id);
        return { snapshot };
      });
    });

    socket.on("disconnect", () => {
      detachSocket(socket);
    });
  });

  function respond<T extends object>(ack: ActionAck<T> | undefined, action: () => T): void {
    if (!ack) {
      action();
      return;
    }

    try {
      ack({ ok: true, ...action() } as SuccessEnvelope<T>);
    } catch (error) {
      ack({ ok: false, error: toSocketError(error) });
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

  function detachSocket(socket: Socket, session = sessionBySocketId.get(socket.id)): void {
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

    try {
      store.leaveRoom({
        roomId: session.roomId,
        participantToken: session.participantToken
      });
      broadcastRoom(session.roomId, socket.id);
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
          error: toSocketError(error)
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
}

function isRoomNotFound(error: unknown): boolean {
  return error instanceof RoomStoreError && error.code === "ROOM_NOT_FOUND";
}

function toSocketError(error: unknown): SocketErrorPayload {
  if (error instanceof RoomStoreError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unexpected server error."
  };
}
