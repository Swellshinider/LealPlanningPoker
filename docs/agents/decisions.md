# Decisions

Accepted decisions and open questions for LealPlanningPoker. Each decision cites where it is visible in the repo. Add to this file when a decision changes how the code or docs should behave; do not log progress here.

## Accepted

| Decision                                                                                                            | Evidence                                                                                               |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No accounts and no database. Room state lives in server memory only.                                                | `apps/server/src/roomStore.ts`; README "No accounts"                                                   |
| The browser uses SSE, with polling and `GET /api/compat/` as fallbacks, for restrictive networks.                   | `apps/web/src/lib/roomTransport.ts`; `apps/server/src/roomHttp.ts`; [architecture](../architecture.md) |
| The repository is public under GPL-3.0-only. The UI still shows no repository links; contact is by email.           | `LICENSE`; `package.json` `license`; `*.test.ts` assert no `github.com` link                           |
| A new room opens straight in `voting` and the story is optional, so nobody waits on the host.                       | `apps/server/src/roomStore.ts`; [architecture](../architecture.md)                                     |
| Donations are plain links to Ko-fi and Livepix (Pix without exposing the key). No payment code.                     | `apps/web/src/lib/publicPages.ts`; `PublicFooter.tsx`; `HelpPage.tsx`                                  |
| The release workflow publishes the image to GHCR; the server pulls it with `task install/update`. CI never deploys. | `.github/workflows/release.yml` "publish" job; `Taskfile.yml`; `docker-compose.prod.yml`               |
| A release tag must equal `v` + the root `package.json` version.                                                     | `.github/workflows/release.yml`, "Check tag matches package.json version" step                         |

## Open questions

None.
