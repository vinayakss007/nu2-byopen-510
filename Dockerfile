# Multi-stage build for speed
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Builder
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Skip heavy deps at build time
ENV SKIP_BUILD_STATIC_GENERATION=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Runner - minimal
FROM node:22-alpine AS runner

WORKDIR /app

# Only production files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/drizzle ./drizzle

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "start"]