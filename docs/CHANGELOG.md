# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-16

### Changed

- Preparing for v1.0.0 release.
- Releases are now published by pushing version tags in the `vX.Y.Z` format.
  The release workflow validates the tag against `package.json`, reads release
  notes from `docs/CHANGELOG.md`, and no longer depends on `release/**`
  branches.

## [Unreleased] - 2026-06-15

### Added

- Repository now ships with ESLint (flat config) + Prettier, `.editorconfig`,
  `.gitattributes`, and a Docker Compose file for one-command local deploys.
- Added the standard set of open-source community files: `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates (bug + feature), and a
  pull request template.
- Added GitHub Actions pipelines: `ci.yml` (lint -> typecheck -> build -> test
  with per-stage gating so a failed stage skips downstream jobs), `codeql.yml`
  for security scanning, and `release.yml` for tag-driven releases.
- Added a docs-first release workflow with `docs/CHANGELOG.md` as the
  authoritative source for release notes consumed by the GitHub release
  workflow.
- Rooms now auto-delete 30 minutes after all participants go offline, freeing
  memory and notifying any lingering clients. The delay is configurable via
  `RoomStoreOptions.offlineCleanupMs` and can be disabled by setting it to `0`.
- Export voting history to CSV directly from the archive panel. The file uses a
  long format (one row per participant per finalized round) and includes a
  UTF-8 BOM so spreadsheet apps decode special vote labels (`☕`, `?`) correctly.
- Players can throw one of six live emoji reactions at another connected
  participant. The emoji arcs from the thrower to the target, lingers briefly
  above the target's head, and disappears after a few seconds without being
  saved to room history.
- Added a dedicated `/help` page with step-by-step usage guidance plus a GitHub
  issues call-to-action for questions, suggestions, and bug reports.

### Changed

- Rebuilt the initial public page into a hero-first layout with the existing
  theme/colors, refreshed create/join sections, a short "How it works" band,
  and a footer linking author/copyright information to the project repository.
- Added `Help` navigation to the public header and the in-room header. The
  in-room link opens the help page in a new tab so active sessions stay on the
  room board.
- Renamed the "Reset" action to "Clear votes" and moved it to the left side of
  the host action row so it is visually separated from the centered Reveal and
  Finalize buttons. The toast confirmation now reads "Votes cleared."
- The host-only round controls now stay hidden for normal players, and non-host
  player status labels now show only `online` or `offline` while the host keeps
  the `Host, ...` prefix.
- Updated the README host-controls bullet to mention clearing votes instead of
  resetting rounds.

### Fixed

- Dev-mode clients no longer hit "Unable to connect. Your network or corporate
  proxy may be blocking room traffic." when the Vite dev server (5173) tried to
  reach the API directly on port 3000. The Vite dev server now proxies `/api`
  and `/socket.io` to the backend, and `getApiBaseUrl()` keeps requests
  same-origin in dev. `buildCompatUrl()` resolves relative paths against the
  current origin so the compat fallback still works.
- Host actions that do not send a payload, including "Reveal votes", no longer
  fail with `UNKNOWN_ERROR` in dev because the web transport stops advertising
  an empty JSON body on bodyless POST requests.
