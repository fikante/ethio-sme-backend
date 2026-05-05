FROM php:8.3-cli-alpine

WORKDIR /var/www/html

RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libpq-dev \
    oniguruma-dev \
    postgresql-client \
    unzip \
    zip \
    && docker-php-ext-install \
        intl \
        mbstring \
        pdo \
        pdo_pgsql

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
