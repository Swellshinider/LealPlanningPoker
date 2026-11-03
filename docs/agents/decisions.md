# Decisions

Accepted decisions and open questions for LealPlanningPoker. Each decision cites where it is visible in the repo. Add to this file when a decision changes how the code or docs should behave; do not log progress here.

## Accepted

| Decision                                                                                          | Evidence                                                                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No accounts and no database. Room state lives in server memory only.                              | `apps/server/src/roomStore.ts`; README "No accounts"                                                   |
| The browser uses SSE, with polling and `GET /api/compat/` as fallbacks, for restrictive networks. | `apps/web/src/lib/roomTransport.ts`; `apps/server/src/roomHttp.ts`; [architecture](../architecture.md) |
| The project is private. No public repository links in the UI; contact is by email.                | `docs/CHANGELOG.md` `[Unreleased]`; `*.test.ts` assert no `github.com` link                            |
| Production images are deployed manually to a private server. There is no deploy job in CI.        | `docs/CHANGELOG.md` `[Unreleased]`; `.github/workflows/release.yml`                                    |
| A release tag must equal `v` + the root `package.json` version.                                   | `.github/workflows/release.yml`, "Read version from package.json" step                                 |

## Open questions

None.
