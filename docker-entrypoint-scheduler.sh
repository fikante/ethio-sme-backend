#!/bin/sh
# Scheduler process entrypoint — runs artisan schedule:run every 60 seconds
set -e

cd /var/www/html

echo "[scheduler] Starting scheduler loop..."
while true; do
    php artisan schedule:run --no-interaction >> /dev/null 2>&1
    sleep 60
done
