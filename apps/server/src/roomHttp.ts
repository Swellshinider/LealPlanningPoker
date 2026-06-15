import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  CreateRoomRequest,
  JoinRoomRequest,
  RenameParticipantRequest,
  RoomActionEnvelope,
  RoomErrorPayload,
  StoryRequest,
  VoteRequest
} from "@lealplanningpoker/shared";
import { RoomStore, RoomStoreError } from "./roomStore";
import { RoomRealtimeHub } from "./roomRealtimeHub";
import type { SocketHandlerController } from "./socketHandlers";

type RoomActionErrorCode = RoomStoreError["code"] | "INVALID_PAYLOAD" | "RATE_LIMITED";

class RoomActionError extends Error {
  constructor(readonly code: RoomActionErrorCode, message: string) {
    super(message);
    this.name = "RoomActionError";
  }
}

class HttpRoomRateLimiter {
  private readonly timestampsByKey = new Map<string, number[]>();

  assertWithinRateLimit(key: string): void {
    const now = Date.now();
    const recent = (this.timestampsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < 10_000);
    recent.push(now);
    this.timestampsByKey.set(key, recent);

    if (recent.length > 60) {
      throw new RoomActionError("RATE_LIMITED", "Too many requests. Try again shortly.");
    }
  }
}

export interface RegisterRoomHttpRoutesOptions {
  app: FastifyInstance;
  store: RoomStore;
  hub: RoomRealtimeHub;
  sockets: SocketHandlerController;
}

export function registerRoomHttpRoutes(options: RegisterRoomHttpRoutesOptions): void {
  const { app, store, hub, sockets } = options;
  const rateLimiter = new HttpRoomRateLimiter();

  const notifyRoomChanged = (roomId: string) => {
    hub.publishRoom(roomId);
    sockets.notifyRoomChanged(roomId);
  };

  const notifyRoomClosed = (roomId: string, error: RoomErrorPayload) => {
    hub.notifyRoomClosed(roomId, error);
    sockets.notifyRoomClosed(roomId, error);
  };

  app.get("/api/rooms/:roomId/events", async (request, reply) => {
    try {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      await hub.openStream(reply, roomId, participantToken);
    } catch (error) {
      return sendFailure(reply, error);
    }
  });

  app.get("/api/rooms/:roomId/snapshot", async (request, reply) => {
    return respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      hub.refreshPresence(roomId, participantToken);
      const snapshot = store.getSnapshot({
        roomId,
        participantToken
      });
      return { snapshot };
    });
  });

  app.post("/api/rooms", async (request, reply) =>
    respond(reply, () => {
      rateLimiter.assertWithinRateLimit(`ip:${request.ip}:create`);
      const body = requireRecordBody<CreateRoomRequest>(request);
      const result = store.createRoom({
        hostName: requireBodyString(body, "hostName")
      });
      hub.refreshPresence(result.roomId, result.participantToken);
      notifyRoomChanged(result.roomId);
      return result;
    })
  );

  app.post("/api/rooms/:roomId/join", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const body = requireRecordBody<JoinRoomRequest>(request);
      const knownParticipantToken = requireOptionalBodyString(body, "participantToken");
      rateLimiter.assertWithinRateLimit(knownParticipantToken ? `participant:${knownParticipantToken}` : `ip:${request.ip}:join`);
      const result = store.joinRoom({
        roomId,
        displayName: requireBodyString(body, "displayName"),
        participantToken: knownParticipantToken
      });
      hub.refreshPresence(result.roomId, result.participantToken);
      notifyRoomChanged(result.roomId);
      return result;
    })
  );

  app.post("/api/rooms/:roomId/participants/self/rename", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      hub.refreshPresence(roomId, participantToken);
      const body = requireRecordBody<RenameParticipantRequest>(request);
      const snapshot = store.renameParticipant({
        roomId,
        participantToken,
        displayName: requireBodyString(body, "displayName")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.post("/api/rooms/:roomId/votes", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      hub.refreshPresence(roomId, participantToken);
      const body = requireRecordBody<VoteRequest>(request);
      const snapshot = store.submitVote({
        roomId,
        participantToken,
        vote: requireBodyString(body, "vote")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.post("/api/rooms/:roomId/story", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const body = requireRecordBody<StoryRequest>(request);
      const snapshot = store.setStory({
        roomId,
        hostToken,
        story: requireBodyString(body, "story")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.post("/api/rooms/:roomId/reveal", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.revealVotes({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.post("/api/rooms/:roomId/reset", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.resetVotes({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.post("/api/rooms/:roomId/finalize", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.finalizeStory({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/create", async (request, reply) =>
    respond(reply, () => {
      rateLimiter.assertWithinRateLimit(`ip:${request.ip}:create`);
      const hostName = requireQueryString(request, "hostName");
      requireCacheBuster(request);
      const result = store.createRoom({ hostName });
      hub.refreshPresence(result.roomId, result.participantToken);
      notifyRoomChanged(result.roomId);
      return result;
    })
  );

  app.get("/api/compat/rooms/:roomId/join", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireOptionalQueryString(request, "participantToken");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(participantToken ? `participant:${participantToken}` : `ip:${request.ip}:join`);
      const result = store.joinRoom({
        roomId,
        displayName: requireQueryString(request, "displayName"),
        participantToken
      });
      hub.refreshPresence(result.roomId, result.participantToken);
      notifyRoomChanged(result.roomId);
      return result;
    })
  );

  app.get("/api/compat/rooms/:roomId/participants/self/rename", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      hub.refreshPresence(roomId, participantToken);
      const snapshot = store.renameParticipant({
        roomId,
        participantToken,
        displayName: requireQueryString(request, "displayName")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/:roomId/votes", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const participantToken = requireHeaderString(request, "x-participant-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${participantToken}`);
      hub.refreshPresence(roomId, participantToken);
      const snapshot = store.submitVote({
        roomId,
        participantToken,
        vote: requireQueryString(request, "vote")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/:roomId/story", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.setStory({
        roomId,
        hostToken,
        story: requireQueryString(request, "story")
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/:roomId/reveal", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.revealVotes({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/:roomId/reset", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.resetVotes({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.get("/api/compat/rooms/:roomId/finalize", async (request, reply) =>
    respond(reply, () => {
      const roomId = requirePathString(request, "roomId");
      const hostToken = requireHeaderString(request, "x-host-token");
      requireCacheBuster(request);
      rateLimiter.assertWithinRateLimit(`participant:${hostToken}`);
      hub.refreshPresence(roomId, hostToken);
      const snapshot = store.finalizeStory({
        roomId,
        hostToken
      });
      notifyRoomChanged(roomId);
      return { snapshot };
    })
  );

  app.setErrorHandler((error, _request, reply) => {
    if (reply.sent) {
      return;
    }

    void sendFailure(reply, error);
  });

  app.addHook("onClose", async () => {
    hub.close();
  });
}

function requireRecordBody<T extends object>(request: FastifyRequest): T {
  if (typeof request.body === "object" && request.body !== null && !Array.isArray(request.body)) {
    return request.body as T;
  }

  throw new RoomActionError("INVALID_PAYLOAD", "Invalid request body.");
}

function requirePathString(request: FastifyRequest, field: string): string {
  const params = request.params;
  if (typeof params === "object" && params !== null && !Array.isArray(params)) {
    const value = (params as Record<string, unknown>)[field];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${field}.`);
}

function requireBodyString(payload: object, field: string): string {
  const value = (payload as Record<string, unknown>)[field];
  if (typeof value === "string") {
    return value;
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${field}.`);
}

function requireOptionalBodyString(payload: object, field: string): string | undefined {
  const value = (payload as Record<string, unknown>)[field];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${field}.`);
}

function requireHeaderString(request: FastifyRequest, name: string): string {
  const value = request.headers[name];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${name}.`);
}

function requireQueryString(request: FastifyRequest, field: string): string {
  const value = getQueryValue(request, field);
  if (typeof value === "string") {
    return value;
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${field}.`);
}

function requireOptionalQueryString(request: FastifyRequest, field: string): string | undefined {
  const value = getQueryValue(request, field);
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  throw new RoomActionError("INVALID_PAYLOAD", `Invalid ${field}.`);
}

function requireCacheBuster(request: FastifyRequest): void {
  if (typeof getQueryValue(request, "_ts") === "string") {
    return;
  }

  throw new RoomActionError("INVALID_PAYLOAD", "Invalid _ts.");
}

function getQueryValue(request: FastifyRequest, field: string): unknown {
  const query = request.query;
  if (typeof query === "object" && query !== null && !Array.isArray(query)) {
    return (query as Record<string, unknown>)[field];
  }

  return undefined;
}

function respond<T extends object>(reply: FastifyReply, action: () => T): FastifyReply {
  try {
    return reply.code(200).send({
      ok: true,
      ...action()
    } satisfies RoomActionEnvelope<T>);
  } catch (error) {
    return sendFailure(reply, error);
  }
}

function sendFailure(reply: FastifyReply, error: unknown): FastifyReply {
  const payload = toRoomError(error);
  return reply.code(statusForErrorCode(payload.code)).send({
    ok: false,
    error: payload
  } satisfies RoomActionEnvelope<object>);
}

function toRoomError(error: unknown): RoomErrorPayload {
  if (error instanceof RoomStoreError || error instanceof RoomActionError) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unexpected server error."
  };
}

function statusForErrorCode(code: string): number {
  switch (code) {
    case "INVALID_PAYLOAD":
      return 400;
    case "PARTICIPANT_NOT_FOUND":
    case "NOT_HOST":
      return 403;
    case "ROOM_NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "ROOM_FULL":
    case "VOTES_LOCKED":
    case "ROUND_LOCKED":
    case "INVALID_VOTE":
    case "INVALID_STORY":
      return 409;
    default:
      return 500;
  }
}
