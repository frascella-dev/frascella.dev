# builder

Packages the portfolio — static site + PHP API — into a single tarball that
deploys onto CloudPanel by extracting it once. See `DEPLOY.md` (also shipped
inside every tarball) for the server-side steps.

```bash
./build.sh                   # full build → dist/portfolio-<timestamp>.tar.gz
./build.sh --skip-site       # reuse services/site/dist as it is
./build.sh --api-url URL     # bake an absolute API base into the site
                             # (default is "" — same-origin /api)
```

Requires: node/npm (site build), PHP ≥ 8.1 + composer (API vendor/).

What lands in the tarball:

| Path              | Content                                              |
| ----------------- | ---------------------------------------------------- |
| `htdocs/`         | `services/site/dist` + `api/index.php` entry point   |
| `app/`            | API `src/`, `vendor/`, `.env.example`, empty `var/`  |
| `DEPLOY.md`       | CloudPanel walkthrough + the nginx `/api` snippet    |

`dist/` and `stage/` here are throwaway build output — both gitignored.
