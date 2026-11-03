import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { RoomStore } from "./roomStore";
import { buildHttpApp } from "./http";
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
  store: RoomStore;
  close: () => Promise<void>;
}

export async function createServerRuntime(
  options: ServerRuntimeOptions = {},
): Promise<ServerRuntime> {
  const staticRoot =
    options.staticRoot ?? resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
  let closeRoomStreams: (roomId: string, message: string) => void = () => {
    /* wired once the realtime hub exists */
  };
  const store =
    options.store ??
    new RoomStore({
      onRoomClosed: (roomId) =>
        closeRoomStreams(roomId, `Room ${roomId} closed after all participants left.`),
    });
  const app = buildHttpApp({
    logger: options.logger,
    staticRoot,
  });
  const realtimeHub = new RoomRealtimeHub({
    store,
  });
  closeRoomStreams = (roomId, message) => {
    realtimeHub.notifyRoomClosed(roomId, { code: "ROOM_NOT_FOUND", message });
  };
  registerRoomHttpRoutes({
    app,
    store,
    hub: realtimeHub,
  });
  const expiryInterval = setInterval(
    () => {
      const expiredRoomIds = store.expireRooms();
      for (const roomId of expiredRoomIds) {
        closeRoomStreams(roomId, `Room ${roomId} expired.`);
      }
    },
    Math.min(store.roomTtlMs, 60_000),
  );

  if (typeof expiryInterval.unref === "function") {
    expiryInterval.unref();
  }

  return {
    app,
    store,
    close: async () => {
      clearInterval(expiryInterval);
      store.close();
      await app.close();
    },
  };
}

export async function startServer(options: ServerRuntimeOptions = {}): Promise<ServerRuntime> {
  const runtime = await createServerRuntime(options);
  const port = options.port ?? Number(process.env.PORT ?? "3000");
  const host = options.host ?? process.env.HOST ?? "0.0.0.0";

  await runtime.app.listen({
    port,
    host,
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
