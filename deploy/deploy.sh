#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production — copy deploy/.env.production.example and fill secrets." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.production
set +a

# Nginx reads active.conf (HTTP first; enable-https.sh switches it to SSL).
# Prefer existing live config; else SSL template if certs exist; else plain HTTP.
if [[ ! -f deploy/nginx/active.conf ]]; then
  if [[ -f deploy/certbot/conf/live/casingconnect.com/fullchain.pem && -f deploy/nginx/ssl.conf ]]; then
    cp deploy/nginx/ssl.conf deploy/nginx/active.conf
  else
    cp deploy/nginx/default.conf deploy/nginx/active.conf
  fi
fi
mkdir -p deploy/certbot/www deploy/certbot/conf

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not installed." >&2
  exit 1
fi

# Build one image at a time — parallel api+web builds OOM a 1GB Lightsail/EC2 box.
echo "Building API image..."
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production build api
echo "Building Web image..."
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production build web
echo "Starting containers..."
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production up -d

# Pick up nginx config / sitemap bind-mount changes without a full recreate when possible
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production up -d nginx
"${COMPOSE[@]}" -f docker-compose.prod.yml --env-file .env.production exec -T nginx nginx -s reload || true

echo "CasingConnect deploy finished."
