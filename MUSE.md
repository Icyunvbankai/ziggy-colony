# Ziggy's Colony — Bot Crossing + Muse

This is a fork of [Bot Crossing](https://github.com/Station-Sciences/bot-crossing)
(Station Sciences / Jarren Rocks, MIT) with two additions:

1. **Muse harness adapter** (`server/harnesses/muse.mjs`) — Muse has no local
   transcript files, so the adapter reads a snapshot the Muse runtime writes
   (`data/muse-snapshot.json`, local-only, never pushed). Each site team is a
   thread; the snapshot carries only facts (job status, run times) and the
   adapter owns the project-zone mapping.
2. **Static hosting** (`src/game/api.js`, `VITE_BOT_CROSSING_STATIC=1`) — no
   server. The client fetches `threads.json` + `state.json` (refreshed by the
   publisher) and persists archives/layout to the browser's localStorage.
   Build: `VITE_BOT_CROSSING_STATIC=1 npx vite build --base=./`, then the
   `dist/` output is copied to `docs/` for GitHub Pages.

## Live

https://icyunvbankai.github.io/ziggy-colony/ — refreshed every 5 minutes by
the `bot-crossing-sync` job (snapshot → `tools/muse-threads.mjs` →
`docs/threads.json` push). The page polls `threads.json` every 15 seconds, so
new activity shows up within ~5 minutes of happening.

## Visibility

This repo is PUBLIC, so the colony page is public too: anyone with the link
can see team names, project names, and live/failed status. That is the tradeoff
for free static hosting. If it ever needs gating, the move is Cloudflare Access
or a private repo — not a change to this code.

## Run locally (with live Muse threads)

```bash
# 1. Write data/muse-snapshot.json (see server/harnesses/muse.mjs for schema)
# 2. node tools/muse-threads.mjs   # → docs/threads.json (or use the server)
npm install && npm run dev
```

## Original README

See `README.md` (upstream) for the full Bot Crossing documentation — planets,
navigation, harness adapters, performance, and the keeping-it-local notes.
