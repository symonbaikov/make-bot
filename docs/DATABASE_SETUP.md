# Database Setup Guide

This guide explains how to set up the database for the Make Bot application, supporting both Docker and local PostgreSQL installations.

## Overview

The application automatically detects and connects to available PostgreSQL databases in the following priority order:

1. **DATABASE_URL** environment variable (if set)
2. **Docker PostgreSQL** on port 5433 (default Docker setup)
3. **Local PostgreSQL** on port 5432 with `makebot` user
4. **Local PostgreSQL** on port 5432 with `postgres` user (or current system user)

## Option 1: Using Docker (Recommended for Development)

### Prerequisites

- Docker installed and running
- Docker Compose (optional, for easier management)

### Setup Steps

1. **Start the PostgreSQL container:**

```bash
npm run db:start
```

Or manually:

```bash
docker start make-bot-postgres
```

If the container doesn't exist, create it:

```bash
docker run -d \
  --name make-bot-postgres \
  -e POSTGRES_USER=makebot \
  -e POSTGRES_PASSWORD=makebot123 \
  -e POSTGRES_DB=make_bot \
  -p 5433:5432 \
  postgres:14-alpine
```

2. **Run migrations:**

```bash
cd backend
npm run db:migrate
```

3. **Seed the database (optional):**

```bash
cd backend
npm run db:seed
```

### Connection Details

- **Host:** `127.0.0.1`
- **Port:** `5433`
- **Database:** `make_bot`
- **User:** `makebot`
- **Password:** `makebot123`

The application will automatically detect this connection if `DATABASE_URL` is not set.

## Option 2: Using Local PostgreSQL

### Prerequisites

- PostgreSQL 14+ installed locally
- PostgreSQL service running on port 5432

### Setup Steps

1. **Check if PostgreSQL is running:**

```bash
pg_isready -h localhost -p 5432
```

If not running, start it:

- **macOS (Homebrew):**
  ```bash
  brew services start postgresql@14
  ```

- **Linux (systemd):**
  ```bash
  sudo systemctl start postgresql
  ```

2. **Run the setup script:**

```bash
npm run db:setup-local
```

This script will:
- Create the `make_bot` database if it doesn't exist
- Create the `makebot` user with password `makebot123`
- Grant necessary privileges

3. **Run migrations:**

```bash
cd backend
npm run db:migrate
```

4. **Seed the database (optional):**

```bash
cd backend
npm run db:seed
```

### Connection Details

- **Host:** `localhost` or `127.0.0.1`
- **Port:** `5432`
- **Database:** `make_bot`
- **User:** `makebot` (or your system user)
- **Password:** `makebot123` (for makebot user)

The application will automatically detect this connection if Docker PostgreSQL is not available.

## Option 3: Using Custom DATABASE_URL

If you have a custom PostgreSQL setup (e.g., cloud database, different credentials), you can set the `DATABASE_URL` environment variable:

### Setup Steps

1. **Set DATABASE_URL in `backend/.env`:**

```env
DATABASE_URL=postgresql://username:password@host:port/database?schema=public
```

Example for Railway/Neon/Supabase:

```env
DATABASE_URL=postgresql://user:pass@host.railway.app:5432/railway?sslmode=require
```

2. **Run migrations:**

```bash
cd backend
npm run db:migrate
```

3. **Seed the database (optional):**

```bash
cd backend
npm run db:seed
```

The application will use this connection and skip auto-detection.

## Auto-Detection Behavior

When `DATABASE_URL` is not set, the application automatically tries connections in this order:

1. **Docker PostgreSQL** (port 5433) - fastest for development
2. **Local PostgreSQL with makebot user** (port 5432)
3. **Local PostgreSQL with postgres/current user** (port 5432)

The first successful connection is used, and `DATABASE_URL` is automatically set for Prisma.

## Verification

### Check Database Connection

```bash
npm run db:check
```

### Test Connection Manually

**Docker:**
```bash
psql -h 127.0.0.1 -p 5433 -U makebot -d make_bot
# Password: makebot123
```

**Local:**
```bash
psql -h localhost -p 5432 -U makebot -d make_bot
# Password: makebot123
```

### View Logs

When the application starts, you'll see logs indicating which database connection was detected:

```
✅ Docker PostgreSQL connection successful
```

or

```
✅ Local PostgreSQL (makebot user) connection successful
```

## Troubleshooting

### "No database connection available"

**Solution:** Ensure at least one PostgreSQL instance is running:
- Docker: `docker start make-bot-postgres`
- Local: `brew services start postgresql@14` (macOS) or `sudo systemctl start postgresql` (Linux)

### "Connection refused" on port 5433

**Solution:** Docker PostgreSQL is not running. Start it with `npm run db:start`.

### "Connection refused" on port 5432

**Solution:** Local PostgreSQL is not running. Start the service or use Docker instead.

### "Authentication failed"

**Solution:** 
- For Docker: Use credentials `makebot`/`makebot123`
- For local: Run `npm run db:setup-local` to create the `makebot` user
- Or set `DATABASE_URL` with correct credentials

### Prisma Client Generation Issues

**Solution:** The application handles Prisma client generation automatically. If issues persist:

```bash
cd backend
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npm run db:generate
```

## Production Deployment

For production, always set `DATABASE_URL` explicitly:

```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

Auto-detection is disabled in production mode (`NODE_ENV=production`).

## Default Admin Credentials

After seeding the database:

- **Email:** `admin@example.com`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change these credentials in production!


