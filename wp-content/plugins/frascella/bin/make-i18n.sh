#!/usr/bin/env bash
# Regenerates the translations, as the owner's other plugins do (Chiaro's bin/make-i18n.sh):
# languages/frascella.pot from the PHP and the built admin app, then the .mo and the JSON
# the admin app loads, for every languages/*.po.
#
# Run after `npm run build`, with the local site up (WP-CLI runs in its container).
# Updating an existing .po with new strings: msgmerge -U languages/frascella-it_IT.po languages/frascella.pot
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."
ROOT=../../..
P=/var/www/html/wp-content/plugins/frascella
wp() { "$ROOT/bin/wp" "$@" 2>&1 | grep -v '^ *Container ' || true; }

wp i18n make-pot "$P" "$P/languages/frascella.pot" --slug=frascella --domain=frascella \
    --exclude=node_modules,src,tests,bin --skip-audit
wp i18n make-mo "$P/languages"
rm -f languages/frascella-*-*.json
wp i18n make-json "$P/languages" --no-purge

# WordPress looks the JSON up by the md5 of its script's path relative to the plugin
# (`build/admin.js`); WP-CLI names them after paths of its own. One file per locale, by
# that name, with every message the JSON files of that locale hold.
md5of() { printf '%s' "$1" | md5 -q 2>/dev/null || printf '%s' "$1" | md5sum | cut -d' ' -f1; }
for po in languages/frascella-*.po; do
    locale=$(basename "$po" .po | sed -E 's/^frascella-//')
    files=(languages/frascella-"$locale"-*.json)
    [ ${#files[@]} -eq 0 ] && continue
    target="languages/frascella-$locale-$(md5of build/admin.js).json"
    python3 - "$target" "${files[@]}" <<'PY'
import json, sys
target, files = sys.argv[1], sys.argv[2:]
merged = None
for f in files:
    d = json.load(open(f))
    if merged is None:
        merged = d
    else:
        merged['locale_data']['messages'].update(d['locale_data']['messages'])
merged['source'] = 'build/admin.js'
for f in files:
    import os; os.remove(f)
json.dump(merged, open(target, 'w'), ensure_ascii=False, separators=(',', ':'))
print(target)
PY
done
