#!/bin/bash

echo "=== WordRush Update Process ==="
echo "Starting at $(date)"

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Rebuild containers
echo "Rebuilding Docker containers..."
docker compose build --no-cache

# Restart services with zero downtime
echo "Restarting services..."
docker compose up -d --force-recreate

# Wait for health check
echo "Waiting for services to be healthy..."
sleep 15

# Check status
echo "Checking service status..."
docker compose ps

# Test health
echo "Testing application health..."
curl -f http://localhost:3000/ && echo "✓ Application is healthy" || echo "✗ Health check failed"

echo "=== Update Completed at $(date) ==="
