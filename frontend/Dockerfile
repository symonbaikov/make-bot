# Frontend Dockerfile
# IMPORTANT: This Dockerfile expects build context from repository root
# Railway should use root directory as build context, not frontend/

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
RUN test -f frontend/package.json || (echo "ERROR: frontend/package.json not found!" && exit 1)

# Install all dependencies (workspace will handle it)
RUN npm install --legacy-peer-deps || (echo "ERROR: npm install failed!" && exit 1)

# Build stage
FROM base AS builder
WORKDIR /app

# Copy root package.json and tsconfig (needed for frontend tsconfig extends)
COPY package.json tsconfig.json ./

# Verify tsconfig.json exists
RUN test -f tsconfig.json || (echo "ERROR: tsconfig.json not found!" && exit 1)

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy frontend directory with all files (source, configs, etc.)
COPY frontend ./frontend

# Verify frontend source exists
RUN test -d frontend/src || (echo "ERROR: frontend/src directory not found!" && exit 1)

# Build frontend
WORKDIR /app/frontend
ENV NODE_ENV=production

# Build the application
# Use explicit path to ensure correct resolution
RUN npm run build || (echo "ERROR: Frontend build failed!" && exit 1)

# Verify build output exists
RUN test -d dist || (echo "ERROR: dist directory not found after build!" && ls -la && exit 1)
RUN test -f dist/index.html || (echo "ERROR: dist/index.html not found after build!" && ls -la dist/ && exit 1)

# Production stage - use nginx to serve static files
FROM nginx:alpine AS runner

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Create nginx configuration for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json; \
    \
    # SPA routing - all routes go to index.html \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

