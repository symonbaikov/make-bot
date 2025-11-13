# Setup Instructions

## Prerequisites

- Node.js 18+ (LTS)
- PostgreSQL 14+ (or use Docker Compose)
- npm 9+

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

#### Option A: Using Docker Compose (Recommended for development)

```bash
# Start PostgreSQL container
docker-compose up -d

# Database will be available at:
# Host: localhost
# Port: 5432
# Database: make_bot
# User: makebot
# Password: makebot123
```

#### Option B: Using Local PostgreSQL

Create a database:
```sql
CREATE DATABASE make_bot;
```

### 3. Configure Environment Variables

Create `.env` files in each workspace:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and other settings

# Bot
cp bot/.env.example bot/.env
# Edit bot/.env with your Telegram bot token

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed
```

### 4. Setup Database Schema

```bash
cd backend

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 5. Start Development Servers

From root directory:
```bash
npm run dev
```

Or start individually:
```bash
# Backend (port 3000)
cd backend && npm run dev

# Bot
cd bot && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

## Database Credentials (Docker Compose)

- **Host:** localhost
- **Port:** 5432
- **Database:** make_bot
- **User:** makebot
- **Password:** makebot123
- **Connection String:** `postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public`

## Default Admin User (from seed)

- **Email:** admin@example.com
- **Password:** admin123
- **Role:** ADMIN

⚠️ **Change these credentials in production!**

## Troubleshooting

### Database Connection Issues

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps
   ```

2. Verify DATABASE_URL in `.env`:
   ```bash
   # Should match Docker Compose credentials
   DATABASE_URL="postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"
   ```

3. Test connection:
   ```bash
   cd backend
   npm run db:studio
   ```

### Prisma Issues

1. Regenerate Prisma Client:
   ```bash
   cd backend
   npm run db:generate
   ```

2. Reset database (⚠️ deletes all data):
   ```bash
   cd backend
   npx prisma migrate reset
   ```

## Next Steps

After setup, proceed to Phase 2: Backend API Development.

