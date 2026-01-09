#!/bin/bash
echo "Renewing SSL certificates..."

# Stop nginx to free port 80
docker compose stop nginx

# Renew certificates
sudo certbot renew --quiet

# Restart nginx
docker compose start nginx

echo "SSL renewal completed at $(date)" >> /var/log/ssl-renewal.log
