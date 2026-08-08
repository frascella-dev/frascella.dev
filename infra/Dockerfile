# The deployed portfolio as one image.
#
# This is not a development convenience — it is the CloudPanel layout, built
# the way `services/builder/build.sh` builds the tarball, so that what runs
# here is what runs on the server:
#
#   /srv/site/htdocs   document root: the static site + api/index.php
#   /srv/site/app      private: src/, vendor/, bin/, var/ — never served
#
# nginx inside the container also mirrors CloudPanel's two-hop shape (a public
# server proxying to a PHP server on 8080), which is the only way to exercise
# `Http::clientIp()` for real: behind that hop the socket peer is loopback and
# the visitor's address arrives in X-Real-IP.
#
# Build context is the repository root — see infra/docker-compose.yml.

# --- the static site --------------------------------------------------------
FROM node:22-alpine AS site

WORKDIR /src
COPY services/site/package.json services/site/package-lock.json ./
RUN npm ci

COPY services/site/ ./
# Empty base URL: in this layout the API is same-origin under /api, exactly as
# in the deploy tarball.
RUN PUBLIC_API_URL="" npm run build

# --- PHP dependencies -------------------------------------------------------
FROM composer:2 AS deps

WORKDIR /src
COPY services/api/composer.json services/api/composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

# --- runtime ----------------------------------------------------------------
FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache nginx mysql-client \
    # pdo_sqlite ships enabled in the official image; pdo_mysql does not, and
    # the whole point of this compose file is exercising the other driver.
    && docker-php-ext-install -j"$(nproc)" pdo_mysql \
    && docker-php-ext-enable opcache

COPY infra/php.ini /usr/local/etc/php/conf.d/portfolio.ini
COPY infra/php-fpm.conf /usr/local/etc/php-fpm.d/zz-portfolio.conf
COPY infra/nginx.conf /etc/nginx/nginx.conf

WORKDIR /srv/site

# Document root: the built site, plus the API's one public file.
COPY --from=site /src/dist/ ./htdocs/
COPY services/api/public/index.php ./htdocs/api/index.php

# Private side, next to the docroot rather than inside it. index.php walks up
# two directories to find it — the same resolution the tarball relies on.
COPY --from=deps /src/vendor/ ./app/vendor/
COPY services/api/src/ ./app/src/
COPY services/api/bin/ ./app/bin/
COPY services/api/.env.example ./app/.env.example

COPY infra/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p app/var/state /var/log/nginx /run/nginx \
    && chown -R www-data:www-data /srv/site/app/var

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint"]
