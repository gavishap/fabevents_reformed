# FAB Events website — start here

This folder is the FAB Events Israel website. You change it by **talking to
Claude Code** in plain English. Claude edits the files, shows you the result on
your own computer, and when you are happy you say **"push the site"** and it
goes live on the internet within about two minutes. You never need to touch
code.

---

## 1. One-time setup on a new computer (about 20 minutes)

Do these once, in order. Each is a normal installer: download, click Next,
keep the defaults.

1. **Node.js** — https://nodejs.org → download the **LTS** version → install.
   (This is the engine that builds the site.)
2. **GitHub Desktop** — https://desktop.github.com → install → **sign in** with
   your GitHub account. *Gabriel must first invite that account to the
   repository `gavishap/fabevents_reformed`; accept the invitation email.*
3. In GitHub Desktop: **File → Clone repository → `gavishap/fabevents_reformed`**
   → choose where to keep it (for example `Documents\fabevents`) → **Clone**.
   This downloads the website to your computer.
4. **Claude Code** — https://claude.ai/code → download the desktop app → sign
   in with your Claude account.
5. In Claude Code, open the folder you cloned in step 3.
6. Copy the message in the box below, paste it into Claude Code, press Enter,
   and follow what Claude says. When it gives you a link that starts with
   `http://localhost:4321`, open it: that is your local copy of the website.

```
This is the FAB Events Israel website project. Read CLAUDE.md and START-HERE.md and follow them exactly. Set the project up on this computer: install what is needed, make sure I can push to GitHub (tell me plainly if I have to sign in and open the sign-in window for me), start the preview and give me the link, and confirm the three design skills in .claude/skills are available. Then explain in three short sentences how I ask you for changes, how I see them, and how I make them live.
```

That is the whole setup. From now on you only do section 2.

---

## 2. Everyday use

1. Open Claude Code in the website folder.
2. Say what you want, the way you would tell a designer. Examples:
   - "On the homepage, change the banner text to *Celebrating life's most
     meaningful moments*."
   - "Add this photo to the About Us page under the Meet Risa section." (drag
     the photo into the chat)
   - "Change the phone number in the footer to 052-123-4567."
   - "Make the buttons a softer pink."
   - "Add a new package called Winter Weddings to the packages page."
3. Say **"show me"**. Claude gives you a link; open it (or refresh the page you
   already have open). Look at it on your phone size too: "show me on mobile".
4. Not right? Just say so: "bigger", "less pink", "undo that", "put the photo
   on the left".
5. Happy? Say **"push the site"**. Claude checks everything, saves it, and
   sends it to the internet. About two minutes later the real website shows
   the change. Refresh it to see.

### Phrases that Claude understands

| Say | What happens |
|---|---|
| "show me" / "preview" | Opens your local copy of the site with the change |
| "show me on mobile" | Shows the phone-size view |
| **"push the site"** | Puts the current version live on the internet |
| "undo" / "go back" | Removes the last change |
| "what did we change today?" | Plain-English summary |
| "put it back the way it is live" | Throws away everything not yet pushed |
| "is it live yet?" | Claude cannot see the live server; open the website and refresh |

### Making the design better (the "taste" skills)

The project includes design skills from https://github.com/leonxlnx/taste-skill
that stop the AI from producing generic-looking pages. You do not need to
install anything. Just ask for design work and Claude uses them:

- "Use the redesign skill to make the homepage feel more premium. Keep our
  logo and colours."
- "Improve the spacing and typography on the Testimonials page."
- "Make the buttons and headings feel more elegant across the whole site."

Claude will propose first, show you a preview, and only apply after you say
yes. It always checks desktop and phone sizes. Take it one page or one theme
(colours, fonts, buttons) at a time; that keeps changes easy to judge and easy
to undo.

---

## 3. Good to know

- **Nothing is live until you say "push the site".** Previewing is safe; you
  can experiment as much as you like.
- **Everything is saved in history.** Any pushed version can be brought back:
  "go back to how the site looked yesterday".
- **The contact form** sends email through a service that Gabriel configured
  in the hosting (Vercel). If the form stops delivering, tell Gabriel; it is a
  setting there, not something in the website files.
- **The old WordPress site is retired.** Do not edit there; changes made in
  WordPress will not appear on the live site. Never ask Claude to "capture" or
  "re-import" from WordPress: that would overwrite your changes.
- **Do not edit files by hand** in a text editor. Always go through Claude so
  it can check the site still builds.
- If Claude ever says a push was rejected or a login is needed, a browser
  window for GitHub will open; sign in with the invited account. If no window
  opens, open GitHub Desktop, make sure it is signed in, and try "push the
  site" again.

## 4. For Gabriel (owner setup, once)

- Invite the editor's GitHub account as a collaborator (write access) on
  `gavishap/fabevents_reformed`.
- In Vercel: import `gavishap/fabevents_reformed`, framework Astro, root
  directory left blank. Set `PUBLIC_SITE_URL` to the public domain and one of
  `RESEND_API_KEY` (+ `CONTACT_TO`) or `WEB3FORMS_ACCESS_KEY` for the contact
  form. Add the domain under Domains. Every push to `main` then deploys.
