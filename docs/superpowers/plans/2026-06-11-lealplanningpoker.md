# LealPlanningPoker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple, animated, end-to-end planning poker web app in a monorepo: anonymous rooms, host-controlled voting, live reveal/reset/finalize flow, and ephemeral in-memory sessions.

**Architecture:** Use a `pnpm` workspace with three packages: a React/Vite web app, a Fastify + Socket.IO server, and a shared TypeScript package for room/state types and deck constants. The server owns room state as the source of truth and broadcasts snapshots to clients; the client is a thin realtime UI with local optimistic interaction only for immediate feedback.

**Tech Stack:** `pnpm`, TypeScript, React, Vite, Fastify, Socket.IO, Docker.

---

### Task 1: Scaffold the monorepo and shared build config

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `apps/web/package.json`
- Create: `apps/server/package.json`
- Create: `packages/shared/package.json`
- Create: `README.md`

- [ ] **Step 1: Define the workspace and package boundaries**

```json
{
  "name": "lealplanningpoker",
  "private": true,
  "packageManager": "pnpm@11.5.2",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm --parallel --filter @lealplanningpoker/server --filter @lealplanningpoker/web dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  }
}
```

- [ ] **Step 2: Add shared TypeScript compiler settings**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 3: Run the workspace bootstrap commands**

Run:
```bash
pnpm install
```

Expected: lockfile is created and workspace packages resolve cleanly.

### Task 2: Define the shared room model and deck constants

**Files:**
- Create: `packages/shared/src/deck.ts`
- Create: `packages/shared/src/room.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Implement the minimal shared types and helpers**

Expected exports:
```ts
export const FIBONACCI_DECK = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"] as const;

export type VoteCard = (typeof FIBONACCI_DECK)[number];
export type RoomPhase = "lobby" | "voting" | "revealed" | "finalized";
```

State shape:
`roomId`, `hostToken`, `hostName`, `story`, `phase`, `participants`, `votes`, `history`, `updatedAt`.

- [ ] **Step 2: Validate the shared package by typechecking it through the workspace build**

Run:
```bash
pnpm --filter @lealplanningpoker/shared typecheck
```

Expected: the shared package compiles cleanly and the exports are stable enough to use from both apps.

### Task 3: Build the realtime server and room state machine

**Files:**
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/roomStore.ts`
- Create: `apps/server/src/socketHandlers.ts`
- Create: `apps/server/src/http.ts`

- [ ] **Step 1: Implement the in-memory store and authoritative transition functions**

The store should own:
`createRoom`, `joinRoom`, `leaveRoom`, `submitVote`, `revealVotes`, `resetVotes`, `finalizeStory`, `setStory`, `renameParticipant`, `expireRooms`.

The server should reject invalid transitions instead of silently mutating state:
participants cannot reveal, only the host can change the room phase, and votes cannot be changed after reveal unless the host resets the round.

- [ ] **Step 2: Wire Socket.IO events to the state machine**

Events to support:
`room:create`, `room:join`, `participant:rename`, `vote:submit`, `host:story:set`, `host:reveal`, `host:reset`, `host:finalize`, `room:sync`.

Each mutation should broadcast a full room snapshot so the client stays simple.

- [ ] **Step 3: Add the HTTP server and static asset serving**

The server should:
`/healthz` for uptime checks, serve the built web app in production, and bind to a single port for Docker and local development.

- [ ] **Step 4: Validate the server with a build and manual socket smoke check**

Run:
```bash
pnpm --filter @lealplanningpoker/server build
```

Expected: the server builds successfully and a manual socket smoke check confirms room create/join/vote/reveal/reset/finalize work.

### Task 4: Build the React/Vite client and animated room experience

**Files:**
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/lib/socket.ts`
- Create: `apps/web/src/lib/roomView.ts`
- Create: `apps/web/src/components/JoinPanel.tsx`
- Create: `apps/web/src/components/RoomBoard.tsx`
- Create: `apps/web/src/components/VoteCard.tsx`
- Create: `apps/web/src/components/HistoryPanel.tsx`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: Implement the client shell and realtime wiring**

The client should:
join by room link or room code, create a room for the host, persist the display name locally, and keep its UI derived from server snapshots instead of duplicating room logic.

- [ ] **Step 2: Implement the actual planning-poker screens**

Required UI states:
landing/join, host room, participant room, revealed votes, finalized history view, disconnected/reconnecting state, empty-room state.

Motion requirements:
card flip on reveal, subtle staggered entry for participants, animated vote selection, and a brief finalize transition that feels intentional without becoming flashy.

- [ ] **Step 3: Add mobile-first layout and accessibility behavior**

The layout must keep controls visible on narrow screens, preserve readable tap targets, and support keyboard interaction for vote selection and room control buttons.

- [ ] **Step 4: Validate the client with a build and manual browser smoke check**

Run:
```bash
pnpm --filter @lealplanningpoker/web build
```

Expected: the production build succeeds and a manual browser smoke check confirms the full room flow.

### Task 5: Add production packaging, docs, and end-to-end verification

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Update: `README.md`
- Update: `apps/server/package.json`
- Update: `apps/web/package.json`
- Update: root `package.json`

- [ ] **Step 1: Add a single-container production build**

The Docker image should install workspace deps, build both packages, and start the server process that serves the web bundle.

- [ ] **Step 2: Document the local and Docker run commands**

Include:
`pnpm install`, `pnpm dev`, `pnpm build`, `docker build -t lealplanningpoker .`, `docker run -p 3000:3000 lealplanningpoker`.

- [ ] **Step 3: Run the full verification pass**

Run:
```bash
pnpm typecheck
pnpm build
```

Expected: the repo builds end to end and the Docker image can start the app successfully.

## Verification Plan

1. Shared package: typecheck and build integration.
2. Server: build plus manual socket smoke check for room lifecycle, host-only actions, disconnect/reconnect, inactivity expiry.
3. Client: build plus manual browser smoke check for join/create flow, voting, reveal/reset/finalize, history rendering, reconnect state.
4. Build: `pnpm build` plus Docker image smoke test.

## Assumptions

- Anonymous rooms are the only supported session model.
- Rooms are ephemeral and in-memory; restarts clear active sessions and history.
- One host owns room control through a private token.
- The default deck is Scrum Fibonacci.
- The UI language is English.
- The app should feel focused and playful, not game-like or enterprise-heavy.
- The monorepo stays intentionally small: no database, no auth provider, no external realtime service.
- Automated unit tests are intentionally deferred for now; verification is build- and smoke-check-based.
