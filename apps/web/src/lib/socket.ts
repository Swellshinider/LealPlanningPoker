import { io, type Socket } from "socket.io-client";

export interface SocketErrorPayload {
  code: string;
  message: string;
}

export type SocketSuccessEnvelope<T extends object> = {
  ok: true;
} & T;

export interface SocketFailureEnvelope {
  ok: false;
  error: SocketErrorPayload;
}

export type SocketActionEnvelope<T extends object> = SocketSuccessEnvelope<T> | SocketFailureEnvelope;

export class RoomSocketError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RoomSocketError";
    this.code = code;
  }
}

export function getConnectionErrorMessage(): string {
  return "Unable to connect. Your network or corporate proxy may be blocking WebSocket traffic.";
}

function getSocketServerUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return window.location.origin;
}

export function createRoomSocket(): Socket {
  const socketServerUrl = getSocketServerUrl();

  return io(socketServerUrl, {
    autoConnect: false,
    path: "/socket.io",
    transports: ["websocket"]
  });
}

export function ensureSocketConnected(socket: Socket): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };

    const onConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
    socket.connect();
  });
}

export function emitWithAck<T extends object>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 10_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(timeoutMs).emit(
      event,
      payload,
      (error: Error | null, response: SocketActionEnvelope<T>) => {
        if (error) {
          reject(new RoomSocketError("TIMEOUT", error.message));
          return;
        }

        if (!response.ok) {
          reject(new RoomSocketError(response.error.code, response.error.message));
          return;
        }

        resolve(response as T);
      }
    );
  });
}
