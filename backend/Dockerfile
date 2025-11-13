# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json package-lock.json* ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install root dependencies (for workspace)
RUN npm install --legacy-peer-deps

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy source code
COPY backend ./backend
COPY package.json ./

# Build backend
WORKDIR /app/backend
RUN npm run build
RUN npm run db:generate

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/prisma ./prisma

# Copy Prisma Client from root node_modules if it exists
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma 2>/dev/null || true

USER nodejs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
