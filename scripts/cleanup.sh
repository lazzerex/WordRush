#!/bin/bash

echo "=== System Cleanup Started ==="

# Docker cleanup
echo "Cleaning Docker system..."
docker system prune -af --volumes

# Log cleanup
echo "Cleaning old logs..."
find ./nginx/logs -name "*.gz" -mtime +30 -delete 2>/dev/null || true
find ./logs -name "*.log.*" -mtime +30 -delete 2>/dev/null || true

# Clear apt cache
echo "Cleaning package cache..."
sudo apt-get clean
sudo apt-get autoremove -y

echo "✓ Cleanup completed"
