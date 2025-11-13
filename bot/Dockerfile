# Bot Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY bot/package.json ./bot/

# Install root dependencies (for workspace)
RUN npm install

# Install bot dependencies
WORKDIR /app/bot
RUN npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bot/node_modules ./bot/node_modules

# Copy source code
COPY bot ./bot
COPY package.json ./

# Build bot (TypeScript compilation)
WORKDIR /app/bot
RUN npx tsc

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder /app/bot/dist ./dist
COPY --from=builder /app/bot/node_modules ./node_modules
COPY --from=builder /app/bot/package.json ./

USER nodejs

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
