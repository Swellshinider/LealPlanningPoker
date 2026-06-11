import { existsSync } from "node:fs";
import { join } from "node:path";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";

export interface HttpAppOptions {
  logger?: boolean;
  staticRoot?: string;
}

export function buildHttpApp(options: HttpAppOptions = {}) {
  const app = fastify({
    logger: options.logger ?? false
  });

  app.get("/healthz", async () => ({
    ok: true,
    uptime: process.uptime()
  }));

  const indexPath = options.staticRoot ? join(options.staticRoot, "index.html") : undefined;
  if (options.staticRoot && indexPath && existsSync(indexPath)) {
    app.register(fastifyStatic, {
      root: options.staticRoot,
      index: false
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.method !== "GET") {
        return reply.code(404).send({
          ok: false,
          error: "Not found"
        });
      }

      return reply.type("text/html").sendFile("index.html");
    });
  }

  return app;
}
