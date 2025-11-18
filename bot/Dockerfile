# Bot Dockerfile
# IMPORTANT: This Dockerfile expects build context from repository root
# Railway should use root directory as build context, not bot/

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json and lock file for workspace setup
COPY package.json package-lock.json* ./

# Verify root package.json exists
RUN test -f package.json || (echo "ERROR: package.json not found! Build context must be repository root." && exit 1)

# Copy all workspace package.json files (needed for workspace resolution)
COPY backend/package.json ./backend/package.json
COPY bot/package.json ./bot/package.json
COPY frontend/package.json ./frontend/package.json

# Verify workspace package.json files exist
RUN test -f bot/package.json || (echo "ERROR: bot/package.json not found!" && exit 1)

# Install all dependencies (workspace will handle it)
RUN npm install --legacy-peer-deps || (echo "ERROR: npm install failed!" && exit 1)

# Build stage
FROM base AS builder
WORKDIR /app

# Copy root package.json and tsconfig (needed for bot tsconfig extends)
COPY package.json tsconfig.json ./

# Verify tsconfig.json exists
RUN test -f tsconfig.json || (echo "ERROR: tsconfig.json not found!" && exit 1)

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy bot source code and configs
COPY bot ./bot

# Verify bot source exists
RUN test -d bot/src || (echo "ERROR: bot/src directory not found!" && exit 1)

# Build bot (TypeScript compilation)
WORKDIR /app/bot
ENV NODE_ENV=production

# Build and verify
RUN npm run build || (echo "ERROR: Bot build failed!" && exit 1)
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found after build!" && ls -la dist/ && exit 1)

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy built files and dependencies
COPY --from=builder /app/bot/dist ./dist
COPY --from=builder /app/bot/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Verify files exist before switching user
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found!" && ls -la dist/ && exit 1) && \
    test -f package.json || (echo "ERROR: package.json not found!" && exit 1)

USER nodejs

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

# Use node to run the compiled JavaScript
CMD ["node", "dist/index.js"]
