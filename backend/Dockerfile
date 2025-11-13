# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json package-lock.json* ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install all dependencies (workspace will handle it)
RUN npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace structure)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configs
COPY backend ./backend
COPY package.json ./
COPY tsconfig.json ./

# Build backend
WORKDIR /app/backend
RUN npm run db:generate
# Build TypeScript to JavaScript - must succeed or fail the build
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma (required for linux-musl binary)

# Alpine uses OpenSSL 3.x, Prisma needs 1.1.x - use compatibility layer
RUN apk add --no-cache openssl && \
    mkdir -p /usr/lib && \
    (test -f /usr/lib/libssl.so.3 && ln -sf /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1 || true) && \
    (test -f /usr/lib/libcrypto.so.3 && ln -sf /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1 || true) && \
    (test -f /lib/libssl.so.3 && ln -sf /lib/libssl.so.3 /lib/libssl.so.1.1 || true) && \
    (test -f /lib/libcrypto.so.3 && ln -sf /lib/libcrypto.so.3 /lib/libcrypto.so.1.1 || true)

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma

# Copy Prisma Client (it's in root node_modules in workspace)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create logs directory with proper permissions (before switching to nodejs user)
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app && chmod -R 755 /app/logs

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
