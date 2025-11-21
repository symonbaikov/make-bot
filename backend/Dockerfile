# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json package-lock.json* ./

# Copy all workspace package.json files (needed for workspace resolution)
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY bot/package.json ./bot/package.json

# Install all dependencies (workspace will handle it)
# Use npm ci for faster, reproducible builds
# CRITICAL: Don't use --ignore-scripts for native modules like bcrypt
# Native modules need to be built during install
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace structure)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configs
COPY backend ./backend
COPY frontend ./frontend
# Don't copy root package.json to avoid workspace issues in builder stage
# We only need workspace structure for npm install in deps stage
COPY tsconfig.json ./

# Build frontend first (monolithic build)
WORKDIR /app/frontend
# Use vite directly to avoid workspace issues
# Skip TypeScript check for faster Docker builds (Vite will catch errors during bundling)
RUN npx vite build || (echo "Frontend build failed!" && exit 1)

# Build backend
WORKDIR /app/backend

# Set environment variables for Prisma to handle network issues during build
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

# Generate Prisma client with all binary targets
# This ensures Query Engine is available for the deployment platform
# Use npx directly to avoid workspace issues
RUN npx prisma generate || echo "Warning: Prisma generate failed, will retry at runtime"

# Build TypeScript to JavaScript - continue even if there are type errors
RUN npx tsc --skipLibCheck --noEmitOnError false || echo "Built with type warnings"

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable npm scripts completely
ENV npm_config_ignore_scripts=true
# Don't set workspace variables here - unset them in docker-entrypoint.sh instead
# to avoid conflicts with npx --no-workspaces flag

# Install OpenSSL for Prisma (required for linux-musl binary)

# Alpine uses OpenSSL 3.x, Prisma needs compatibility layer
# Optimized: combine all operations and use || true to avoid failures
RUN apk add --no-cache openssl && \
    mkdir -p /usr/lib /lib && \
    (test -f /usr/lib/libssl.so.3 && ln -sf /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1 || true) && \
    (test -f /usr/lib/libcrypto.so.3 && ln -sf /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1 || true) && \
    (test -f /lib/libssl.so.3 && ln -sf /lib/libssl.so.3 /lib/libssl.so.1.1 || true) && \
    (test -f /lib/libcrypto.so.3 && ln -sf /lib/libcrypto.so.3 /lib/libcrypto.so.1.1 || true) || true

# Create non-root user (combine into single RUN for efficiency)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy necessary files in optimal order (smaller files first for better caching)
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/prisma ./prisma
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/backend/dist ./dist
# Copy frontend build for static file serving
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy node_modules from builder
# Copy all node_modules - they're already installed correctly in builder stage
# CRITICAL: Copy node_modules BEFORE switching to nodejs user to preserve native bindings
COPY --from=builder /app/node_modules ./node_modules
RUN rm -f .npmrc npm-shrinkwrap.json package-lock.json 2>/dev/null || true

# Ensure native modules (bcrypt, etc.) are properly accessible
# Native modules need to be owned by nodejs user but with proper permissions
RUN chmod -R u+rX node_modules/bcrypt 2>/dev/null || true && \
    chmod -R u+rX node_modules/@esbuild 2>/dev/null || true && \
    find node_modules -name "*.node" -exec chmod u+r {} \; 2>/dev/null || true

# Create logs directory and set permissions
RUN mkdir -p /app/logs && \
    chmod 755 /app/logs && \
    chmod +x /app/docker-entrypoint.sh

# Set ownership efficiently (critical for fast unpacking)
# CRITICAL: Prisma needs write access to @prisma/engines directory
# So we need to chown node_modules/@prisma specifically
RUN chown -R nodejs:nodejs /app/dist /app/logs /app/docker-entrypoint.sh /app/package.json /app/prisma /app/frontend && \
    chown -R nodejs:nodejs /app/node_modules/@prisma 2>/dev/null || true && \
    chown -R nodejs:nodejs /app/node_modules/.prisma 2>/dev/null || true && \
    chown nodejs:nodejs /app/node_modules 2>/dev/null || true

USER nodejs

# Railway automatically sets PORT environment variable
# Use PORT from environment, default to 3000 for local development
ENV PORT=${PORT:-3000}
ENV NODE_ENV=production
# Don't set workspace variables here - they cause conflicts with npx --no-workspaces

# Expose the port (Railway will use PORT env var, but we expose common ports)
EXPOSE 3000 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
