#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EMAIL="${1:-info@casingconnect.com}"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not installed." >&2
  exit 1
fi

mkdir -p deploy/certbot/www deploy/certbot/conf

# Ensure HTTP nginx with ACME challenge path is active
cp deploy/nginx/default.conf deploy/nginx/active.conf
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production up -d nginx

echo "Requesting Let's Encrypt certificate for casingconnect.com ..."
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive --keep-until-expiring \
  -d casingconnect.com -d www.casingconnect.com

# Switch nginx to HTTPS
cp deploy/nginx/ssl.conf deploy/nginx/active.conf
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production up -d nginx

echo
echo "HTTPS is enabled."
echo "Update .env.production to:"
echo "  CORS_ORIGINS=https://casingconnect.com,https://www.casingconnect.com"
echo "  NEXT_PUBLIC_API_URL=https://casingconnect.com/api/v1"
echo "  NEXT_PUBLIC_SITE_URL=https://casingconnect.com"
echo "Then run: ./deploy/deploy.sh"
echo
echo "Certificates renew with: docker compose -f docker-compose.prod.yml run --rm certbot renew"
