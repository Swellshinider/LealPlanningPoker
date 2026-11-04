<center>

# LealPlanningPoker

Self-hosted planning poker for agile teams. Create a room, share the link, vote, reveal together, and archive the result -- no accounts required.

</center>

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Production](#production)
- [How it works](#how-it-works)
- [Documentation](#documentation)
- [License](#license)
- [Author](#author)

## Features

- **Real-time voting** -- SSE-powered live updates with automatic HTTP polling fallback
- **Fibonacci deck** -- Standard 0, 1, 2, 3, 5, 8, 13, 21, ?, coffee plus custom whole-number votes (up to 4 digits)
- **Host controls** -- Set stories, reveal votes, clear votes, finalize and archive results
- **Host transfer** -- Pass host to another participant, or claim it when the host goes offline
- **Session history** -- Finalized rounds are archived with per-card vote summaries and each player's vote, with CSV export
- **Reactions** -- Throw emoji at other players from the table
- **Room sharing** -- Share a link or QR code to invite participants instantly
- **Dark mode** -- Automatic system detection with manual toggle
- **Docker ready** -- Single-container production deployment
- **No accounts** -- Ephemeral rooms with display names, no sign-up or database needed

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) >= 22, [pnpm](https://pnpm.io/) >= 10

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173> in your browser. The dev server proxies API requests to the backend on port 3000.

Prefer Docker? See [Production](#production).

## Architecture

```bash
LealPlanningPoker/
  apps/
    server/        Fastify HTTP + SSE backend (in-memory room state)
    web/           React + Vite frontend
  packages/
    shared/        Shared types, deck definitions, domain logic
```

| Layer    | Stack                                           |
| -------- | ----------------------------------------------- |
| Frontend | React 18, Vite 5, plain CSS                     |
| Backend  | Fastify 4, Server-Sent Events (browser channel) |
| Shared   | TypeScript 5, domain types and utilities        |
| Monorepo | pnpm workspaces                                 |

The browser receives updates over SSE and falls back to polling every 3 seconds if the stream is blocked. Routes, transport details, and room limits are in [docs/architecture.md](docs/architecture.md).

## Development

```bash
pnpm install        # Install dependencies
pnpm dev            # Start dev servers (web + backend)
pnpm build          # Production build
pnpm test           # Run the test suite once
pnpm test:watch     # Run tests in watch mode
pnpm typecheck      # Type-check all workspaces
pnpm lint           # Lint with ESLint
pnpm lint:fix       # Lint and auto-fix
pnpm format         # Format with Prettier
pnpm format:check   # Check formatting without writing
```

Before pushing, make sure `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass -- CI enforces the same gates.

If you have [Task](https://taskfile.dev/) installed, `task` lists shortcuts for the same commands: `task setup`, `task dev`, and `task check`, which runs every CI gate in order.

## Production

### Deploy with Docker

**Requirements:** [Docker](https://www.docker.com/) with the Compose plugin and [Task](https://taskfile.dev/), on the server, plus a checkout of this repository (it holds the compose files and `Taskfile.yml`).

The image is published to GHCR by the release workflow. The package is private, so log in once on the server with a token that can read packages:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
```

Then, from the checkout:

```bash
task install      # creates .env from .env.example, pulls the image, starts it
task update       # pulls the image for TAG and restarts
task uninstall    # stops and removes the stack
```

The container serves the built frontend and API on port 3000 and exposes `GET /healthz`; Docker marks it healthy from that endpoint. It runs as a non-root user with no extra capabilities.

- **Version:** `TAG=latest` in `.env` follows the newest release. Pin `TAG=v1.4.0` to upgrade only when you choose.
- **HTTPS:** set `SITE_ADDRESS` (for example `poker.example.com`) and `APP_PORT=127.0.0.1:3000` in `.env`, then run `task install`. A Caddy container obtains and renews the certificate. For a LAN-only host, uncomment `tls internal` in `docker/caddy/Caddyfile`.
- **Updates drop rooms.** Room state lives in memory, so every restart clears active rooms. Update when nobody is voting.

To build from the checkout instead of pulling, run `task up` (`task down`, `task logs`) and open <http://localhost:3000>. Plain `docker compose up --build` does the same.

### Releases

1. Bump the root `package.json` version and any shipped workspace package versions.
2. Commit the release version update.
3. Push a tag that is exactly `v` plus the root `package.json` version, such as `v1.1.3`.

The tag runs the shared verification workflow (`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`), publishes the Docker image to GHCR as `ghcr.io/swellshinider/lealplanningpoker:<tag>` and `:latest`, and creates or updates the GitHub Release with generated notes. The publish job fails if the tag and the root version differ. A version containing `-`, such as `1.1.3-rc.1` (tag `v1.1.3-rc.1`), publishes a GitHub prerelease.

### Environment

The app reads only `PORT` and `HOST`:

| Variable | Default   | Description         |
| -------- | --------- | ------------------- |
| `PORT`   | `3000`    | HTTP listen port    |
| `HOST`   | `0.0.0.0` | HTTP listen address |

The deployment is configured through `.env` (see `.env.example`), read by Docker Compose and the Taskfile:

| Variable       | Default  | Description                                                            |
| -------------- | -------- | ---------------------------------------------------------------------- |
| `TAG`          | `latest` | Published image tag used by `task install` and `task update`           |
| `APP_PORT`     | `3000`   | Host port for the app. Use `127.0.0.1:3000` behind the HTTPS proxy     |
| `SITE_ADDRESS` | empty    | Hostname for HTTPS. When set, `task install`/`update` also start Caddy |

## How it works

1. **Create a room** -- Enter a display name and click "Create room". You become the host.
2. **Share the link** -- Copy the room URL or show the QR code for mobile participants.
3. **Vote** -- Each player selects a card from the Fibonacci deck or enters a custom number.
4. **Reveal** -- The host reveals all votes simultaneously. Average and confidence are displayed.
5. **Finalize** -- Lock the round and archive it in the session history.
6. **Next round** -- Set a new story and repeat.

Room state is stored in memory. A room expires after 4 hours of inactivity, closes 30 minutes after every participant goes offline, and holds up to 50 participants and 100 archived rounds. Server restarts clear all active sessions.

## Documentation

- [docs/architecture.md](docs/architecture.md) -- routes, transport, room lifecycle and limits
- [docs/CHANGELOG.md](docs/CHANGELOG.md) -- release history
- [AGENTS.md](AGENTS.md) -- instructions for AI coding agents
- [docs/agents/decisions.md](docs/agents/decisions.md) -- accepted decisions and open questions

## License

Licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0-only).

## Author

This project is maintained by Eduardo Leal. Reach out at <eduardoleal.contact@gmail.com> with questions or suggestions.
