FROM node:22.22.2-alpine AS base

# ── Dependencies ────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ── Build ───────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_BUILD_STATIC_GENERATION=1
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV JWT_SECRET=build-time-placeholder-secret-minimum-32-chars
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV CI=true
RUN npm run build

# ── Production Runner ───────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install postgresql-client (pg_dump/pg_restore) for backup routes
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Full build output (not standalone) - includes all static files
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/drizzle/migrations ./drizzle/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/entrypoint.sh ./scripts/entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/scripts/push-db.mts ./scripts/push-db.mts
RUN chmod +x ./scripts/entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["npx", "next", "start"]
