# ── Stage 1: Node — compile TypeScript/React assets ──────────
FROM node:20-alpine AS assets

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY resources/ resources/
COPY public/ public/
COPY vite.config.js tsconfig.json tailwind.config.js postcss.config.js ./
RUN npm run build

# ── Stage 2: PHP — production image ──────────────────────────
FROM php:8.3-fpm-alpine AS production

LABEL org.opencontainers.image.source="https://github.com/fikante/ethio-sme-backend"
LABEL org.opencontainers.image.description="EthioSME Valuation System — Laravel 12 + React/Inertia.js"

# System packages: Nginx, required C libs, and process tools
RUN apk add --no-cache \
    nginx \
    curl \
    git \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    icu-dev \
    libzip-dev \
    libpq-dev \
    oniguruma-dev \
    libxml2-dev \
    linux-headers

# PHP extensions required by the application
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        bcmath \
        intl \
        mbstring \
        pcntl \
        opcache

# OPcache tuning for production
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.fast_shutdown=1'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# PHP-FPM tuning
RUN { \
    echo 'upload_max_filesize = 64M'; \
    echo 'post_max_size = 64M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 120'; \
} > /usr/local/etc/php/conf.d/app.ini

# Install Composer 2
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies (production only, optimised autoloader)
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --optimize-autoloader \
    --no-scripts

# Copy all application code
COPY . .

# Overlay the compiled frontend assets from Stage 1
COPY --from=assets /build/public/build public/build

# Run Composer post-install scripts (package discovery, etc.)
RUN composer run-script post-autoload-dump

# Directory permissions: www-data must own storage and bootstrap/cache
RUN chown -R www-data:www-data \
        /var/www/html/storage \
        /var/www/html/bootstrap/cache \
 && chmod -R 775 \
        /var/www/html/storage \
        /var/www/html/bootstrap/cache

# Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Entrypoint scripts
COPY docker-entrypoint.sh          /usr/local/bin/docker-entrypoint.sh
COPY docker-entrypoint-worker.sh   /usr/local/bin/docker-entrypoint-worker.sh
COPY docker-entrypoint-scheduler.sh /usr/local/bin/docker-entrypoint-scheduler.sh
RUN chmod +x \
    /usr/local/bin/docker-entrypoint.sh \
    /usr/local/bin/docker-entrypoint-worker.sh \
    /usr/local/bin/docker-entrypoint-scheduler.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
