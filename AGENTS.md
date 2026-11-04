# AGENTS.md

Guidance for AI coding agents working in this repository. Humans should start with the [README](README.md).

## Layout

| Path              | What lives there                                                              |
| ----------------- | ----------------------------------------------------------------------------- |
| `packages/shared` | Types, deck, and pure domain rules. Source of truth for both apps.            |
| `apps/server`     | Fastify API, SSE hub (`roomRealtimeHub.ts`), in-memory `roomStore.ts`.        |
| `apps/web`        | React app: `components/`, `hooks/`, `lib/` (pure helpers), `styles/`.         |
| `docker/`         | Caddy config. Compose files, `Dockerfile` and `Taskfile.yml` are at the root. |

Routes, transport, room limits, and env vars: [docs/architecture.md](docs/architecture.md).
Accepted decisions and open questions: [docs/agents/decisions.md](docs/agents/decisions.md).

## Commands

Use `pnpm` (Node >= 22, pnpm 10). Do not switch package managers or regenerate the lockfile without a reason.

```bash
pnpm dev            # server on :3000, web on :5173
pnpm lint && pnpm format:check && pnpm typecheck && pnpm build && pnpm test
```

That is the order CI runs (`.github/workflows/verify.yml`). Run the narrowest check first (`pnpm vitest run <path>`), then the full set before opening a PR. `task check` runs the same set.

Deployment uses Docker and [Task](https://taskfile.dev/): `task up` builds and runs the image locally; `task install` / `task update` pull the published GHCR image on a server. Details: [docs/architecture.md](docs/architecture.md#deployment).

## Conventions

- Tests sit next to the code as `*.test.ts` and run with the root Vitest config.
- Put pure logic in `packages/shared` or `apps/web/src/lib`, not in components.
- Formatting is Prettier and linting is ESLint; both are enforced in CI.
- Record user-visible changes under `[Unreleased]` in [docs/CHANGELOG.md](docs/CHANGELOG.md).
- The repository is public under GPL-3.0-only (see `LICENSE`), but the app UI must not link to GitHub. Tests in `HelpPage.test.ts`, `JoinPanel.test.ts`, and `RoomBoard.test.ts` assert that no `github.com` link is rendered.
- Releases: the pushed tag must equal `v` + the root `package.json` version, or the release job fails.

## Docs

When behavior changes, update the document that owns the topic instead of adding a new one: user-facing setup in the README, technical reference in `docs/architecture.md`, decisions in `docs/agents/decisions.md`.
