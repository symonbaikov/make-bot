#!/bin/bash

echo "🔍 Checking Docker status..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running."
    echo "   Please start Docker Desktop first, then run this script again."
    exit 1
fi

echo "✅ Docker is running"

# Check if PostgreSQL container exists
if ! docker ps -a | grep -q make-bot-postgres; then
    echo "⚠️  PostgreSQL container 'make-bot-postgres' not found."
    echo "   Creating container from docker-compose..."
    cd "$(dirname "$0")/../.." || exit 1
    docker-compose up -d postgres
    sleep 5
fi

# Check if container is running
if ! docker ps | grep -q make-bot-postgres; then
    echo "⚠️  PostgreSQL container is stopped. Starting it..."
    docker start make-bot-postgres
    sleep 5
fi

# Check if database is accessible
if docker exec make-bot-postgres pg_isready -U makebot > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running and accessible on port 5433"
    echo "   Host: localhost"
    echo "   Port: 5433"
    echo "   Database: make_bot"
    echo "   User: makebot"
    exit 0
else
    echo "❌ PostgreSQL is not accessible"
    echo "   Trying to start container..."
    docker start make-bot-postgres
    sleep 5
    
    if docker exec make-bot-postgres pg_isready -U makebot > /dev/null 2>&1; then
        echo "✅ PostgreSQL is now running and accessible"
        exit 0
    else
        echo "❌ Failed to start PostgreSQL"
        exit 1
    fi
fi


