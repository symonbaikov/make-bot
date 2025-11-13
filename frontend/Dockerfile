# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package.json for workspace setup
COPY package.json package-lock.json* ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install all dependencies (workspace will handle it)
RUN npm install --legacy-peer-deps

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage (workspace structure)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and configs
COPY frontend ./frontend
COPY package.json ./
COPY tsconfig.json ./

# Build frontend
WORKDIR /app/frontend
RUN npm run build

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

