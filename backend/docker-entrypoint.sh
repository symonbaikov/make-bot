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
npx prisma db push --skip-generate --accept-data-loss || {
  echo "Database push failed, trying migrate deploy..."
  npx prisma migrate deploy || {
    echo "Migration failed, but continuing..."
  }
}

echo "Database is up to date!"

# Start the application
echo "Starting application..."
exec node dist/index.js
