#!/bin/sh
# Web process entrypoint: migrate → warm caches → PHP-FPM → Nginx
set -e

cd /var/www/html

# ── Validate required env vars ────────────────────────────────
REQUIRED_VARS="APP_KEY APP_URL DB_HOST DB_USERNAME DB_PASSWORD JWT_SECRET"
MISSING=""
for VAR in $REQUIRED_VARS; do
    eval "VAL=\$$VAR"
    if [ -z "$VAL" ]; then
        MISSING="$MISSING $VAR"
    fi
done
if [ -n "$MISSING" ]; then
    echo "[entrypoint] FATAL: Missing required environment variables:$MISSING"
    exit 1
fi

# ── Database migrations ───────────────────────────────────────
echo "[entrypoint] Running migrations..."
php artisan migrate --force --no-interaction

# ── Warm Laravel caches ───────────────────────────────────────
echo "[entrypoint] Caching configuration, routes, and views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# ── Storage symlink (idempotent) ──────────────────────────────
php artisan storage:link --quiet 2>/dev/null || true

# ── Start PHP-FPM as background daemon ───────────────────────
echo "[entrypoint] Starting PHP-FPM..."
php-fpm --daemonize

# ── Start Nginx in foreground (PID 1) ────────────────────────
echo "[entrypoint] Starting Nginx..."
exec nginx -g "daemon off;"
