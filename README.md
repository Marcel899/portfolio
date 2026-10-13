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
assets/js/main.js     hero meteor canvas, slider, lightbox, copy, back-to-top
assets/work/          wiki screenshots (*.webp full size, *-t.webp thumbnails)
assets/icons/         game, server and profile icons (PNG — see note below)
```


