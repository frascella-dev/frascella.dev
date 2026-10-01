---
name: bottega-new-project
description: Start a new WordPress + Elementor site from the Bottega template — rename the placeholder, bring up the local site, build, and record the project's facts. Use when the user creates a project from this template, or asks to set up, initialise or start a site from it.
---

# From the template to a running site

Answer in the user's language. Read `docs/guidelines/01-principles.md` first if you have not.

## 1. Rename

1. Ask for anything you cannot infer, in one question:
   - the display name ("Studio Rossi");
   - the slug, one lowercase word, which becomes the prefix, text domain, folders and JS
     global;
   - the business's email domain, whose addresses the local mail barrier rewrites;
   - a free local port. Bottega uses 8110, and other local sites may already take 8080 or
     8090.
2. Do a dry run first, then the real run:
   ```sh
   bin/init "Studio Rossi" rossi --domain studiorossi.it --port 8110 --dry-run
   bin/init "Studio Rossi" rossi --domain studiorossi.it --port 8110
   ```
3. Check that nothing is left behind:
   - `grep -ri frascella .` finds nothing outside `node_modules`;
   - `find wp-content tools -name '*.php' -exec php -l {} \;` passes.

## 2. Local site

1. `bin/setup`. Add `ELEMENTOR_PRO_ZIP=/path/to/elementor-pro.zip` if the user has a licence.
   Never copy that zip into the repository: `*.zip` is ignored, and the file carries a
   licence.
2. Open `http://localhost:<port>` and `/en/`. Log in with `admin` / `admin`, local only.
3. `cd wp-content/plugins/<slug> && npm install && npm test`. Every check must pass. With
   no Elementor Pro, the languages test says so and passes.

## 3. The project's facts

1. Fill the **Project** section at the top of `CLAUDE.md`:
   - the business;
   - the languages;
   - the production host;
   - the plugins the site runs;
   - who receives the site's email.

   **Only facts the user gives.** Never invent an address, a phone number or a VAT number.
   Leave a field empty rather than guess.
2. Put the same facts in the theme's `inc/content/who.php` (name, city, email, VAT,
   profiles). An unknown one stays empty.
3. Change `tokens.json` (palette and fonts) only when the user has a design. Then run
   `npm run build` in the theme and `bin/wp <slug> kit`.

## 4. First commit

`git init` if needed, then commit: "Start <Name> from Bottega". Do not push until the user
says where.

## Done when

- The site answers in both languages.
- The e2e tests pass.
- `CLAUDE.md` has the facts.
- Tell the user what they can open, and name the next thing to build.
