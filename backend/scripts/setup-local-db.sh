#!/bin/bash

echo "🔧 Setting up local PostgreSQL database (without Docker)..."

# Check if PostgreSQL is running locally
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on port 5432"
    echo "   Please start PostgreSQL service first:"
    echo "   - macOS: brew services start postgresql@14"
    echo "   - Linux: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Get PostgreSQL user (default: current user or postgres)
PGUSER=${PGUSER:-$USER}
if [ "$PGUSER" = "" ]; then
    PGUSER="postgres"
fi

echo "Using PostgreSQL user: $PGUSER"

# Create database if it doesn't exist
echo "Creating database 'make_bot' if it doesn't exist..."
psql -h localhost -p 5432 -U "$PGUSER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname='make_bot'" | grep -q 1 || \
psql -h localhost -p 5432 -U "$PGUSER" -d postgres -c "CREATE DATABASE make_bot;" 2>&1 | grep -v "already exists" || true

# Create user if it doesn't exist (for Docker compatibility)
echo "Creating user 'makebot' if it doesn't exist..."
psql -h localhost -p 5432 -U "$PGUSER" -d postgres -c "SELECT 1 FROM pg_user WHERE usename='makebot'" | grep -q 1 || \
psql -h localhost -p 5432 -U "$PGUSER" -d postgres -c "CREATE USER makebot WITH PASSWORD 'makebot123';" 2>&1 | grep -v "already exists" || true

# Grant privileges
echo "Granting privileges..."
psql -h localhost -p 5432 -U "$PGUSER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE make_bot TO makebot;" 2>&1 || true

# Connect to make_bot database and grant schema privileges
psql -h localhost -p 5432 -U "$PGUSER" -d make_bot -c "GRANT ALL ON SCHEMA public TO makebot;" 2>&1 || true

echo ""
echo "✅ Local database setup complete!"
echo ""
echo "Database connection info:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: make_bot"
echo "  User: makebot"
echo "  Password: makebot123"
echo ""
echo "To use this database, set in backend/.env:"
echo "  DATABASE_URL=postgresql://makebot:makebot123@localhost:5432/make_bot?schema=public"
echo ""
echo "Or the app will auto-detect it if DATABASE_URL is not set."


