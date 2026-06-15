import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Server, type ServerOptions } from "socket.io";
import { RoomStore } from "./roomStore";
import { buildHttpApp } from "./http";
import { registerSocketHandlers } from "./socketHandlers";
import { RoomRealtimeHub } from "./roomRealtimeHub";
import { registerRoomHttpRoutes } from "./roomHttp";

export interface ServerRuntimeOptions {
  logger?: boolean;
  port?: number;
  host?: string;
  staticRoot?: string;
  store?: RoomStore;
}

export interface ServerRuntime {
  app: ReturnType<typeof buildHttpApp>;
  io: Server;
  store: RoomStore;
  close: () => Promise<void>;
}

const DEVELOPMENT_SOCKET_ORIGINS = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^http:\/\/\[::1\](?::\d+)?$/,
  /^http:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(?::\d+)?$/,
  /^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/
];

function shouldAllowDevelopmentSocketOrigins(): boolean {
  const runtimeArgs = [...process.execArgv, ...process.argv];

  return process.env.NODE_ENV === "development" || runtimeArgs.includes("--conditions=development");
}

export async function createServerRuntime(options: ServerRuntimeOptions = {}): Promise<ServerRuntime> {
  const staticRoot =
    options.staticRoot ?? resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
  let broadcastOfflineClosed: (roomId: string) => void = () => {
    /* wired after socket handlers are registered */
  };
  const store =
    options.store ??
    new RoomStore({
      onRoomClosed: (roomId) => broadcastOfflineClosed(roomId)
    });
  const app = buildHttpApp({
    logger: options.logger,
    staticRoot
  });
  const socketOptions: Partial<ServerOptions> = {
    path: "/socket.io"
  };

  if (shouldAllowDevelopmentSocketOrigins()) {
    socketOptions.cors = {
      origin: DEVELOPMENT_SOCKET_ORIGINS
    };
  }

  const io = new Server(app.server, socketOptions);
  const realtimeHub = new RoomRealtimeHub({
    store
  });
  const socketHandlers = registerSocketHandlers(io, store, {
    onRoomChanged: (roomId) => {
      realtimeHub.publishRoom(roomId);
    },
    onRoomClosed: (roomId, error) => {
      realtimeHub.notifyRoomClosed(roomId, error);
    }
  });
  broadcastOfflineClosed = (roomId) => {
    socketHandlers.notifyRoomClosed(roomId, {
      code: "ROOM_NOT_FOUND",
      message: `Room ${roomId} closed after all participants left.`
    });
  };
  realtimeHub.setOnRoomChanged((roomId) => {
    socketHandlers.notifyRoomChanged(roomId);
  });
  registerRoomHttpRoutes({
    app,
    store,
    hub: realtimeHub,
    sockets: socketHandlers
  });
  const expiryInterval = setInterval(() => {
    const expiredRoomIds = store.expireRooms();
    for (const roomId of expiredRoomIds) {
      socketHandlers.notifyRoomClosed(roomId, {
        code: "ROOM_NOT_FOUND",
        message: `Room ${roomId} expired.`
      });
    }
  }, Math.min(store.roomTtlMs, 60_000));

  if (typeof expiryInterval.unref === "function") {
    expiryInterval.unref();
  }

  return {
    app,
    io,
    store,
    close: async () => {
      clearInterval(expiryInterval);
      store.close();
      io.close();
      await app.close();
    }
  };
}

export async function startServer(options: ServerRuntimeOptions = {}): Promise<ServerRuntime> {
  const runtime = await createServerRuntime(options);
  const port = options.port ?? Number(process.env.PORT ?? "3000");
  const host = options.host ?? process.env.HOST ?? "0.0.0.0";

  await runtime.app.listen({
    port,
    host
  });

  if (options.logger ?? true) {
    console.log(`LealPlanningPoker server listening on http://${host}:${port}`);
  }

  return runtime;
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentPath = resolve(fileURLToPath(import.meta.url));

if (entryPath && entryPath === currentPath) {
  void startServer();
}
