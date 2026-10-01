# 10 · Release and deploy

## Versions

- **The theme and the plugin share one version number.** It appears in three places:
  - `style.css` (`Version:`);
  - the plugin header (`* Version:`);
  - `FRASCELLA_VERSION`.

  `bin/build-zips` refuses to run when these disagree.
- **Semantic versioning:**
  - patch for fixes;
  - minor for new features;
  - major when something a site relies on changes (a filter, a template's variables, an
    option's shape).
- **`CHANGELOG.md`**, newest first, in the form `## [x.y.z] — YYYY-MM-DD`. Each entry says
  what changed for the people who run the site, in plain words, with a bold lead.

## Building

```sh
bin/build-zips      # dist/frascella-theme-<v>.zip and dist/frascella-plugin-<v>.zip
```

- **The theme zip carries the built `assets/dist` and its manifest**, and not the sources,
  `node_modules`, or Vite's config.
- **The plugin zip carries no tests.**
- **`*.zip` is ignored by git.** Releases live on GitHub, and a commercial plugin's zip
  (Elementor Pro) carries a licence.

## Releasing

1. Update the version in the three places and write the changelog entry.
2. Commit, then push.
3. Build the zips.
4. `gh release create v<x.y.z> dist/*.zip --notes-file <the changelog entry>`.

**The release notes say what to install**, including which version of each companion plugin
the release was tested with.

## The server: what the privacy notice promises about it

The notice states how long the web server keeps its logs. On frascella.dev (an OVHcloud VPS,
SBG6, Strasbourg, managed with CloudPanel) that is what the panel already does:

- **the site's access and error logs** (`~/logs/nginx/*.log`): rotated daily, **kept 7 days**
  (`/etc/logrotate.d` entry of CloudPanel, `rotate 7`);
- **the web server's own error log** (`/var/log/nginx/error.log`, which can contain a
  client's IP): kept **14 days** (`rotate 14`); its access log stays empty because each
  site logs into its own folder.

A figure in the notice is only true while the server is set to it, so:

- on a first deploy, and on any move to a new server, read those `logrotate` entries
  (`grep -A8 logs /etc/logrotate.d/*`) and check they still say what the notice says;
- if the retention changes, the notice changes in the same release, in every language.

## Deploying (WordPress over SSH)

**Prerequisites:**
- an SSH key for the server's site user;
- WP-CLI on the server.

**Run WP-CLI remotely** through a small wrapper that filters PHP deprecation noise:

```sh
ssh -i ~/.ssh/<key> <user>@<host> "cd ~/htdocs/<site> && wp $*"
```

**Steps:**

1. Upload the zips to a private folder on the server (`chmod 700`), never inside the web
   root.
2. Install them, replacing the current version:
   ```sh
   wp plugin install /path/frascella-plugin-<v>.zip --force
   wp theme install  /path/frascella-theme-<v>.zip --force
   ```
3. Run what the release needs:
   - `wp frascella kit` when tokens.json changed;
   - a migration command when data changed;
   - `wp rewrite flush` when routes changed.
4. When the icons changed (and on a first deploy), copy the two that are asked for without
   reading the page into the web root, where nginx answers them:
   ```sh
   cp wp-content/themes/frascella/assets/icons/{favicon.ico,apple-touch-icon.png} .
   ```
5. `wp cache flush`. Purge the page cache (Varnish, a CDN) too if there is one.
6. Delete the uploaded files from the server.

## Checking production (read-only)

- **Every kind of page answers 200** in every language. The 404 answers 404.
- **Each page's words, canonical and `hreflang`** are right.
- **Pages that should not be indexed** carry `noindex`, and are not in the sitemap.
- **The stylesheet and the scripts load**, with no console errors.
- **What the release changed** is visible.

**Never:**
- submit a form;
- send an email;
- create a test record on production.

Use a fake token to see a "link not valid" page. Use a headless browser for screenshots.

**If an analytics service is on the site:**
- remember automated browsers may be ignored;
- your test visits count;
- test Firefox and Safari as well as Chrome.

## Access

- **SSH keys, not passwords.** Remove the deploy key from the server when the work is done.
- **Credentials live in a file outside git** and are never written into docs, commits or
  conversations.
- **Admin accounts for the people who run the site** get their own users, never a shared
  one.
