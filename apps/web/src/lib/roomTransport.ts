import type {
  CreateRoomRequest,
  JoinRoomRequest,
  RenameParticipantRequest,
  RoomActionEnvelope,
  RoomClosedEvent,
  RoomErrorPayload,
  RoomEventEnvelope,
  RoomSnapshot,
  StoryRequest,
  ThrowReactionRequest,
  VoteRequest
} from "@lealplanningpoker/shared";

export class RoomRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RoomRequestError";
    this.code = code;
  }
}

export interface RoomSubscription {
  close: () => void;
}

export interface RoomSubscriptionOptions {
  roomId: string;
  participantToken: string;
  onClosed: (payload: RoomClosedEvent) => void;
  onError: (error: RoomRequestError) => void;
  onModeChange: (mode: "sse" | "polling") => void;
  onSnapshot: (snapshot: RoomSnapshot) => void;
}

export function getConnectionErrorMessage(): string {
  return "Unable to connect. Your network or corporate proxy may be blocking room traffic.";
}

export async function createRoom(payload: CreateRoomRequest): Promise<{
  roomId: string;
  participantToken: string;
  hostToken: string;
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: "/api/rooms",
    compatPath: "/api/compat/rooms/create",
    body: payload,
    compatQuery: {
      hostName: payload.hostName
    }
  });
}

export async function joinRoom(roomId: string, payload: JoinRoomRequest): Promise<{
  roomId: string;
  participantToken: string;
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/join`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/join`,
    body: payload,
    compatQuery: {
      displayName: payload.displayName,
      participantToken: payload.participantToken
    }
  });
}

export async function syncRoom(roomId: string, participantToken: string): Promise<{ snapshot: RoomSnapshot }> {
  return requestJson<{ snapshot: RoomSnapshot }>(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/snapshot`, {
    headers: {
      "x-participant-token": participantToken
    },
    method: "GET"
  });
}

export async function renameParticipant(roomId: string, participantToken: string, payload: RenameParticipantRequest): Promise<{
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/participants/self/rename`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/participants/self/rename`,
    body: payload,
    compatQuery: {
      displayName: payload.displayName
    },
    headers: {
      "x-participant-token": participantToken
    }
  });
}

export async function submitVote(roomId: string, participantToken: string, payload: VoteRequest): Promise<{
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/votes`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/votes`,
    body: payload,
    compatQuery: {
      vote: payload.vote ?? undefined
    },
    headers: {
      "x-participant-token": participantToken
    }
  });
}

export async function throwReaction(
  roomId: string,
  participantToken: string,
  payload: ThrowReactionRequest
): Promise<{
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/reactions/throw`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/reactions/throw`,
    body: payload,
    compatQuery: {
      targetParticipantId: payload.targetParticipantId,
      emoji: payload.emoji
    },
    headers: {
      "x-participant-token": participantToken
    }
  });
}

export async function saveStory(roomId: string, hostToken: string, payload: StoryRequest): Promise<{
  snapshot: RoomSnapshot;
}> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/story`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/story`,
    body: payload,
    compatQuery: {
      story: payload.story
    },
    headers: {
      "x-host-token": hostToken
    }
  });
}

export async function revealVotes(roomId: string, hostToken: string): Promise<{ snapshot: RoomSnapshot }> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/reveal`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/reveal`,
    headers: {
      "x-host-token": hostToken
    }
  });
}

export async function resetVotes(roomId: string, hostToken: string): Promise<{ snapshot: RoomSnapshot }> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/reset`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/reset`,
    headers: {
      "x-host-token": hostToken
    }
  });
}

export async function finalizeStory(roomId: string, hostToken: string): Promise<{ snapshot: RoomSnapshot }> {
  return requestWithCompat({
    path: `/api/rooms/${encodeURIComponent(roomId)}/finalize`,
    compatPath: `/api/compat/rooms/${encodeURIComponent(roomId)}/finalize`,
    headers: {
      "x-host-token": hostToken
    }
  });
}

export function subscribeToRoom(options: RoomSubscriptionOptions): RoomSubscription {
  let closed = false;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let streamAbortController: AbortController | null = null;
  let pollingRequestInFlight = false;

  const stop = () => {
    closed = true;
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
    if (streamAbortController) {
      streamAbortController.abort();
      streamAbortController = null;
    }
  };

  const startPolling = () => {
    if (closed || pollingTimer) {
      return;
    }

    options.onModeChange("polling");
    const poll = async () => {
      if (closed || pollingRequestInFlight) {
        return;
      }

      pollingRequestInFlight = true;
      try {
        const response = await syncRoom(options.roomId, options.participantToken);
        options.onSnapshot(response.snapshot);
      } catch (error) {
        stop();
        options.onError(asRoomRequestError(error));
      } finally {
        pollingRequestInFlight = false;
      }
    };

    void poll();
    pollingTimer = setInterval(() => {
      void poll();
    }, 3_000);
  };

  const startStream = () => {
    if (closed) {
      return;
    }

    options.onModeChange("sse");
    streamAbortController = new AbortController();
    void streamRoomEvents({
      onEvent: (event) => {
        if (event.type === "snapshot") {
          options.onSnapshot(event.snapshot);
          return;
        }

        if (event.type === "closed") {
          stop();
          options.onClosed({
            roomId: event.roomId,
            error: event.error
          });
          return;
        }

        options.onError(new RoomRequestError(event.error.code, event.error.message));
      },
      participantToken: options.participantToken,
      roomId: options.roomId,
      signal: streamAbortController.signal
    }).catch((error: unknown) => {
      if (closed || isAbortError(error)) {
        return;
      }

      startPolling();
    });
  };

  startStream();

  return {
    close: stop
  };
}

interface CompatRequestOptions {
  path: string;
  compatPath: string;
  body?: object;
  compatQuery?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

class CompatFallbackError extends Error {}

async function requestWithCompat<T extends object>(options: CompatRequestOptions): Promise<T> {
  const hasBody = options.body !== undefined;

  try {
    return await requestJson<T>(`${getApiBaseUrl()}${options.path}`, {
      body: hasBody ? JSON.stringify(options.body) : undefined,
      headers: {
        ...(hasBody ? { "content-type": "application/json" } : {}),
        ...options.headers
      },
      method: "POST"
    });
  } catch (error) {
    if (!(error instanceof CompatFallbackError)) {
      throw asRoomRequestError(error);
    }
  }

  try {
    return await requestJson<T>(buildCompatUrl(options.compatPath, options.compatQuery), {
      headers: options.headers,
      method: "GET"
    });
  } catch (error) {
    throw asRoomRequestError(error);
  }
}

async function requestJson<T extends object>(url: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      ...init
    });
  } catch {
    throw new CompatFallbackError(getConnectionErrorMessage());
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as RoomActionEnvelope<T>;

    if (!payload.ok) {
      throw new RoomRequestError(payload.error.code, payload.error.message);
    }

    return payload;
  }

  if (!response.ok || init.method === "POST") {
    throw new CompatFallbackError(getConnectionErrorMessage());
  }

  throw new RoomRequestError("UNKNOWN_ERROR", "Unexpected server response.");
}

async function streamRoomEvents(options: {
  roomId: string;
  participantToken: string;
  signal: AbortSignal;
  onEvent: (event: RoomEventEnvelope) => void;
}): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(options.roomId)}/events`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "text/event-stream",
      "x-participant-token": options.participantToken
    },
    method: "GET",
    signal: options.signal
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
    throw new CompatFallbackError(getConnectionErrorMessage());
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) {
      throw new CompatFallbackError(getConnectionErrorMessage());
    }

    buffer += decoder.decode(chunk.value, { stream: true });
    const normalized = buffer.replace(/\r/g, "");
    const parts = normalized.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = parseSseEvent(part);
      if (event) {
        options.onEvent(event);
      }
    }
  }
}

function parseSseEvent(chunk: string): RoomEventEnvelope | null {
  const dataLines = chunk
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim());

  if (dataLines.length === 0) {
    return null;
  }

  return JSON.parse(dataLines.join("\n")) as RoomEventEnvelope;
}

function buildCompatUrl(path: string, query: Record<string, string | undefined> = {}): string {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? new URL(`${baseUrl}${path}`)
    : new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("_ts", Date.now().toString());

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  // In dev, the Vite dev server proxies /api and /socket.io to the backend
  // (see vite.config.ts), so we keep requests same-origin to avoid CORS.
  if (import.meta.env.DEV) {
    return "";
  }

  return window.location.origin;
}

function asRoomRequestError(error: unknown): RoomRequestError {
  if (error instanceof RoomRequestError) {
    return error;
  }

  return new RoomRequestError("NETWORK_ERROR", getConnectionErrorMessage());
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
