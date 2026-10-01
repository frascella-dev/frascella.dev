# frascella.dev

The website of frascella.dev, on WordPress with Elementor and Polylang, built from
[Bottega](https://github.com/frascella-dev/bottega).

| | |
|---|---|
| `wp-content/themes/frascella` | **The look.** Templates, CSS and motion (built with Vite), the words per language and who the site belongs to in `inc/content/`. |
| `wp-content/plugins/frascella` | **The rest.** The projects (Portfolio), the Elementor widgets, the Kit, the e2e tests. |
| `wp-content/mu-plugins/local-mail.php` | Locally, no email leaves: everything goes to Mailpit. |
| `docs/guidelines/` | How the site is built, and why. |
| `.claude/` | The Claude Code skills and agents for working on it. |

## Local site

```sh
bin/setup                                    # → http://localhost:8110 (admin / admin), mail → http://localhost:8135
bin/wp <command>                             # WP-CLI
cd wp-content/themes/frascella && npm run build   # after CSS or TypeScript changes
cd wp-content/plugins/frascella && npm test       # widgets, editor, languages, accessibility
```

## Release

See [`docs/guidelines/10-release-and-deploy.md`](docs/guidelines/10-release-and-deploy.md):
1. the version in three places;
2. `CHANGELOG.md`;
3. `bin/build-zips`;
4. a GitHub release;
5. install on production with WP-CLI.

## Two rules

- **`/privacy` says what the code does.** When what the site collects changes, that page
  changes in the same release.
- **No invented facts about the business.**
