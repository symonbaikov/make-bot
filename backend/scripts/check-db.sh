#!/bin/bash

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if PostgreSQL container exists
if ! docker ps -a | grep -q make-bot-postgres; then
    echo "❌ PostgreSQL container 'make-bot-postgres' not found."
    echo "   Please run: docker-compose up -d postgres"
    exit 1
fi

# Check if container is running
if ! docker ps | grep -q make-bot-postgres; then
    echo "⚠️  PostgreSQL container is stopped. Starting it..."
    docker start make-bot-postgres
    sleep 3
fi

# Check if database is accessible
if docker exec make-bot-postgres pg_isready -U makebot > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running and accessible"
    exit 0
else
    echo "❌ PostgreSQL is not accessible"
    exit 1
fi

