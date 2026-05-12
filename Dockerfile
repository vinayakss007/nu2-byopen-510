# ============================================================
# NuCRM Production Dockerfile (Multi-stage Build)
# ============================================================

# Stage 1: Dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq postgresql-client && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* yarn.lock* ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Sentry build-time args (passed from CI)
ARG SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_DSN=$SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Compile worker into a standalone bundle
RUN npx esbuild worker.ts --bundle --platform=node --outfile=worker.js \
  --external:@aws-sdk --external:@aws-sdk/client-s3 \
  --alias:@/=./

# Stage 3: Production runner
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -qq && apt-get install -y -qq postgresql-client && rm -rf /var/lib/apt/lists/*
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Bundled worker binary
COPY --from=builder /app/worker.js ./worker.js

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
