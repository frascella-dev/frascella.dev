# 8 · Privacy

**The privacy notice says what the code does.** Write it from the code, check it against
the code, and change it in the same commit as the code.

## When the notice must change

Any change to what the site collects, keeps, shows or shares:

| Change | What the notice must now say |
|---|---|
| a new form, or a new field | what is collected, why (the GDPR legal basis), how long it is kept, who reads it |
| a cookie or local-storage entry | its name, what it does, how long it lasts, whether it needs consent |
| an analytics service | what it measures, with and without consent, where it runs, how long it keeps data, who operates it |
| a third party (fonts, maps, embeds, a mail service) | who it is, what it receives, where it is |
| a retention setting | the new number of days |
| a plugin setting that changes behaviour (e.g. a public form switched off) | the new behaviour |

Before a release, read the notice against the settings **on production**. A setting that
differs from the one on the development machine is a sentence that is now wrong.

## How to write it

- **One section per thing the site does:** the booking request, the newsletter, the
  reviews, the statistics. Each says:
  - what is collected;
  - the legal basis (Art. 6(1)(a) consent, (b) pre-contractual, (f) legitimate interest);
  - who can read it;
  - how long it is kept;
  - how to withdraw.
- **Say what the site does *not* collect**, and keep that list true: a sentence like "no
  analytics" is a promise.
- **List the cookies by name**, with purpose, duration and type (technical, or needing
  consent).
- **Record consent word for word** where consent is the legal basis: the sentence as it
  was read, its language and the moment. The theme must not reword a sentence a plugin
  records.
- **No IP addresses kept** unless there is a reason, and the notice says the reason.
- **One page per language**, linked from every page's footer in that language
  (`frascella_privacy_url()`).

## Analytics

- **Without consent:** no cookies and no local storage, a truncated IP, and a daily
  rotating hash, if the service supports that.
- **With consent:** the cookies listed, the banner and a way to reopen it (a footer link).
  Global Privacy Control honoured.
- **Events carry names and short non-personal properties only.** Never a field's value, a
  name or an address. `lib/track.ts` is a no-op without a service.
- **The referrer lesson:** a server sending `Referrer-Policy: same-origin` makes Firefox and
  Safari send a cross-site beacon with `Origin: null`, and a service that accepts events
  only from registered domains answers 403.
  - State `strict-origin-when-cross-origin` in a `<meta name="referrer">` (the
    `frascella_referrer_policy` filter), or fix the server header.
  - Test in Firefox and Safari, not only Chrome.
  - Automated browsers are often ignored by trackers (`navigator.webdriver`). Test with
    that flag off, and remember that your test visit counts.
- **Pages whose address carries a token** (a private link) keep `no-referrer`.

## Email

- **Nothing real leaves a development machine** (see [09 · Testing](09-testing.md)).
- **The address that receives a site's notifications is the business's**, set in its
  settings, never a developer's. Check it on production after every deploy.

## Handling data during a project

- **Never read a `.env`, a credentials file or a raw database dump into a conversation**
  beyond what the task needs. Count; do not print.
- **Never upload a raw dump.** Extract the tables the task needs, upload them, use them,
  delete them from the server.
- **Credentials live in a file that is never committed**, and are never written into docs,
  commits or chat.
- **A password found in clear in old data** is reported to the owner to rotate. It is never
  used.
