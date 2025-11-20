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
echo "Current directory: $(pwd)"
echo "Prisma schema location: $(ls -la prisma/schema.prisma 2>/dev/null || echo 'NOT FOUND')"

# Use db push (more reliable for Railway, creates tables from schema)
echo "Applying database schema with db push..."
npx prisma db push --skip-generate --accept-data-loss || {
  echo "ERROR: Database push failed!"
  echo "DATABASE_URL preview: $(echo "$DATABASE_URL" | cut -c1-50)..."
  echo "Checking Prisma schema..."
  ls -la prisma/ || echo "prisma directory not found"
  exit 1
}

echo "✅ Database schema applied successfully!"

# Run seed to create admin user
if [ -n "$DATABASE_URL" ]; then
  echo "Running database seed..."
  # Seed uses tsx, but we can run it with node if compiled, or use tsx if available
  if command -v tsx >/dev/null 2>&1; then
    tsx prisma/seed.ts || {
      echo "Warning: Database seed failed with tsx, but continuing..."
    }
  elif [ -f "node_modules/.bin/tsx" ]; then
    node_modules/.bin/tsx prisma/seed.ts || {
      echo "Warning: Database seed failed, but continuing..."
    }
  else
    echo "tsx not found, trying to install and run seed..."
    npx tsx prisma/seed.ts || {
      echo "Warning: Database seed failed, but continuing..."
    }
  fi
else
  echo "DATABASE_URL not set, skipping seed..."
fi

# Start the application
echo "Starting application..."
exec node dist/index.js
