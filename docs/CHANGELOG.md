# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- GNU General Public License v3.0 (`LICENSE`, `license` field in `package.json`, README section). The repository is now public.
- `Taskfile.yml` with `task install`, `update` and `uninstall` for the server, `task up`/`down`/`logs` for the local Docker stack, and `task setup`/`dev`/`check` shortcuts for development.
- The release workflow publishes the Docker image to GHCR (`:<tag>` and `:latest`).
- `docker-compose.prod.yml` (pulls the GHCR image, selected with `TAG`), an optional Caddy HTTPS overlay (`docker-compose.tls.yml`, `SITE_ADDRESS`) and `.env.example`.
- CI builds the Docker image and checks `/healthz` on every pull request.

### Changed

- The Docker image is multi-stage: production dependencies only, runs as a non-root user, starts with `node` instead of pnpm, and has a healthcheck. The compose service drops all Linux capabilities.
- The release tag/version check moved into the image publish job, so a mismatched tag publishes nothing.

## [1.3.0] - 04-11-2026

### Added

- "Invite your team" card with the room code and a copy-link button while the host is alone in a room.
- "Support the project" links (Ko-fi and Pix through Livepix) in the footer and on the Help page.
- The "Join" card has its own display name field. Opening an invite link now shows only the join form, with a "Create a new room instead" shortcut.

### Changed

- New rooms open straight in the voting phase, so everyone can pick a card as soon as they join. The story is optional and can be left empty; empty finalized rounds show as "Untitled round" in the archive.
- The story button reads "Save story" (or "Start next round" after a finalized round) instead of "Start voting". The Help page steps were updated to match.

### Removed

- The `lobby` room phase and the `INVALID_STORY` error.

## [1.2.0] - 03-11-2026

### Changed

- Visual refresh of the web app: design tokens (neutral color ramp, 4px spacing scale, radii, type scale, motion), Instrument Sans and JetBrains Mono, quieter chrome without glass effects, gradients, uppercase labels or looping animations, a wood and felt texture on the table, and inline SVG icons for the theme toggle and close buttons.
- Player cards now sit next to each avatar on corner and side seats, and the reaction popover and host action open without covering cards or the board.
- Refreshed the project documentation to match the code. The README no longer claims history stores confidence scores, now lists host transfer, reactions and CSV export, documents `HOST`, room limits, and the release tag rule, and links to the new docs. Added `docs/architecture.md` (routes, transport, room lifecycle), `AGENTS.md` and `CLAUDE.md` for coding agents (no longer git-ignored), and `docs/agents/decisions.md`.

### Fixed

- Open SSE streams now receive the `closed` event as soon as a room expires or closes after everyone goes offline. Before, that notice only ran through the Socket.IO path, so SSE clients only found out on the next update.

### Removed

- Removed the unused Socket.IO server (`/socket.io`, `socketHandlers.ts`, the `socket.io` dependency, the dev-only CORS setup, and the Vite proxy entry). The web app only ever used SSE, polling, and the `/api/compat/` routes, so behavior for players is unchanged. `NODE_ENV` is no longer read by the server.
- Removed the Railway production deployment job from the release workflow; production images are now deployed manually to a private server.
- Removed the public repository links from the web UI (footer link and the Help page "Open GitHub issues" call to action). The Help page now points to an email address for questions, suggestions, and bug reports.
- Removed the open-source community files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, and the GitHub issue templates) and trimmed the README to match the project's private status.

## [1.1.3] - 18-06-2026

### Added

- Added shared GitHub Actions verification and Railway Production deployment automation so stable `vX.Y.Z` tags now run the full CI gate set before publishing a GitHub Release and deploying the tagged commit.

### Changed

- Replaced the README CodeQL badge with the release/deploy workflow badge so the project header reflects the production deployment pipeline.

## [1.1.2] - 18-06-2026

### Changed

- Refreshed the app branding with a new favicon and header logo. The header logo is now theme-aware (light-background variant in light mode, dark-background variant in dark mode), while the favicon is a single icon shared across themes.
- Decomposed the frontend into focused hooks and components without changing any behavior. `App.tsx` (previously all state and orchestration) now delegates to `useLocalStorageSession`, `useNotice`, `useTheme`, and `useRoomSession` hooks, and `RoomBoard.tsx` is now a thin coordinator over `RoomTopBar`, `RoomHero`, `StoryPanel`, `ProfilePanel`, `HostRoundControls`, `PokerTable`, `ReactionOverlay`, and `VoteDock` components plus a `useSeatInteraction` hook. Pure helpers moved into `lib/` (`roomUrl`, `roomRequest`, `seatGeometry`, `voteDeck`) with new unit tests.
- Split the web stylesheet monolith into a structured CSS entrypoint with domain-specific files for theme tokens, shared primitives, public pages, room layout, poker table interactions, vote dock, and history styles without changing behavior.

### Fixed

- Disconnected players are now detected as offline in around 8 seconds (previously 30), so the host seat frees up for claiming much sooner.
- Claiming host from an offline host's seat now targets yourself instead of failing with "You can only claim host for yourself."
- The "Claim host" button no longer jumps to the right when hovered.

## [1.1.1] - 17-06-2026

### Fixed

- Room-board player overlays now open inward from the table edge so emoji choices and host-transfer controls stay clickable for right-side and bottom-side seats.
- Host transfer hover controls now stay open long enough to move the pointer from the player seat to the button without losing the action.

### Added

- Manual host transfer controls so the current host can promote another connected participant from the room board.
- Offline host claiming so connected participants can claim host from the offline host seat until the original host reconnects.
