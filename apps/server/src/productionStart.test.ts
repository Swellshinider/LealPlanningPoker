import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const rootDir = resolve(import.meta.dirname, "../../..");
const buildCommand =
  process.platform === "win32"
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", "pnpm build"] }
    : { command: "pnpm", args: ["build"] };

describe("production server build output", () => {
  const children: Array<ReturnType<typeof spawn>> = [];

  afterEach(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill();
      }
    }
  });

  it(
    "starts under plain Node after a successful build",
    async () => {
      const buildResult = spawnSync(buildCommand.command, buildCommand.args, {
        cwd: rootDir,
        encoding: "utf8",
        env: process.env
      });

      expect(buildResult.error).toBeUndefined();
      expect(buildResult.status).toBe(0);

      const entryPath = resolve(rootDir, "apps/server/dist/main.js");

      await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(process.execPath, [entryPath], {
          cwd: rootDir,
          env: {
            ...process.env,
            HOST: "127.0.0.1",
            PORT: "0"
          },
          stdio: ["ignore", "pipe", "pipe"]
        });
        children.push(child);

        let settled = false;
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        const timeout = setTimeout(() => {
          if (settled) {
            return;
          }

          settled = true;
          child.kill();
          rejectPromise(
            new Error(
              `Timed out waiting for server startup.\nstdout:\n${Buffer.concat(stdout).toString("utf8")}\nstderr:\n${Buffer.concat(stderr).toString("utf8")}`
            )
          );
        }, 10_000);

        child.stdout.on("data", (chunk: Buffer) => {
          stdout.push(chunk);
          if (Buffer.concat(stdout).toString("utf8").includes("LealPlanningPoker server listening")) {
            if (settled) {
              return;
            }

            settled = true;
            clearTimeout(timeout);
            child.kill();
            resolvePromise();
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          stderr.push(chunk);
        });

        child.on("exit", (code) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeout);
          rejectPromise(
            new Error(
              `Server exited before startup with code ${code}.\nstdout:\n${Buffer.concat(stdout).toString("utf8")}\nstderr:\n${Buffer.concat(stderr).toString("utf8")}`
            )
          );
        });
      });
    },
    30_000
  );
});
