#!/bin/bash
# Script to run seed in production using Railway CLI
# This script will use Railway's internal network to connect to the database

set -e

echo "🌱 Running database seed in Railway production environment..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "   Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if project is linked
if ! railway status &> /dev/null; then
    echo "❌ Project is not linked to Railway."
    echo "   Run: railway link"
    exit 1
fi

echo "✅ Railway CLI is installed and project is linked"
echo ""

# Run seed through Railway (this will use Railway's internal network)
echo "Running seed command in Railway environment..."
cd "$(dirname "$0")/.." || exit 1

railway run --service backend npm run db:seed

echo ""
echo "✅ Seed completed!"

