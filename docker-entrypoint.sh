#!/bin/bash
set -e

cd /var/www/html

if [ ! -f node_modules/.package-lock.json ]; then
    echo "[entrypoint] Installing Node dependencies..."
    npm ci --silent
fi

echo "[entrypoint] Starting Vite..."
npm run dev &

echo "[entrypoint] Starting Laravel (${PHP_CLI_SERVER_WORKERS:-8} workers)..."
exec php artisan serve --host=0.0.0.0 --port=8000 --no-reload
