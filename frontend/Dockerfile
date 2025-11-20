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

# Force cache invalidation: This command always executes and changes before COPY
# This ensures Docker always rebuilds the COPY frontend layer with latest files
RUN echo "Cache bust: $(date +%s)" > /tmp/.cache-bust && cat /tmp/.cache-bust

# Copy frontend directory with all files (source, configs, etc.)
COPY frontend ./frontend

# Verify frontend source exists
RUN test -d frontend/src || (echo "ERROR: frontend/src directory not found!" && exit 1)

# CRITICAL: Verify ResetPassword.tsx doesn't have apiService import
# This forces Docker to rebuild if the file is incorrect
RUN if grep -q "apiService" frontend/src/pages/ResetPassword.tsx; then \
    echo "ERROR: ResetPassword.tsx still contains apiService import! File is outdated." && \
    echo "File content:" && cat frontend/src/pages/ResetPassword.tsx | head -15 && \
    exit 1; \
fi && \
echo "✓ ResetPassword.tsx verified - no apiService import found"

# Build frontend
WORKDIR /app/frontend
ENV NODE_ENV=production

# Accept build args for API URL (empty = use relative path via nginx proxy)
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

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

# Create nginx configuration for SPA routing and API proxying
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
    # Proxy API requests to backend (backend already has /api prefix) \
    location /api { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
    } \
    \
    # Health check endpoint \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
    \
    # SPA routing - all routes go to index.html \
    location / { \
        try_files $uri $uri/ /index.html; \
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

