# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
