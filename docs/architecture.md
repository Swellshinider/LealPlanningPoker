# Architecture

Technical reference for LealPlanningPoker. For setup and commands, see the [README](../README.md).

## Workspaces

| Path              | Role                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `apps/server`     | Fastify 4 HTTP API, SSE hub, and in-memory room store.                                            |
| `apps/web`        | React 18 + Vite 5 single-page app with plain CSS (`src/styles/`).                                 |
| `packages/shared` | Types, deck definition, and pure domain logic (vote summary, visibility rules) used by both apps. |

Room state lives only in server memory (`apps/server/src/roomStore.ts`). There is no database and no account system.

## Room lifecycle and limits

| Rule                                   | Value                                | Source                                |
| -------------------------------------- | ------------------------------------ | ------------------------------------- |
| Idle expiry                            | 4 hours since the room's last update | `roomStore.ts` (`roomTtlMs`)          |
| Close after everyone is offline        | 30 minutes                           | `roomStore.ts` (`offlineCleanupMs`)   |
| Expiry sweep                           | Every `min(TTL, 60 s)`               | `main.ts`                             |
| Participants per room                  | 50                                   | `roomStore.ts`                        |
| Archived rounds per room               | 100 (oldest dropped)                 | `roomStore.ts`                        |
| Active reactions per room              | 40, each visible for 4 s             | `roomStore.ts`                        |
| Disconnect grace before marked offline | 8 s                                  | `roomRealtimeHub.ts`                  |
| SSE keepalive                          | Every 15 s                           | `roomRealtimeHub.ts`                  |
| Room code alphabet                     | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`   | `roomStore.ts` (`ROOM_CODE_ALPHABET`) |

A room starts in `voting` and moves through the phases `voting` → `revealed` → `finalized` (`RoomPhase` in `packages/shared/src/room.ts`). The story is optional and can be empty. Setting a story restarts `voting`, and reset always returns to `voting`. Votes of other players stay hidden until the round is revealed or finalized (`shouldRevealVoteForViewer`).

When the host goes offline, any connected participant can claim host from the offline host's seat until the original host reconnects. The current host can also transfer host to another connected participant.

## Voting rules

- **Deck:** `0, 1, 2, 3, 5, 8, 13, 21, ?, coffee` (`FIBONACCI_DECK` in `packages/shared/src/deck.ts`).
- **Custom votes:** whole numbers of up to 4 digits; leading zeros are stripped.
- **Average:** mean of numeric votes. `?` and `coffee` are excluded.
- **Confidence:** share of the most common numeric vote over (numeric votes + `?` votes), rounded to a percent. `coffee` is excluded. Shown on the table after reveal (`packages/shared/src/room.ts`, `calculateVoteResultStats`).
- **History entries** store the story, finalize time, a per-card vote summary, and each participant's vote. They do not store the average or confidence.
- **Reactions:** `👏 🔥 💯 🍅 👎 💀` (`THROWABLE_REACTION_EMOJIS`).
- **CSV export:** one row per participant per round, with columns `RoundId, Story, FinalizedAt, ParticipantId, ParticipantName, Vote`, UTF-8 BOM, CRLF line endings (`apps/web/src/lib/historyExport.ts`).

## HTTP API

Registered in `apps/server/src/roomHttp.ts` and `apps/server/src/http.ts`. Every mutating `POST` has a `GET` twin under `/api/compat/` for networks that block or mangle `POST` requests. The compat path mirrors the POST path, except room creation: `POST /api/rooms` ↔ `GET /api/compat/rooms/create`.

| POST (under `/api/rooms`)           | GET compat (under `/api/compat/rooms`) | Purpose                             |
| ----------------------------------- | -------------------------------------- | ----------------------------------- |
| `/`                                 | `/create`                              | Create a room (caller becomes host) |
| `/:roomId/join`                     | `/:roomId/join`                        | Join a room                         |
| `/:roomId/participants/self/rename` | `/:roomId/participants/self/rename`    | Rename yourself                     |
| `/:roomId/votes`                    | `/:roomId/votes`                       | Submit or change a vote             |
| `/:roomId/reactions/throw`          | `/:roomId/reactions/throw`             | Throw an emoji at a participant     |
| `/:roomId/host/transfer`            | `/:roomId/host/transfer`               | Transfer or claim host              |
| `/:roomId/story`                    | `/:roomId/story`                       | Set the current story (host)        |
| `/:roomId/reveal`                   | `/:roomId/reveal`                      | Reveal votes (host)                 |
| `/:roomId/reset`                    | `/:roomId/reset`                       | Clear votes (host)                  |
| `/:roomId/finalize`                 | `/:roomId/finalize`                    | Lock and archive the round (host)   |

Read-only endpoints:

| Method and path                   | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `GET /api/rooms/:roomId/events`   | Server-Sent Events stream of room snapshots   |
| `GET /api/rooms/:roomId/snapshot` | Single snapshot, used by the polling fallback |
| `GET /healthz`                    | Health check                                  |

Any other non-API path is served from `apps/web/dist` (the single-page app).

**Identity and limits.** There are no accounts. Participant requests identify the caller with the `x-participant-token` header, and host actions (`story`, `reveal`, `reset`, `finalize`) use `x-host-token`. Each token is limited to 60 requests per 10 seconds, and room creation is limited per client IP the same way. Exceeding the limit returns `RATE_LIMITED` (`HttpRoomRateLimiter` in `roomHttp.ts`).

## Client transport

`subscribeToRoom` in `apps/web/src/lib/roomTransport.ts` picks the transport:

1. **SSE first.** The client reads `GET /api/rooms/:roomId/events` with `fetch` and an `AbortController` (not `EventSource`).
2. **Polling fallback.** If the stream fails, the client polls `GET /api/rooms/:roomId/snapshot` every 3 s.
3. **Compat fallback for writes.** If a `POST` fails to connect, the client retries the same action through the matching `/api/compat/` `GET` route.

## Dev and production serving

- **Development:** `pnpm dev` runs the server on port 3000 and Vite on port 5173. Vite proxies `/api` and `/healthz` to `127.0.0.1:3000` (`apps/web/vite.config.ts`).
- **Production:** the [Dockerfile](../Dockerfile) builds all workspaces on `node:22-slim` and runs `pnpm --filter @lealplanningpoker/server start`. Fastify serves the API and the built frontend on one port (default 3000).

## Environment variables

| Variable | Default   | Effect              |
| -------- | --------- | ------------------- |
| `PORT`   | `3000`    | HTTP listen port    |
| `HOST`   | `0.0.0.0` | HTTP listen address |

The static frontend directory is not configurable by environment; it resolves to `apps/web/dist`.
