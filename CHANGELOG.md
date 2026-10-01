# Changelog

What changed for the people who run frascella.dev. The theme and the plugin are released
together and carry the same version.

## [1.1.0] — 2026-10-01

- **Portfolio is only the projects.** The "Impostazioni" tab is gone: the name, the VAT
  number, the place, the contacts and the profiles were settings nobody needed. What visitors
  read is typed where they read it, in Elementor: the footer's lines are its fields, and so
  are the GitHub and LinkedIn addresses (empty, no link). The page titles and the search
  engines' data read who the site belongs to from the theme (`inc/content/who.php`).
- **Footer fields take `{year}`**, so a typed "© {year} …" stays current.
- **Contact requests** are emailed to the address set in Agenda, or to the site's admin email.
- The Elementor dynamic tags ("Fact", "Contact link") are gone with the settings.

**Install:** `frascella-plugin-1.1.0.zip` and `frascella-theme-1.1.0.zip`. **Data:** on first
load the plugin deletes the old settings (`frascella_facts`) and the `frascella_manage`
capability; then `tools/site.php` types the profiles into the footer, in each language.
**Tested with** the same versions as 1.0.0.

## [1.0.2] — 2026-10-01

- **The site's icons.** The EF monogram as favicon (`.ico` and SVG), Apple touch icon and web
  app manifest (192, 512 and maskable), shipped with the theme. On deploy, `favicon.ico` and
  `apple-touch-icon.png` are also copied to the web root, which browsers ask for directly.
- **Privacy notice, ready for the statistics banner.** The notice now reads from the live
  tracker whether the consent banner is published, and describes the cookies only then. Checked
  against the Analytics code: it now says that only the totals remain after the 13 months, that
  withdrawing consent applies from then on, and that a form event records which form was sent.

**Install:** `frascella-plugin-1.0.2.zip` and `frascella-theme-1.0.2.zip` (no data changes),
then `tools/site.php rebuild` for the notice. **Tested with** the same versions as 1.0.0.

## [1.0.1] — 2026-10-01

- **Privacy notice: the logs as the server keeps them.** The site's access and error logs are
  kept 7 days, as the OVHcloud server (CloudPanel) is set; the web server's own error log, which
  can contain an IP address, up to 14 days. The notice said 14 days for everything.
- **Repository.** The previous site's code is gone, and the project is worked on `main` only.

**Install:** `frascella-plugin-1.0.1.zip` and `frascella-theme-1.0.1.zip` (no data changes from
1.0.0). **Tested with** the same versions as 1.0.0.

## [1.0.0] — 2026-10-01

The site, rebuilt on WordPress: the first release of the `frascella` theme and plugin.

- **The home page is the "manifesto".** A dark sheet with the big words cut out of it, and a
  3D desk at night behind it, visible through the letters. Sections: opening, the desk,
  services (platforms, apps, integrations), three projects shown on the laptop's screen,
  about, contact, and a colophon footer.
- **The desk can be touched.** In "la scrivania" the lamp, the turntable, the mug, the
  tablet (you can draw on it), the phone and the plant respond to a click. Keyboard users
  reach the same objects with the switches that appear on Tab. The record plays a vinyl
  crackle; "audio on / off" in the header stops it.
- **Loads the words first.** Text and layout are on screen before the 3D scene; the desk
  fades in through the letters when it is ready, and still pictures take its place where
  WebGL is missing.
- **Italian and English.** Italian on `/`, English on `/en/`, written separately. The
  phone's menu opens as an animated overlay.
- **Portfolio in the admin.** A "Portfolio" section, built like the other plugins:
  - **Progetti:** the projects shown on the home page, one tab per language, drag to
    reorder, drafts;
  - **Impostazioni:** the business's facts (name, VAT number, city, email, profiles).

  The projects moved from posts to their own table; the upgrade copies them on first load.
- **Contact through Agenda.** The form is Agenda's, drawn by the theme; requests go to the
  email set in Portfolio → Impostazioni.
- **Visit statistics with the owner's Analytics.** The "Analytics for WordPress" plugin
  loads the tracker from analytics.frascella.dev; the privacy notice describes exactly what
  it counts.
- **Privacy notice** in both languages, written from the code: the contact form, the
  statistics, the cookies, the hosting (OVHcloud, Strasbourg) and the 14-day access-log
  retention.

**Install:** `frascella-plugin-1.0.0.zip` and `frascella-theme-1.0.0.zip`.
**Tested with:** WordPress 7.1.2, Elementor 4.3.2, Elementor Pro 4.2.3, Polylang 3.8.10,
Agenda 1.2.0, Analytics for WordPress 1.0.0.

**Before deploying:** check the server's log rotation against the privacy notice (see
`docs/guidelines/10-release-and-deploy.md`, "The server").
