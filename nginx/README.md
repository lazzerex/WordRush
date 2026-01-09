# Nginx Configuration

This directory contains Nginx configuration files for the WordRush reverse proxy.

## Structure

```
nginx/
├── nginx.conf              # Main Nginx configuration
├── conf.d/
│   ├── wordrush.conf       # HTTP configuration (default)
│   └── wordrush-ssl.conf.example  # HTTPS configuration template
└── logs/                   # Nginx logs (created at runtime)
```

## Configuration Files

### nginx.conf

Main Nginx configuration with:
- Performance optimizations
- Gzip compression
- Rate limiting zones
- Security headers
- Log formats

### wordrush.conf

HTTP-only configuration for:
- Local development testing
- Initial deployment before SSL
- Let's Encrypt certificate verification

### wordrush-ssl.conf.example

HTTPS configuration template with:
- SSL/TLS settings
- HTTP to HTTPS redirect
- Enhanced security headers
- Static file caching

## Switching from HTTP to HTTPS

1. **Obtain SSL certificate:**
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **Update SSL config:**
   ```bash
   cp conf.d/wordrush-ssl.conf.example conf.d/wordrush.conf
   nano conf.d/wordrush.conf
   # Replace "your-domain.com" with your actual domain
   ```

3. **Restart Nginx:**
   ```bash
   docker compose restart nginx
   ```

## Testing Configuration

```bash
# Test Nginx config syntax
docker compose exec nginx nginx -t

# Reload Nginx (without downtime)
docker compose exec nginx nginx -s reload

# Restart Nginx container
docker compose restart nginx
```

## Rate Limiting

Two zones configured:

- **api_limit**: 20 requests/second for API endpoints
- **general_limit**: 100 requests/second for general traffic

Burst limits:
- API: 10 requests burst
- General: 50 requests burst

## Security Headers

Applied to all responses:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (HTTPS only)

## Logs

Logs are stored in `nginx/logs/`:
- `access.log` - All access logs
- `error.log` - Error logs
- `wordrush_access.log` - Site-specific access logs (HTTPS mode)
- `wordrush_error.log` - Site-specific error logs (HTTPS mode)

View logs:
```bash
# Real-time access logs
tail -f nginx/logs/access.log

# Real-time error logs
tail -f nginx/logs/error.log

# Via Docker
docker compose logs -f nginx
```

## Custom Configuration

To add custom settings:

1. Edit the appropriate config file
2. Test configuration: `docker compose exec nginx nginx -t`
3. Reload: `docker compose exec nginx nginx -s reload`

## Troubleshooting

### 502 Bad Gateway

```bash
# Check if app container is running
docker compose ps app

# Check app logs
docker compose logs app

# Verify network connectivity
docker compose exec nginx ping app
```

### 413 Request Entity Too Large

Increase `client_max_body_size` in [nginx.conf](nginx.conf):
```nginx
client_max_body_size 20M;  # Adjust as needed
```

### Rate Limit Errors (429)

Adjust rate limits in [nginx.conf](nginx.conf):
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=50r/s;  # Increase rate
```

## Performance Tuning

### Worker Connections

Current: 2048 connections per worker

Adjust in [nginx.conf](nginx.conf):
```nginx
events {
    worker_connections 4096;  # Increase for high traffic
}
```

### Gzip Compression

Enabled for:
- text/plain, text/css, text/xml
- application/json, application/javascript
- fonts and SVG images

### Caching

Static files (`/_next/static/`) cached for 1 year.

## SSL Certificate Renewal

Certificates auto-renew via the `renew-ssl.sh` script:

```bash
# Manual renewal test
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [SSL Best Practices](https://ssl-config.mozilla.org/)
- [Docker Quickstart Guide](../docs/DOCKER_QUICKSTART.md)
