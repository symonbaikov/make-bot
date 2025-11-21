#!/bin/sh
set -e

# Disable npm scripts and workspace commands completely
export npm_config_ignore_scripts=true
# Unset workspace-related variables to prevent conflicts
unset npm_config_workspace
unset npm_config_workspaces
# Explicitly disable workspace detection
export npm_config_workspaces=false

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
  # Ensure Prisma engines directory is writable
  chmod -R u+w node_modules/@prisma 2>/dev/null || true
  chmod -R u+w node_modules/.prisma 2>/dev/null || true
  # Use npx with explicit no-workspace flag to prevent conflicts
  npx --no-workspaces prisma generate || {
    echo "Warning: Prisma generate failed, but continuing..."
  }
fi

# Run Prisma migrations/push
echo "=========================================="
echo "Running database migrations..."
echo "=========================================="
echo "DATABASE_URL is set: $(if [ -n "$DATABASE_URL" ]; then echo 'yes'; else echo 'no'; fi)"
echo "Current directory: $(pwd)"
echo "Prisma schema location: $(ls -la prisma/schema.prisma 2>/dev/null || echo 'NOT FOUND')"
echo "Prisma directory contents:"
ls -la prisma/ 2>/dev/null || echo "prisma directory not found!"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set! Cannot apply migrations."
  echo "Please set DATABASE_URL environment variable in Railway."
  exit 1
fi

# Use db push (more reliable for Railway, creates tables from schema)
echo "Applying database schema with db push..."
echo "DATABASE_URL preview: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/')"

# Ensure Prisma engines directory is writable before db push
chmod -R u+w node_modules/@prisma 2>/dev/null || true
chmod -R u+w node_modules/.prisma 2>/dev/null || true

# Run prisma db push with verbose output
# Use --no-workspaces flag explicitly to prevent npm workspace conflicts
npx --no-workspaces prisma db push --skip-generate --accept-data-loss --verbose || {
  echo "=========================================="
  echo "ERROR: Database push failed!"
  echo "=========================================="
  echo "DATABASE_URL preview: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/')"
  echo "Checking Prisma schema..."
  ls -la prisma/ || echo "prisma directory not found"
  echo "Checking node_modules..."
  ls -la node_modules/.bin/prisma 2>/dev/null || echo "prisma binary not found"
  echo "Trying to test database connection..."
  node -e "const { Client } = require('pg'); const client = new Client(process.env.DATABASE_URL); client.connect().then(() => { console.log('Connection OK'); client.end(); }).catch(e => { console.log('Connection failed:', e.message); process.exit(1); });" || {
    echo "Database connection test failed!"
  }
  exit 1
}

echo "=========================================="
echo "✅ Database schema applied successfully!"
echo "=========================================="

# Run seed to create admin user
if [ -n "$DATABASE_URL" ]; then
  echo "Running database seed..."
  # Seed uses tsx - use npx directly to avoid workspace issues
  # Don't use npm run as it tries to use workspace commands
  if [ -f "node_modules/.bin/tsx" ]; then
    echo "Using local tsx binary..."
    node_modules/.bin/tsx prisma/seed.ts || {
      echo "Warning: Database seed failed with local tsx, but continuing..."
    }
  elif command -v tsx >/dev/null 2>&1; then
    echo "Using system tsx..."
    tsx prisma/seed.ts || {
      echo "Warning: Database seed failed with system tsx, but continuing..."
    }
  else
    echo "tsx not found, trying npx tsx..."
    npx --yes tsx prisma/seed.ts || {
      echo "Warning: Database seed failed with npx tsx, but continuing..."
    }
  fi
else
  echo "DATABASE_URL not set, skipping seed..."
fi

# Start the application
echo "Starting application..."
exec node dist/index.js
