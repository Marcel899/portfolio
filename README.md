# Marcel_899 — Portfolio

**Live:** https://marcel899.github.io/portfolio/

One-page portfolio site. Static HTML/CSS/JS, no build step, no dependencies.

## Run locally

```bash
python serve.py
```

Then open <http://localhost:5177>. `serve.py` sends no-cache headers so a normal
refresh always picks up your edits — plain `python -m http.server` will serve you
a stale `styles.css` and the page will look broken.

## Deploy

Hosted on GitHub Pages from `main` / root — push to `main` and the live site
updates in about a minute.

```bash
git add -A && git commit -m "Update" && git push
```

The folder also drops onto any other static host (Netlify, Vercel, Cloudflare
Pages) as-is; `index.html` must sit at the root.

## Structure

```
index.html            markup + all copy
assets/css/styles.css design system and every component
assets/js/main.js     slider, lightbox, copy-to-clipboard, scroll reveal
assets/work/          wiki screenshots (*.webp full size, *-t.webp thumbnails)
assets/icons/         game, server and profile icons (PNG — see note below)
```

Icons are **PNG on purpose**, not WebP: WebP icons failed to render in one
browser during development and PNG removed the variable. The large screenshots
in `assets/work/` are still WebP.

## Where the content came from

Everything on the page is real and verifiable:

- **Screenshots** — captured from the three live Fandom wikis
  (`gtd.fandom.com`, `unbox-asmr.fandom.com`, `stream-a-cheese-pull.fandom.com`),
  cropped to the article content so no Fandom chrome or ads appear.
- **Wiki stats** (articles / edits / photos / files) — the MediaWiki
  `siteinfo` API for each wiki.
- **Game visits** — the Roblox games API.
- **Game icons** — official Roblox game thumbnails.
- **Contacts** — Discord `marcel_899`, and the Roblox profile `dev_marcel1`
  (user ID `5218135416`).

Figures were recorded **September 2026** and are hardcoded. That includes the five
Discord member counts in the Communities list (from the Discord invite API) and
the four Bloombot figures beneath it (from the bot's own /stats). Refresh them by
editing the `<dd>` values in `index.html`.

## Things you may want to change

| What | Where |
|---|---|
| Commissions open / closed | the `Open / For Commissions` stat and `.cta__sub` in `#contact` |
| Discord handle | `data-copy` on the `.copy` buttons in `#contact` and the footer |
| Roblox link | the `Roblox profile` links in `#contact` and the footer |
| Accent colour | `--accent` in `:root` |
| Button feel | `.btn:hover` / `.btn:active`, plus `.btn--brick` and `.btn--ghost` |
| Per-project colours | `--pc` inline on each `.pinfo`, and `COLORS` in `main.js` |
| Add a project | add a `.ptab`, a `.shot`, and a `.pinfo`, then extend `URLS` + `COLORS` in `main.js` |
| Add a gallery image | copy a `.tile` block and set `data-src` / `data-title` / `data-cat` / `data-desc` |

The gallery shows 3 screens per project. Six more are already in `assets/work/`
and unused — `gtd-enemies`, `gtd-crates`, `gtd-codes`, `unbox-updates`,
`unbox-codes`, `sacp-codes` — so you can drop any of them back in without
re-capturing anything.
