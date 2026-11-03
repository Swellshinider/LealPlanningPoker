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

## Production

### Docker

```bash
docker build -t lealplanningpoker .
docker run -p 3000:3000 lealplanningpoker
```

Or with Docker Compose:

```bash
docker compose up --build
```

The container serves the built frontend and API on port 3000, and exposes `GET /healthz` for health checks. Deploy the built image to your own server.

### Releases

1. Bump the root `package.json` version and any shipped workspace package versions.
2. Commit the release version update.
3. Push a tag that is exactly `v` plus the root `package.json` version, such as `v1.1.3`.

The tag runs the shared verification workflow (`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`) and creates or updates the GitHub Release with generated notes. The release job fails if the tag and the root version differ. A version containing `-`, such as `1.1.3-rc.1` (tag `v1.1.3-rc.1`), publishes a GitHub prerelease.

### Environment

| Variable | Default   | Description         |
| -------- | --------- | ------------------- |
| `PORT`   | `3000`    | HTTP listen port    |
| `HOST`   | `0.0.0.0` | HTTP listen address |

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

## Author

This project is maintained by Eduardo Leal. Reach out at <eduardoleal.contact@gmail.com> with questions or suggestions.
