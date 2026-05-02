FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ─── Dependencies ───────────────────────────────────────────────────────
FROM base AS deps
COPY examples/domain-availability/frontend/package.json \
     examples/domain-availability/frontend/pnpm-lock.yaml \
     examples/domain-availability/frontend/pnpm-workspace.yaml \
     ./
RUN pnpm install --frozen-lockfile

# ─── Build ──────────────────────────────────────────────────────────────
FROM base AS builder
# `git` is needed so next.config.ts can resolve the deploy SHA via
# `git rev-parse --short HEAD` at build time. Build context is the repo root,
# which includes .git (see root .dockerignore).
RUN apk add --no-cache git
ARG API_URL=http://api:8000
ENV API_URL=${API_URL}
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY .git ./.git
COPY examples/domain-availability/frontend/ ./
RUN pnpm build

# ─── Runtime ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
