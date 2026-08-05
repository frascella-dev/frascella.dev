#!/usr/bin/env bash
#
# Packages the whole portfolio into one tarball ready for CloudPanel:
#
#   htdocs/           ← document root: the built static site + api/index.php
#   app/              ← private: PHP sources, vendor/, .env(.example), var/
#   DEPLOY.md         ← the CloudPanel steps, including the nginx snippet
#
# Usage:
#   ./build.sh                  # build site + api, produce dist/portfolio-<ts>.tar.gz
#   ./build.sh --skip-site      # reuse services/site/dist as it is
#   ./build.sh --api-url URL    # bake a non-same-origin API base into the site
#
# By default the site is built with PUBLIC_API_URL="" — same-origin — because
# in this layout the API lives on the same vhost under /api.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$(dirname "$HERE")")"
SITE="$ROOT/services/site"
API="$ROOT/services/api"
STAGE="$HERE/stage"
OUT="$HERE/dist"

API_URL=""
SKIP_SITE=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-site) SKIP_SITE=1; shift ;;
        --api-url) API_URL="${2:?--api-url needs a value}"; shift 2 ;;
        *) echo "unknown option: $1" >&2; exit 1 ;;
    esac
done

step() { printf '\n\033[1m— %s\033[0m\n' "$1"; }

step "site: build (PUBLIC_API_URL='${API_URL}')"
if [[ "$SKIP_SITE" == 1 && -d "$SITE/dist" ]]; then
    echo "  --skip-site: reusing existing services/site/dist"
else
    [[ -d "$SITE/node_modules" ]] || (cd "$SITE" && npm install)
    (cd "$SITE" && PUBLIC_API_URL="$API_URL" npm run build)
fi
[[ -f "$SITE/dist/index.html" ]] || { echo "site build produced no dist/index.html" >&2; exit 1; }

step "api: composer install (no dev)"
(cd "$API" && composer install --no-dev --optimize-autoloader --quiet)

step "stage"
rm -rf "$STAGE"
mkdir -p "$STAGE/htdocs/api" "$STAGE/app/var/state" "$OUT"

# Document root: the static site, plus the API's one public file.
cp -r "$SITE/dist/." "$STAGE/htdocs/"
cp "$API/public/index.php" "$STAGE/htdocs/api/index.php"

# Private side, next to the docroot rather than inside it.
cp -r "$API/src" "$API/vendor" "$STAGE/app/"
cp "$API/.env.example" "$STAGE/app/.env.example"

cp "$HERE/DEPLOY.md" "$STAGE/DEPLOY.md"

step "tar"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARBALL="$OUT/portfolio-$STAMP.tar.gz"
tar -czf "$TARBALL" -C "$STAGE" .
rm -rf "$STAGE"

step "done"
du -h "$TARBALL" | cut -f1 | xargs printf '  %s  '
echo "$TARBALL"
