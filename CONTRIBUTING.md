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

## Branch model

- **`main`** is the active development branch. Pull requests target `main`.
- **`vX.Y.Z`** tags are pushed when it's time to ship a version. Pushing a
  version tag triggers the release workflow.
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

### Cutting a release (maintainers)

1. Update the `version` field in the root `package.json` and in each workspace
   package that ships with the release (`apps/server`, `apps/web`,
   `packages/shared`).
2. Commit the version update as `chore(release): vX.Y.Z`.
3. Create and push the matching version tag from that commit:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. Pushing the `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which
   runs the shared verification workflow (`pnpm lint`, `pnpm format:check`,
   `pnpm typecheck`, `pnpm build`, `pnpm test`), verifies that the pushed tag
   matches the root `package.json` version, and creates or updates the
   `vX.Y.Z` GitHub Release with GitHub-generated notes.
5. Stable tags such as `vX.Y.Z` then deploy the tagged commit to Railway
   Production. Prerelease tags such as `vX.Y.Z-rc.1` publish a GitHub
   prerelease but skip the Railway deploy step.
6. Configure the repository before the first production deploy:
   - GitHub Actions secret `RAILWAY_TOKEN`: Railway project token scoped to the
     production environment.
   - GitHub Actions variable `RAILWAY_SERVICE_NAME`: Railway service name or ID
     for this app.
   - Optional GitHub Actions variable `RAILWAY_HEALTHCHECK_URL`: if set, the
     deploy job probes the deployed app after release.
7. Disable Railway GitHub Autodeploy for the target service if it is enabled,
   so GitHub Actions remains the only production deploy trigger.
8. Push the release commit to `main` if it is not already there so the version
   bump stays in sync with the default branch.

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
