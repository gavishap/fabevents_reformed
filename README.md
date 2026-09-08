# FAB Events Israel — static site

Static build of [fabeventsisrael.com](https://fabeventsisrael.com) as an
[Astro](https://astro.build) project, deployable to Vercel with no PHP. The
pages are the exact markup Elementor renders on the WordPress site, captured
by `scripts/capture.mjs`; Astro provides the layout, routing, nav state,
sitemap and build, and a Vercel function replaces the PHP contact-form handler.

The WordPress source (files + database, runnable with Docker) lives in
[gavishap/fabeventsisrael](https://github.com/gavishap/fabeventsisrael).

```
api/contact.ts            Vercel function: receives the Elementor Pro form POST, emails it
public/assets/            css / js / fonts / images copied from WordPress by the capture
scripts/capture.mjs       regenerates src/data + public/assets from a running WordPress
src/data/layout/          shared header / footer / skip-link markup
src/data/pages/<name>/    per page: meta.json, head.html, content.html, tail.html
src/layouts/Site.astro    page shell
src/lib/nav.ts            re-applies WordPress "current page" classes to the menu
src/lib/site.ts           data loader + origin placeholder filling
src/pages/                [...slug].astro (all pages), 404.astro, robots.txt.ts
astro.config.mjs
vercel.json               trailing slashes, long cache for /assets
```

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve dist/ locally
```

## Deploy to Vercel

1. Import this repo in Vercel. Framework preset: Astro (auto-detected),
   build `npm run build`, output `dist`.
2. Environment variables (Project Settings > Environment Variables):
   - `PUBLIC_SITE_URL` — the public origin, e.g. `https://www.example.com`
     (canonical URLs, share links, sitemap, robots.txt).
   - Contact form delivery, one of:
     - `RESEND_API_KEY`, `CONTACT_TO` (default `risa.fabevents@gmail.com`),
       `CONTACT_FROM` — [Resend](https://resend.com), verify the sending domain.
     - `WEB3FORMS_ACCESS_KEY` — [Web3Forms](https://web3forms.com), free key by email.
   Without one of these the form shows Elementor's "server error" message.
3. Add the custom domain under Project Settings > Domains and point DNS at Vercel.

Every push to `main` redeploys automatically; pull requests get preview URLs.

## Updating content

Edit the site in WordPress (live, or the Docker stack from the
`fabeventsisrael` repo), then re-capture and commit:

```bash
npm run capture                            # from the live site
npm run capture -- http://localhost:8090   # from the local Docker WordPress
git add -A && git commit -m "Recapture site" && git push
```

The capture takes plugin/theme/core files from a WordPress checkout found at
`$WP_ROOT` or in a sibling `../fabeventsisrael` directory (same plugin
versions as production). Without one it keeps the existing `public/assets`
and only downloads files referenced by the pages.

It rewrites `https://fabeventsisrael.com/wp-content/...` to `/assets/...`,
strips WordPress-only head tags (REST/oEmbed/RSD links, emoji script,
generator), keeps the origin as a placeholder wherever an absolute URL is
required (canonical, social share links) and neutralises the menu's active
state so `lib/nav.ts` can set it per route.

## What is not static

- The contact form posts to `/api/contact` (Vercel function) instead of
  `admin-ajax.php`; responses use Elementor's JSON format so its own JS shows
  the configured success / error messages.
- The sample "Hello world!" post's comment form has no backend.
- WordPress feeds, search, author/date archives and the REST API are not
  reproduced.
