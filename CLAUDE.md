# FAB Events Israel website — instructions for Claude Code

You are maintaining the public website of FAB Events Israel by Risa
(https://fabeventsisrael.com) for a **non-technical site owner**. Read
`START-HERE.md` too: it is what the owner was given.

## How to talk to the owner

- Plain language. No jargon, no file paths, no git terms unless they ask.
  Say "the homepage banner", not "the hero container in content.html".
- Short answers. One question at a time. Offer 2 or 3 concrete options
  when a request is vague ("softer colours" → show three swatches).
- Always show, then confirm: after a change, make sure the preview is running,
  give the link, say exactly what to look at, and ask if it is right.
- Do the reversible things without asking. Ask before deleting content,
  before pushing something they have not previewed, and before any change to
  the contact form or menu structure.
- Report honestly. If a build fails or a push is rejected, say so in one
  sentence and what you will do about it.

## What this project is

A static [Astro](https://astro.build) website. The pages are the exact
markup, CSS, JS and images of the original WordPress/Elementor site, captured
once; Astro adds the shared layout, routing, sitemap and build.

- Repository: https://github.com/gavishap/fabevents_reformed (branch `main`).
- Hosting: Vercel, connected to that repository. **Every push to `main` goes
  live automatically in about two minutes.** There is no other deploy step.
- **This repository is the single source of truth.** The WordPress site is
  retired as an editor. **Never run `npm run capture`** (it would overwrite
  every edit made here with a fresh copy from WordPress). Never suggest editing
  in WordPress.

## First time on a computer

1. `npm install`
2. `git remote -v` must show `gavishap/fabevents_reformed`; run `git pull`.
3. `npm run dev` and open http://localhost:4321 to confirm the site renders.
4. Confirm the skills exist: `.claude/skills/` should contain
   `design-taste-frontend`, `redesign-existing-projects`, `high-end-visual-design`.
   If not: `npx skills add https://github.com/Leonxlnx/taste-skill -s design-taste-frontend -s redesign-existing-projects -s high-end-visual-design -a claude-code -y --copy`
5. Check push access with `git push --dry-run origin main`. If it asks for a
   login, tell the owner: "A GitHub sign-in window will open; sign in with the
   account Gabriel invited." On Windows the browser window opens by itself; if
   nothing opens, have them install and sign in to GitHub Desktop, then retry.

## Phrases the owner will use, and what they mean

| They say | You do |
|---|---|
| "show me", "preview", "let me see", "open it" | Make sure `npm run dev` is running (start it in the background if not). Give them http://localhost:4321 plus the exact page link. Take a screenshot yourself, desktop and mobile width, to check it before they look. |
| "change X to Y", "make the button pink", "add a photo of …" | Make the edit (see *Where things live*), then show the preview and ask if it is right. |
| "make it look more modern / premium / cleaner / less busy" | Design work: see *Design work* below. Propose first, apply after a yes. |
| **"push the site"**, "make it live", "publish", "put it online" | Run the *Pre-flight*. Commit with a plain-English message describing the change. `git push origin main`. Then reply: "Pushed. It will be live at the site address in about two minutes. Refresh the page to see it." If the push is rejected, explain in plain words and fix it (usually sign-in, or `git pull --rebase` then push again). |
| "undo", "go back", "I didn't like that" | Not pushed yet: revert the working files (`git checkout -- <files>` or `git restore`). Already pushed: `git revert <commit>` and push again. Say what you undid. |
| "what did we change", "what's different" | Summarise `git log` / `git diff` in plain words, no hashes. |
| "put it back the way it is live", "start over" | Confirm first, then `git reset --hard origin/main` and restart the preview. |
| "is it live yet", "did it work" | You cannot see Vercel from here. Tell them to open the site address and refresh; if it is still old after five minutes, Gabriel should check the Vercel dashboard. |

## Where things live (edit these)

| What the owner wants to change | File(s) |
|---|---|
| Text, headings, buttons, links, sections of a page | `src/data/pages/<page>/content.html` — pages: `home`, `about-us`, `our-services`, `contact-us`, `customized-weddings`, `customized-bar-bat-mitzvot`, `fab-signature-celebration-packages`, `virtual-events`, `day-of-the-event-coordinator`, `personal-booking-agent`, `testimonials`, `idf-base-celebrations`, `hello-world`, `404` |
| Menu, logo, header / footer (contact details, social links, copyright) | `src/data/layout/header.html`, `src/data/layout/footer.html` |
| Browser tab title of a page | `<title>` in `src/data/pages/<page>/head.html` |
| **Colours, fonts, spacing, buttons, hover effects, any look-and-feel** | **`public/custom.css`** — loaded last, overrides everything. Put ALL styling changes here, one commented block per change. Target one page with its body class (`.page-id-13` is home; ids are `wpId` in each page's `meta.json`). |
| The original global palette / typography (Elementor "kit") | `public/assets/uploads/elementor/css/post-9.css` — only when `custom.css` cannot express it |
| Original per-page styles | `public/assets/uploads/elementor/css/post-<wpId>.css` |
| Images | Existing ones are under `public/assets/uploads/…`. Put **new** images in `public/images/` and reference them as `/images/<name>.jpg`. Resize to the displayed size and keep files under ~500 KB. |
| A new page | Copy an existing folder in `src/data/pages/`, edit `meta.json` (`name`, `path`, `title`, `bodyClass`, `wpId: null`), `head.html` (title), `content.html`; add its `meta.json` object to `src/data/pages.json`; add a menu link in `header.html` if wanted. |

Page markup is Elementor's: sections are `<div class="elementor-element elementor-element-xxxx …">`. Keep the wrapper classes when editing text so the original styling still applies. Text lives in `elementor-heading-title`, `elementor-widget-text-editor` and `elementor-button-text` elements.

## Do not touch unless explicitly asked

`api/contact.ts` (contact form delivery), `scripts/` (capture), `src/lib/`,
`src/layouts/Site.astro`, `astro.config.mjs`, `vercel.json`, `package.json`,
`public/assets/elementor/`, `public/assets/elementor-pro/`,
`public/assets/theme/`, `public/assets/wp/`.

## Design work (taste skills)

Three skills from https://github.com/Leonxlnx/taste-skill are installed in
`.claude/skills/`:

- `redesign-existing-projects` — use this **first** for any "make it look
  better" request: audit what is there, then improve layout, spacing,
  hierarchy and styling without breaking anything.
- `high-end-visual-design` — the direction that fits this brand: calm,
  polished, spacious, premium.
- `design-taste-frontend` — general design judgement and anti-generic rules.

Rules for this brand:

- Keep the identity unless told otherwise: the FAB logo, the rose/blush
  palette family, the Cormorant Garamond headings and Poppins body text.
- Every page, section, text, link, image, the menu and the contact form must
  keep working. Never remove content to "clean up"; propose removals and wait
  for a yes.
- Implement styling in `public/custom.css`; change `content.html` only when
  the structure must change. No new frameworks, build steps or JS libraries.
- Dials for this brand (the skills' 1–10 settings): DESIGN_VARIANCE 3,
  MOTION_INTENSITY 2, VISUAL_DENSITY 3.
- Check desktop (1280px) **and** mobile (375px) in the preview before saying
  it is done. Screenshot both.
- Work in small, previewable steps: one section or one theme (colours, type,
  buttons) at a time.

## Pre-flight before every push

1. `npm run build` completes without errors.
2. Preview screenshot at desktop and mobile width: nothing broken, header and
   footer intact, the menu opens.
3. `git status` shows only intended files. Never commit `.env`,
   `node_modules/`, `dist/`.
4. Commit message: one plain-English sentence, e.g. `Softer pink on the
   homepage buttons and larger heading on About Us`.

## Hard rules

- Never force-push or rewrite history. Never delete `public/assets/`.
- Never commit secrets. Contact-form keys live in Vercel's environment
  variables (`RESEND_API_KEY` or `WEB3FORMS_ACCESS_KEY`, `PUBLIC_SITE_URL`),
  which Gabriel manages.
- Work directly on `main` (single editor). If a push is rejected because the
  remote moved, `git pull --rebase origin main`, rebuild, push again.
- Commit messages end with `Co-Authored-By: Claude <noreply@anthropic.com>`.
