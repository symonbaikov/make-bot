#!/bin/sh
set -e

echo "Starting backend service..."

# Wait for database to be ready
echo "Waiting for database..."
until node -e "const { Client } = require('pg'); const client = new Client(process.env.DATABASE_URL); client.connect().then(() => { console.log('Database ready'); client.end(); }).catch(e => { console.log('Database not ready yet'); process.exit(1); });" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Generate Prisma client if not already generated or if binary target mismatch
# Check if Query Engine exists for current platform
if [ ! -d "node_modules/.prisma/client" ] || [ ! -f "node_modules/.prisma/client/query-engine-linux-musl-openssl-3.0.x" ] && [ ! -f "node_modules/.prisma/client/query-engine-linux-musl-arm64-openssl-3.0.x" ]; then
  echo "Prisma client not found or missing Query Engine, generating..."
  export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
  npx prisma generate || {
    echo "Warning: Prisma generate failed, but continuing..."
  }
fi

# Run Prisma migrations/push
echo "Running database migrations..."
echo "DATABASE_URL is set: $(if [ -n "$DATABASE_URL" ]; then echo 'yes'; else echo 'no'; fi)"

# Use db push for development/testing, migrate deploy for production
if [ -f "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "Migrations found, using migrate deploy..."
  npx prisma migrate deploy || {
    echo "Migration deploy failed, trying db push..."
    npx prisma db push --skip-generate --accept-data-loss || {
      echo "Database push also failed!"
      exit 1
    }
  }
else
  echo "No migrations found, using db push..."
  npx prisma db push --skip-generate --accept-data-loss || {
    echo "Database push failed!"
    exit 1
  }
fi

echo "Database is up to date!"

# Run seed if DATABASE_URL is set (optional, but recommended)
if [ -n "$DATABASE_URL" ]; then
  echo "Running database seed..."
  npm run db:seed || {
    echo "Warning: Database seed failed, but continuing..."
  }
fi

# Start the application
echo "Starting application..."
exec node dist/index.js
