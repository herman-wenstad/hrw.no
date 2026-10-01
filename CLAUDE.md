# hrw.no

Personal site for Herman Wenstad — "Founder. Advisor. Maker."

## Rules
- **Explicit go before executing.** Propose changes and wait for a clear "go". Questions and ideas are not a go.
- Nothing goes live (GitHub Pages / DNS) without Herman's approval.
- Keep it static: plain HTML/CSS/JS, no build step, no frameworks.

## Structure
- `index.html` — hero (three role words = nav), about, contact button, footer, two `<dialog>` modals
- `styles.css` — all styling; tokens on `:root`
- `main.js` — `WORK` data (two items per role → work modal), modal open/close, contact form
- `assets/` — logo + portrait (currently placeholders)
- `dev/serve.py` — no-cache local preview server

## Modals
- Full-screen sheet, rgba(14,14,16,.85) + blur. Close: ×, Esc, click empty space, or pull-to-close.
- Pull-to-close (`createSheet` in main.js): at the top, scrolling/swiping further up drags the sheet continuously (`--pull`, `--p` CSS vars), fading as it goes; on release it slides away past `DISMISS_AT` or springs back.
- Trackpad momentum must never start a pull: fresh input = pause before it or growing deltas; decaying deltas while pulling = fingers lifted = release.

## Content
- Role modals read from `WORK` in `main.js`. Each item: `name`, `role`, `shot` (image path or `null` for placeholder), `text` (array of paragraphs).
- Font: Google Sans Flex (Google Fonts).

## Contact form
- Posts to Web3Forms. Set `WEB3FORMS_KEY` in `main.js`. Until set, the form shows a "not connected" message.

## Preview locally
`cd ~/Projects/hrw.no && python3 dev/serve.py` → http://localhost:4300
(Use this, not `python3 -m http.server` — it disables caching; the plain server let the browser keep running stale JS.)
(The Claude Code session has a `hrw-site` launch config for this.)

## Deploy (not yet enabled)
- GitHub Pages from `main` branch root, repo `herman-wenstad/hrw.no`.
- Custom domain hrw.no: add `CNAME` file containing `hrw.no`, then point DNS at GitHub Pages (A records 185.199.108–111.153 + `www` CNAME → herman-wenstad.github.io).

## TODO
- Real logo (SVG) and cut-out portrait
- Real copy for About and the six role items, plus screenshots
- LinkedIn URL in footer
- Web3Forms key
