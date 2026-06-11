# LealPlanningPoker

Planning poker for small teams.

## Development

- `pnpm install`
- `pnpm dev`

## Build

- `pnpm build`

## Production

- `docker build -t lealplanningpoker .`
- `docker run -p 3000:3000 lealplanningpoker`

## Notes

- Rooms are anonymous and ephemeral.
- The server keeps room state in memory, so restarts clear active sessions and history.
