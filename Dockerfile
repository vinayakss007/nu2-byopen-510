FROM node:22-slim

WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq postgresql-client && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "run", "dev"]
