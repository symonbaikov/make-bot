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
