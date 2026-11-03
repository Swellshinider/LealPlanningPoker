import type { FastifyReply } from "fastify";
import type {
  RoomClosedEvent,
  RoomErrorPayload,
  RoomEventEnvelope,
} from "@lealplanningpoker/shared";
import { RoomStore, RoomStoreError } from "./roomStore";

const DISCONNECT_GRACE_MS = 8_000;
const KEEPALIVE_INTERVAL_MS = 15_000;

interface ParticipantPresence {
  activeStreamCount: number;
  connected: boolean;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

interface RoomSubscriber {
  id: string;
  roomId: string;
  participantToken: string;
  reply: FastifyReply;
  keepaliveTimer: ReturnType<typeof setInterval>;
}

export interface RoomRealtimeHubOptions {
  store: RoomStore;
}

export class RoomRealtimeHub {
  private readonly store: RoomStore;

  private readonly subscriberById = new Map<string, RoomSubscriber>();

  private readonly subscriberIdsByRoomId = new Map<string, Set<string>>();

  private readonly presenceByParticipantKey = new Map<string, ParticipantPresence>();

  private nextSubscriberId = 0;

  constructor(options: RoomRealtimeHubOptions) {
    this.store = options.store;
  }

  async openStream(reply: FastifyReply, roomId: string, participantToken: string): Promise<void> {
    const initialSnapshot = this.store.syncRoom({ roomId, participantToken });
    const revived = this.touchPresence(roomId, participantToken, {
      connected: true,
      holdOpen: true,
    });
    const subscriber = this.registerSubscriber(reply, roomId, participantToken);

    this.sendEvent(subscriber.reply, {
      type: "snapshot",
      snapshot: initialSnapshot,
    });

    if (revived) {
      this.publishRoom(roomId, subscriber.id);
    }
  }

  refreshPresence(roomId: string, participantToken: string): void {
    const current = this.presenceByParticipantKey.get(
      this.toParticipantKey(roomId, participantToken),
    );
    if (!current?.connected) {
      this.store.syncRoom({ roomId, participantToken });
    }

    const revived = this.touchPresence(roomId, participantToken, {
      connected: true,
      holdOpen: false,
    });

    if (revived) {
      this.publishRoom(roomId);
    }
  }

  publishRoom(roomId: string, excludeSubscriberId?: string): void {
    const subscriberIds = this.subscriberIdsByRoomId.get(roomId);
    if (!subscriberIds) {
      return;
    }

    for (const subscriberId of [...subscriberIds]) {
      if (subscriberId === excludeSubscriberId) {
        continue;
      }

      const subscriber = this.subscriberById.get(subscriberId);
      if (!subscriber) {
        subscriberIds.delete(subscriberId);
        continue;
      }

      try {
        const snapshot = this.store.getSnapshot({
          roomId,
          participantToken: subscriber.participantToken,
        });
        this.sendEvent(subscriber.reply, {
          type: "snapshot",
          snapshot,
        });
      } catch (error) {
        if (isRoomNotFound(error)) {
          this.notifyRoomClosed(roomId, toRoomError(error));
          return;
        }

        this.sendEvent(subscriber.reply, {
          type: "error",
          error: toRoomError(error),
        });
      }
    }
  }

  notifyRoomClosed(roomId: string, error: RoomErrorPayload): void {
    const subscriberIds = this.subscriberIdsByRoomId.get(roomId);
    if (!subscriberIds) {
      return;
    }

    const payload: RoomClosedEvent = { roomId, error };
    for (const subscriberId of [...subscriberIds]) {
      const subscriber = this.subscriberById.get(subscriberId);
      if (!subscriber) {
        continue;
      }

      this.sendEvent(subscriber.reply, {
        type: "closed",
        ...payload,
      });
      this.unregisterSubscriber(subscriberId);
    }

    for (const [key, presence] of [...this.presenceByParticipantKey.entries()]) {
      if (!key.startsWith(`${roomId}:`)) {
        continue;
      }

      if (presence.disconnectTimer) {
        clearTimeout(presence.disconnectTimer);
      }
      this.presenceByParticipantKey.delete(key);
    }
  }

  close(): void {
    for (const subscriberId of [...this.subscriberById.keys()]) {
      this.unregisterSubscriber(subscriberId);
    }

    for (const presence of this.presenceByParticipantKey.values()) {
      if (presence.disconnectTimer) {
        clearTimeout(presence.disconnectTimer);
      }
    }
    this.presenceByParticipantKey.clear();
  }

  private registerSubscriber(
    reply: FastifyReply,
    roomId: string,
    participantToken: string,
  ): RoomSubscriber {
    const subscriberId = `sse-${(this.nextSubscriberId += 1).toString().padStart(6, "0")}`;
    const keepaliveTimer = setInterval(() => {
      this.writeChunk(reply, ": keepalive\n\n");
    }, KEEPALIVE_INTERVAL_MS);

    if (typeof keepaliveTimer.unref === "function") {
      keepaliveTimer.unref();
    }

    reply.hijack();
    reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    const subscriber: RoomSubscriber = {
      id: subscriberId,
      roomId,
      participantToken,
      reply,
      keepaliveTimer,
    };

    this.subscriberById.set(subscriberId, subscriber);
    const roomSubscribers = this.subscriberIdsByRoomId.get(roomId) ?? new Set<string>();
    roomSubscribers.add(subscriberId);
    this.subscriberIdsByRoomId.set(roomId, roomSubscribers);

    reply.raw.on("close", () => {
      this.unregisterSubscriber(subscriberId);
    });

    return subscriber;
  }

  private unregisterSubscriber(subscriberId: string): void {
    const subscriber = this.subscriberById.get(subscriberId);
    if (!subscriber) {
      return;
    }

    this.subscriberById.delete(subscriberId);
    clearInterval(subscriber.keepaliveTimer);

    const roomSubscribers = this.subscriberIdsByRoomId.get(subscriber.roomId);
    roomSubscribers?.delete(subscriberId);
    if (roomSubscribers && roomSubscribers.size === 0) {
      this.subscriberIdsByRoomId.delete(subscriber.roomId);
    }

    this.touchPresence(subscriber.roomId, subscriber.participantToken, {
      connected: true,
      holdOpen: false,
      releaseStream: true,
    });

    if (!subscriber.reply.raw.writableEnded) {
      subscriber.reply.raw.end();
    }
  }

  private touchPresence(
    roomId: string,
    participantToken: string,
    options: {
      connected: boolean;
      holdOpen: boolean;
      releaseStream?: boolean;
    },
  ): boolean {
    const key = this.toParticipantKey(roomId, participantToken);
    const current = this.presenceByParticipantKey.get(key) ?? {
      activeStreamCount: 0,
      connected: false,
      disconnectTimer: null,
    };
    const wasConnected = current.connected;

    if (current.disconnectTimer) {
      clearTimeout(current.disconnectTimer);
      current.disconnectTimer = null;
    }

    if (options.holdOpen) {
      current.activeStreamCount += 1;
    } else if (options.releaseStream) {
      current.activeStreamCount = Math.max(0, current.activeStreamCount - 1);
    }

    current.connected = options.connected;

    if (current.activeStreamCount === 0) {
      current.disconnectTimer = setTimeout(() => {
        this.handlePresenceExpiry(roomId, participantToken);
      }, DISCONNECT_GRACE_MS);

      if (typeof current.disconnectTimer.unref === "function") {
        current.disconnectTimer.unref();
      }
    }

    this.presenceByParticipantKey.set(key, current);
    return !wasConnected && current.connected;
  }

  private handlePresenceExpiry(roomId: string, participantToken: string): void {
    const key = this.toParticipantKey(roomId, participantToken);
    const presence = this.presenceByParticipantKey.get(key);
    if (!presence || presence.activeStreamCount > 0) {
      return;
    }

    presence.disconnectTimer = null;
    presence.connected = false;

    try {
      this.store.leaveRoom({
        roomId,
        participantToken,
      });
      this.publishRoom(roomId);
    } catch (error) {
      if (!isRoomNotFound(error)) {
        this.notifyRoomClosed(roomId, toRoomError(error));
      }
    } finally {
      this.presenceByParticipantKey.delete(key);
    }
  }

  private sendEvent(reply: FastifyReply, event: RoomEventEnvelope): void {
    this.writeChunk(reply, `data: ${JSON.stringify(event)}\n\n`);
  }

  private writeChunk(reply: FastifyReply, chunk: string): void {
    if (reply.raw.destroyed || reply.raw.writableEnded) {
      return;
    }

    reply.raw.write(chunk);
  }

  private toParticipantKey(roomId: string, participantToken: string): string {
    return `${roomId}:${participantToken}`;
  }
}

function isRoomNotFound(error: unknown): boolean {
  return error instanceof RoomStoreError && error.code === "ROOM_NOT_FOUND";
}

function toRoomError(error: unknown): RoomErrorPayload {
  if (error instanceof RoomStoreError) {
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
