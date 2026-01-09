#!/bin/bash

echo "========================================="
echo "WordRush Monitoring - $(date)"
echo "========================================="

echo -e "\n=== Docker Container Status ==="
docker compose ps

echo -e "\n=== Container Resource Usage ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo -e "\n=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8"%"}'

echo -e "\nMemory Usage:"
free -h

echo -e "\nDisk Usage:"
df -h | grep -E '^/dev/|Filesystem'

echo -e "\n=== Network Connections ==="
ss -tunlp | grep -E '(:80|:443|:3000)' || echo "No active connections on monitored ports"

echo -e "\n=== Recent Application Logs (last 10 lines) ==="
docker compose logs --tail=10 app

echo -e "\n=== Recent Nginx Errors (last 5) ==="
tail -5 nginx/logs/wordrush_error.log 2>/dev/null || echo "No error log found"

echo -e "\n=== Disk Space Alert ==="
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  WARNING: Disk usage is at ${DISK_USAGE}%"
else
    echo "✓ Disk usage is healthy: ${DISK_USAGE}%"
fi

echo -e "\n========================================="
echo "Monitoring completed"
echo "========================================="
