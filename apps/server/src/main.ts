import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Server } from "socket.io";
import { RoomStore } from "./roomStore";
import { buildHttpApp } from "./http";
import { registerSocketHandlers } from "./socketHandlers";

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

export async function createServerRuntime(options: ServerRuntimeOptions = {}): Promise<ServerRuntime> {
  const staticRoot =
    options.staticRoot ?? resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
  const store = options.store ?? new RoomStore();
  const app = buildHttpApp({
    logger: options.logger,
    staticRoot
  });
  const io = new Server(app.server, {
    path: "/socket.io"
  });

  registerSocketHandlers(io, store);

  return {
    app,
    io,
    store,
    close: async () => {
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
