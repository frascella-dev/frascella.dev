# Getting started

From "Use this template" to a site you can build on, in about ten minutes.

## You need

- **Docker**, running. Everything WordPress needs runs in containers.
- **Node 20+.** It builds the theme and runs the tests.
- **Python 3.** It runs `bin/init`.
- **Optional:** an Elementor Pro zip you are licensed for. Without it the Theme Builder is
  off and everything else works.

## 1. A repository from the template

```sh
gh repo create studio-rossi --template frascella-dev/bottega --private --clone
cd studio-rossi
```

## 2. Rename

```sh
bin/init "Studio Rossi" rossi --domain studiorossi.it --dry-run   # what would change
bin/init "Studio Rossi" rossi --domain studiorossi.it
```

**The slug is one lowercase word.** It becomes, unchanged:
- the plugin's and the theme's folders;
- the PHP prefix (`rossi_`, `ROSSI_`, `Rossi_`) and the text domain;
- the CSS prefix (`rossi-`), the JS global and the Docker project.

**`--domain`** is the business's email domain. Locally, mail to it is rewritten to a test
address.

**`--port`** moves the site if 8110 is taken. Mailpit goes to port + 25.

**What changes besides the names:**
- `README.md` becomes the project's README;
- Bottega's own banner, icon and sources are removed, and so is `bin/init`.

## 3. The local site

```sh
bin/setup
# or, with Elementor Pro:
ELEMENTOR_PRO_ZIP=~/Downloads/elementor-pro.zip bin/setup
```

It installs WordPress (Italian), Elementor, Polylang with Italian on `/` and English on
`/en/`, and activates the plugin and the theme. Then it builds a **demo home** in both
languages:
- a native section;
- three columns that come in as you scroll;
- the plugin's Contact card, whose words are fields.

It also adds a privacy page and a menu per language. The addresses:
- the site: http://localhost:8110
- the admin: `/wp-admin` (admin / admin)
- Mailpit: http://localhost:8135

## 4. Check it

```sh
cd wp-content/plugins/rossi
npm install
npm test
```

Each test prints a line per check and ends with `all passed`.

## 5. Make it the project

1. **`CLAUDE.md` → Project:** the business, languages, production host, plugins, who
   receives email. Only facts the owner gave.
2. **Settings → Studio Rossi:** the same facts, on the local site.
3. **`tokens.json`:** the palette and the fonts, when there is a design. Then:
   `npm run build` in the theme, and `bin/wp rossi kit`.
4. **The demo.**
   - Build the real pages in Elementor, following
     [04 · Elementor](guidelines/04-elementor.md).
   - Then delete `tools/demo.php`, `assets/src/css/components/demo.css` and its import.
5. **Commit:** "Start Studio Rossi from Bottega".

## What next

| To… | Read, or ask Claude to use |
|---|---|
| build a section | [04 · Elementor](guidelines/04-elementor.md), skill `elementor-section` |
| add a widget with data | skill `elementor-widget` |
| add a booking/reviews/newsletter plugin | [03 · The theme](guidelines/03-theme.md#drawing-another-plugin), skill `plugin-in-theme` |
| write the privacy notice | [08 · Privacy](guidelines/08-privacy.md), skill `privacy-notice` |
| go live | [10 · Release and deploy](guidelines/10-release-and-deploy.md), skill `release-deploy` |
