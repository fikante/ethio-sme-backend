#!/bin/sh
# Queue worker process entrypoint
set -e

cd /var/www/html

echo "[worker] Starting queue worker..."
exec php artisan queue:work \
    --sleep=3 \
    --tries=3 \
    --timeout=90 \
    --queue=default,high \
    --max-time=3600
