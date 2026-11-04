# syntax=docker/dockerfile:1

# --- base: pnpm + workspace manifests (lets dependency layers cache) ----------
FROM node:22-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .npmrc ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

# --- prod-deps: only what the server needs at runtime -------------------------
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@lealplanningpoker/server..."

# --- build: full install, compile server, shared and web ----------------------
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- runtime: no pnpm, no dev dependencies, non-root --------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app /app
COPY --from=build --chown=node:node /app/packages/shared/dist packages/shared/dist
COPY --from=build --chown=node:node /app/apps/server/dist apps/server/dist
COPY --from=build --chown=node:node /app/apps/web/dist apps/web/dist

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=$APP_VERSION

USER node
EXPOSE 3000

# 127.0.0.1, not localhost: some resolvers try ::1 first and nothing listens there.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/main.js"]
