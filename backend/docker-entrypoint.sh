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

# Wait for database to be ready with timeout
echo "Waiting for database..."
echo "DATABASE_URL is set: $(if [ -n "$DATABASE_URL" ]; then echo 'yes'; else echo 'no'; fi)"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set! Cannot connect to database."
  echo "Please set DATABASE_URL environment variable in Railway."
  exit 1
fi

# Check DATABASE_URL format
echo "DATABASE_URL preview: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/')"

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS: Testing database connection..."
  
  if node -e "
    const { Client } = require('pg');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.log('❌ DATABASE_URL is not set');
      process.exit(1);
    }
    
    // Check if SSL is required (Railway PostgreSQL usually requires SSL)
    const requiresSSL = dbUrl.includes('railway') || dbUrl.includes('sslmode=require') || dbUrl.includes('?sslmode=');
    const sslConfig = requiresSSL ? { rejectUnauthorized: false } : undefined;
    
    console.log('Testing connection with SSL:', requiresSSL ? 'enabled' : 'disabled');
    
    const client = new Client({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
      ssl: sslConfig,
    });
    
    client.connect()
      .then(() => {
        console.log('✅ Database connection successful');
        return client.query('SELECT NOW(), version()');
      })
      .then((result) => {
        console.log('✅ Database query successful');
        console.log('   Current time:', result.rows[0].now);
        console.log('   PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
        client.end();
        process.exit(0);
      })
      .catch((e) => {
        console.log('❌ Database connection failed:', e.message);
        if (e.code) console.log('   Error code:', e.code);
        if (e.host) console.log('   Host:', e.host);
        if (e.port) console.log('   Port:', e.port);
        client.end().catch(() => {});
        process.exit(1);
      });
  " 2>&1; then
    echo "✅ Database is ready!"
    break
  else
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
      echo "❌ ERROR: Failed to connect to database after $MAX_ATTEMPTS attempts"
      echo "DATABASE_URL preview: $(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/')"
      echo "Please check:"
      echo "  1. DATABASE_URL is correctly set in Railway"
      echo "  2. PostgreSQL service is running and accessible"
      echo "  3. Network connectivity is available"
      exit 1
    fi
    echo "⏳ Database is unavailable - sleeping 2 seconds..."
    sleep 2
  fi
done

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

# Run prisma db push
# Use --no-workspaces flag explicitly to prevent npm workspace conflicts
# Note: --verbose flag is not supported by prisma db push
npx --no-workspaces prisma db push --skip-generate --accept-data-loss || {
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
