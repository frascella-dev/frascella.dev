---
name: release-deploy
description: Version, build, release on GitHub and deploy a Bottega site's theme and plugin to a production WordPress over SSH with WP-CLI, then check it read-only. Use when the user asks to release, publish, deploy or update production.
---

# Release and deploy

Answer in the user's language. The rules are in `docs/guidelines/10-release-and-deploy.md`.
Deploying is outward-facing: confirm with the user before the first deploy to a new
server, and whenever a step changes data on production.

## 1. Before

1. Run the `verify` skill locally. Everything passes, or the user knows what does not.
2. **Privacy.** Did the release change what the site collects? Then the notice changes in
   this release (`privacy-notice`).
3. `git status` is clean, apart from the release changes.
4. **The server keeps what the notice says.** On a first deploy to a server (or a new one),
   read the log rotation (`grep -A8 logs /etc/logrotate.d/*`) and check it matches the
   retention the notice states (frascella.dev: the site's logs 7 days, the web server's error
   log 14 days; see the guideline's "The server"). Never write a retention into the notice
   that the server is not set to.

## 2. Version and changelog

1. Bump the version in **all three places**: `style.css`, the plugin header, `FRASCELLA_VERSION`.
   `bin/build-zips` refuses when they disagree.
2. Add a `CHANGELOG.md` entry, `## [x.y.z] — YYYY-MM-DD`, with bold leads, saying what
   changed for the people who run the site.
3. Commit ("x.y.z: <what the release is about>"), then push.

## 3. Build and release

```sh
bin/build-zips
gh release create vX.Y.Z dist/*.zip --title "<Name> X.Y.Z" --notes-file <the changelog entry>
```

The notes say what to install, and which companion plugin versions the release was
tested with.

## 4. Deploy (SSH + WP-CLI)

Use the host, user, key and site path recorded in `CLAUDE.md`. Never guess them.

1. **Upload** the zips to a private folder outside the web root:
   `mkdir -p ~/tmp/deploy && chmod 700 ~/tmp/deploy`, then `scp`.
2. **Install**, replacing the current version:
   ```sh
   wp plugin install ~/tmp/deploy/<slug>-plugin-X.Y.Z.zip --force
   wp theme install  ~/tmp/deploy/<slug>-theme-X.Y.Z.zip --force
   ```
3. **Run what the release needs:**
   - `wp <slug> kit` when tokens changed;
   - a migration command when data changed (dry run first, where there is one);
   - `wp rewrite flush` when routes changed.
4. **Clear the caches:** `wp cache flush`, plus the page cache (Varnish, CDN) if there is
   one.
5. **Delete the uploaded files** from the server.

**Data that has to travel** (an import):
- extract only what is needed, and never a raw dump;
- upload it, import it, delete it;
- never print its personal content.

## 5. Check production (read-only)

Run the production part of `verify`. Then tell the user:
- the release link;
- what is now live;
- what you checked;
- anything they must do themselves (rotate a key, set an SMTP password, check an inbox).

## Never

- Submit a form or send an email on production to "test".
- Use a credential you found in data. Report it instead.
- Leave a deploy key on the server after the work is done, unless the user wants it there.
