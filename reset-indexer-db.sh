#!/bin/bash

# Indexer Database Reset Script
# Run this on the server where the indexer Docker containers are running

echo "🔄 Resetting Indexer Database..."

# Stop the indexer service
echo "🛑 Stopping indexer..."
cd /srv/Web/indexer
docker compose -f docker-compose.prod.yml down indexer

# Reset the database
echo "💾 Dropping and recreating database..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS ponder_indexer;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "CREATE DATABASE ponder_indexer;"

# Pull latest code changes
echo "📥 Pulling latest code..."
cd /srv/Web
git fetch origin
git checkout dev
git pull origin dev

# Regenerate schema
echo "🔧 Regenerating schema..."
npm run generate:indexer

# Restart the indexer
echo "🚀 Starting indexer..."
cd indexer
docker compose -f docker-compose.prod.yml up -d indexer

echo "✅ Database reset complete!"
echo "📊 Indexer will now rebuild from genesis with the new schema"