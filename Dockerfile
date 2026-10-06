# syntax=docker/dockerfile:1
# Build stage
# glibc, not alpine: effect-tsgo (npm prepare) does not support musl.
FROM node:24-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Not secret, so plain build args: NEXT_PUBLIC_* are inlined into the bundle
# (server code too, so the running container doesn't need them), and APP_ENV
# is just a mode name.
ARG APP_ENV
ARG NEXT_PUBLIC_BASE_DOMAIN

# Server secrets: one build secret per var, named after the var (how Dokploy's
# Build-time Secrets arrive). `env=` exposes each only to this RUN, never a layer.
# `next build` validates every var in src/env.ts, so a var added there without
# a line here fails the build by name.
# Locally:
#   set -a && . ./.env && set +a
#   docker build --build-arg APP_ENV --build-arg NEXT_PUBLIC_BASE_DOMAIN \
#     $(sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/--secret id=\1,env=\1/p' .env) .
RUN --mount=type=secret,id=DB_URL,env=DB_URL \
    npm run build

# Production stage
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Server secrets are read at runtime: docker run --env-file .env <image>

CMD ["node", "server.js"]
