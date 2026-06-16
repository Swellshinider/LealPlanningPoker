# LealPlanningPoker

[![CI](https://github.com/Swellshinider/LealPlanningPoker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Swellshinider/LealPlanningPoker/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Swellshinider/LealPlanningPoker/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/Swellshinider/LealPlanningPoker/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)]()
[![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Self-hosted planning poker for agile teams. Create a room, share the link, vote, reveal together, and archive the result -- no accounts required.

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Production](#production)
- [How it works](#how-it-works)
- [Contributing](#contributing)
- [Security](#security)
- [Author](#author)
- [License](#license)

## Features

- **Real-time voting** -- SSE-powered live updates with automatic HTTP polling fallback
- **Fibonacci deck** -- Standard 0, 1, 2, 3, 5, 8, 13, 21, ?, coffee plus custom numeric votes
- **Host controls** -- Set stories, reveal votes, clear votes, finalize and archive results
- **Session history** -- Finalized rounds are archived with vote summaries and confidence scores
- **Room sharing** -- Share a link or QR code to invite participants instantly
- **Dark mode** -- Automatic system detection with manual toggle
- **Docker ready** -- Single-container production deployment
- **No accounts** -- Ephemeral rooms with display names, no sign-up or database needed

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) >= 20, [pnpm](https://pnpm.io/) >= 9

```bash
git clone https://github.com/Swellshinider/LealPlanningPoker.git
cd LealPlanningPoker
pnpm install
pnpm dev
```

Open <http://localhost:5173> in your browser. The dev server proxies API requests to the backend on port 3000.

Prefer Docker? See [Production](#production).

## Architecture

```bash
LealPlanningPoker/
  apps/
    server/        Fastify + SSE backend (in-memory room state)
    web/           React + Vite frontend
  packages/
    shared/        Shared types, deck definitions, domain logic
```

| Layer    | Stack                                    |
| -------- | ---------------------------------------- |
| Frontend | React 18, Vite 5, plain CSS              |
| Backend  | Fastify 4, Server-Sent Events, Socket.IO |
| Shared   | TypeScript 5, domain types and utilities |
| Monorepo | pnpm workspaces                          |

**Transport:** The primary real-time channel is SSE (`GET /api/rooms/:roomId/events`). If SSE is blocked (corporate proxy, firewall), the client automatically falls back to HTTP polling every 3 seconds. Every POST endpoint also has a GET-compatible fallback under `/api/compat/` for restrictive environments.

## Development

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev servers (web + backend)
pnpm build        # Production build
pnpm test         # Run the test suite once
pnpm typecheck    # Type-check all workspaces
pnpm lint         # Lint with ESLint
pnpm format       # Format with Prettier
pnpm changeset    # Add a changeset (see CONTRIBUTING.md)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor workflow.

## Production

### Docker

```bash
docker build -t lealplanningpoker .
docker run -p 3000:3000 lealplanningpoker
```

Or with Docker Compose:

```bash
cp .env.example .env   # optional: customize
docker compose up --build
```

The container serves the built frontend and API on port 3000.

### Environment

| Variable | Default | Description      |
| -------- | ------- | ---------------- |
| `PORT`   | `3000`  | HTTP listen port |

See [`.env.example`](.env.example) for all available variables.

## How it works

1. **Create a room** -- Enter a display name and click "Create room". You become the host.
2. **Share the link** -- Copy the room URL or show the QR code for mobile participants.
3. **Vote** -- Each player selects a card from the Fibonacci deck or enters a custom number.
4. **Reveal** -- The host reveals all votes simultaneously. Average and confidence are displayed.
5. **Finalize** -- Lock the round and archive it in the session history.
6. **Next round** -- Set a new story and repeat.

Room state is stored in memory and expires after 4 hours of inactivity. Server restarts clear all active sessions.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch model, and the pull request process.

Before opening a PR, make sure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass -- CI enforces the same gates.

## Security

Found a security issue? Please report it privately -- see [SECURITY.md](SECURITY.md). Do not open a public issue.

## Author

This project is maintained by [Eduardo Leal](https://github.com/Swellshinider). Feel free to reach out with questions or suggestions!

## License

This project is licensed under the [MIT License](LICENSE).
