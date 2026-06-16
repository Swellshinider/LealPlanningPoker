# Contributing to LealPlanningPoker

Thanks for your interest in contributing! This document covers setup, conventions, and the pull request process.

## Quick start

**Prerequisites:** [Node.js](https://nodejs.org/) >= 22, [pnpm](https://pnpm.io/) >= 10

```bash
git clone https://github.com/Swellshinider/LealPlanningPoker.git
cd LealPlanningPoker
pnpm install
pnpm dev
```

Open <http://localhost:5173> in your browser. The dev server proxies API requests to the backend on port 3000.

## Common scripts

| Command or file     | Description                       |
| ------------------- | --------------------------------- |
| `pnpm dev`          | Start dev servers (web + backend) |
| `pnpm build`        | Production build                  |
| `pnpm test`         | Run the test suite once           |
| `pnpm typecheck`    | Type-check all workspaces         |
| `pnpm lint`         | Lint the entire repo with ESLint  |
| `pnpm lint:fix`     | Auto-fix lint issues              |
| `pnpm format`       | Format the repo with Prettier     |
| `pnpm format:check` | Verify formatting without writing |
| `docs/CHANGELOG.md` | Record user-facing release notes  |

## Branch model

- **`main`** is the active development branch. Pull requests target `main`.
- **`release/**`** branches are cut from `main`when it's time to ship a version. Each release branch corresponds to one published version (for example,`release/release-1-0-0`). Pushing to a `release/\*\*` branch triggers the release workflow.
- Use descriptive feature/fix branch names:
  - `feature/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
  - `docs/<short-description>`

## Before opening a pull request

Run all of these locally and make sure they pass:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

CI runs the same gates on every PR. A failing gate blocks merge.

## Changelog

For any user-facing change, update [`docs/CHANGELOG.md`](docs/CHANGELOG.md) in the
same pull request. Follow the existing Keep a Changelog structure:

- Add unreleased work under `## [Unreleased]` while the change is still on `main`.
- Move those notes into the versioned `## [X.Y.Z] - YYYY-MM-DD` section when you
  cut a release.
- Keep entries focused on externally visible behavior: features, fixes,
  workflow changes, or breaking changes.

### Cutting a release (maintainers)

1. Update the `version` field in the root `package.json` and in each workspace
   package that ships with the release (`apps/server`, `apps/web`,
   `packages/shared`).
2. Move the release notes from `## [Unreleased]` into a dated
   `## [X.Y.Z] - YYYY-MM-DD` section in `docs/CHANGELOG.md`. Review the diff.
3. Commit the version and changelog update as `chore(release): vX.Y.Z`.
4. Create a release branch off that commit:
   ```bash
   git checkout -b release/release-X-Y-Z
   git push origin release/release-X-Y-Z
   ```
5. Pushing the `release/**` branch triggers `.github/workflows/release.yml`,
   which reads `version` from `package.json`, extracts the matching section from
   `docs/CHANGELOG.md`, and creates the `vX.Y.Z` GitHub Release and git tag.
6. Merge the release branch back to `main` (or cherry-pick the version commit)
   so `main` stays in sync.

## Commit messages

Keep commit messages short and descriptive. No strict format is enforced, but a Conventional Commits style is appreciated:

```txt
type: short description in imperative mood
```

Examples:

- `feat: add keyboard shortcuts for vote selection`
- `fix: prevent duplicate SSE subscriptions on reconnect`
- `docs: clarify Docker setup in README`
- `chore: pin Node version in workflow`

## Code style

- ESLint (flat config) + Prettier enforce style. Don't fight the linter.
- TypeScript strict mode is on everywhere. Avoid `any`.
- 2-space indent, double quotes, trailing commas, semicolons, LF line endings.
- Match the patterns you see in surrounding code.

## Tests

- Add or update Vitest tests for any behavioral change.
- Tests live next to the source file: `foo.ts` -> `foo.test.ts`.
- Pure logic lives in `packages/shared` so it can be tested without DOM/server dependencies.

## Reporting issues

Open an issue using the **Bug report** or **Feature request** template. Include:

- Expected vs actual behavior
- Reproduction steps
- Environment (browser, OS, Node version, self-hosted vs Docker)

## Security reports

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for private reporting.

## Code of conduct

By participating you agree to uphold the [Code of Conduct](CODE_OF_CONDUCT.md). Be kind.
