# LealPlanningPoker

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Node](https://img.shields.io/badge/Node-%3E%3D20-green.svg)

Self-hosted planning poker for agile teams. Create a room, share the link, vote, reveal together, and archive the result -- no accounts required.

## Features

- **Real-time voting** -- SSE-powered live updates with automatic HTTP polling fallback
- **Fibonacci deck** -- Standard 0, 1, 2, 3, 5, 8, 13, 21, ?, coffee plus custom numeric votes
- **Host controls** -- Set stories, reveal votes, reset rounds, finalize and archive results
- **Session history** -- Finalized rounds are archived with vote summaries and confidence scores
- **Room sharing** -- Share a link or QR code to invite participants instantly
- **Dark mode** -- Automatic system detection with manual toggle
- **Docker ready** -- Single-container production deployment
- **No accounts** -- Ephemeral rooms with display names, no sign-up or database needed

## Quick Start

**Prerequisites:** [Node.js](https://nodejs.org/) >= 20, [pnpm](https://pnpm.io/) >= 9

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser. The dev server proxies API requests to the backend on port 3000.

## Architecture

```
LealPlanningPoker/
  apps/
    server/        Fastify + SSE backend (in-memory room state)
    web/           React + Vite frontend
  packages/
    shared/        Shared types, deck definitions, domain logic
```

| Layer      | Stack                                    |
|------------|------------------------------------------|
| Frontend   | React 18, Vite 5, plain CSS              |
| Backend    | Fastify 4, Server-Sent Events, Socket.IO |
| Shared     | TypeScript 5, domain types and utilities |
| Monorepo   | pnpm workspaces                          |

**Transport:** The primary real-time channel is SSE (`GET /api/rooms/:roomId/events`). If SSE is blocked (corporate proxy, firewall), the client automatically falls back to HTTP polling every 3 seconds. Every POST endpoint also has a GET-compatible fallback under `/api/compat/` for restrictive environments.

## Development

```bash
pnpm dev          # Start dev servers (web + backend)
pnpm build        # Production build
pnpm test         # Run test suite
pnpm typecheck    # Type-check all workspaces
```

## Production

### Docker

```bash
docker build -t lealplanningpoker .
docker run -p 3000:3000 lealplanningpoker
```

The container serves the built frontend and API on port 3000.

### Environment

| Variable | Default | Description               |
|----------|---------|---------------------------|
| `PORT`   | `3000`  | HTTP listen port          |

## How It Works

1. **Create a room** -- Enter a display name and click "Create room". You become the host.
2. **Share the link** -- Copy the room URL or show the QR code for mobile participants.
3. **Vote** -- Each player selects a card from the Fibonacci deck or enters a custom number.
4. **Reveal** -- The host reveals all votes simultaneously. Average and confidence are displayed.
5. **Finalize** -- Lock the round and archive it in the session history.
6. **Next round** -- Set a new story and repeat.

Room state is stored in memory and expires after 4 hours of inactivity. Server restarts clear all active sessions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Make your changes and ensure `pnpm typecheck && pnpm test` pass
4. Commit with a descriptive message
5. Open a pull request

## Author

This project is maintained by [Eduardo Leal](https://github.com/Swellshinider). Feel free to reach out with questions or suggestions!

## License

This project is licensed under the [MIT License](LICENSE).
