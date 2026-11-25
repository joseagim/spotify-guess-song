# CLAUDE.md

Context and working rules for any AI agent (or human) working on this repository. Read this file fully before doing anything.

## What this project is
A Wordle/Heardle-style web game: guess songs from tiny audio fragments, using songs from Spotify (import) and Deezer (search). Phase 1 is single-player and runs locally only. Full spec: `REQUIREMENTS.md`.

## Read order at the start of every session
1. `CLAUDE.md` (this file) — how to work.
2. `REQUIREMENTS.md` — what to build. **Source of truth.**
3. `PROGRESS.md` — where we are, what was decided, what comes next.

## Non-negotiable rules
1. **Requirements first.** Build only what `REQUIREMENTS.md` describes. If something is unclear, missing or seems wrong, ask the owner instead of guessing. If the owner changes a requirement, update `REQUIREMENTS.md` first, then the code, and add an entry to the Decision log in `PROGRESS.md`.
2. **No scope creep.** Phase 2 and "Never" items are not built, stubbed or "prepared for" beyond the abstractions the spec already asks for (e.g. the `AudioEngine` interface).
3. **English everywhere** in code, comments, identifiers, commit messages and docs. User-facing text goes through i18n (`src/i18n/en.ts`, `src/i18n/es.ts`) — never hard-coded in components. The owner talks to the agent in Spanish; that is fine.
4. **Work in milestones** (listed in `PROGRESS.md`). One milestone at a time; finish it fully before starting the next.
5. **Definition of done for a milestone:**
   - `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
   - New pure logic has unit tests.
   - `PROGRESS.md` is updated (checkboxes, notes, decisions).
   - A short **manual test checklist** is given to the owner (the agent cannot hear audio or log into the owner's Spotify account, so audio and login are verified by the owner).
   - A review pass is done by a separate agent that did not write the code, checking the diff against `REQUIREMENTS.md`.
   - Commit with a Conventional Commits message (`feat: …`, `fix: …`, `docs: …`).
6. **Never commit secrets.** `.env.local` is git-ignored. Only `VITE_SPOTIFY_CLIENT_ID` is needed; there is no client secret.
7. **Don't break working features.** If a change affects an existing mode, re-run its checklist.

## Stack
TypeScript (strict) · React · Vite · Tailwind CSS · Zustand · React Router · IndexedDB (via `idb` or Dexie) · Vitest. No backend in Phase 1.

## Commands (once scaffolded)
```bash
npm install
npm run dev        # http://127.0.0.1:5173 (host and port are fixed: Spotify redirect URI depends on them)
npm run typecheck
npm run lint
npm run test
npm run build
```

## Intended structure
```
src/
  app/            # router, layout, providers
  features/       # one folder per feature: lab, library, search, classic, pasapalabra, daily, records, settings
  engines/        # AudioEngine interface + deezer/ and spotify/ implementations
  services/       # API clients: deezer/, spotify/ (incl. PKCE auth)
  lib/            # pure, framework-free logic + tests: normalize, evaluate, scoring, matching, rosco, dailySeed, records
  store/          # Zustand stores (settings, library, game sessions)
  db/             # IndexedDB schema and repositories
  i18n/           # en.ts, es.ts, language detection
  components/     # shared UI components
  config/         # daily categories, defaults
```

## Conventions
- Functional components and hooks. No `any`; prefer discriminated unions for game state (`idle | playing | revealed | finished`).
- Game logic never imports from `engines/*/` implementations or `services/` directly — only through the `AudioEngine` interface and repository/service interfaces. This keeps engines swappable.
- Keep components small; move logic into hooks or `lib/`.
- Errors are typed (`NetworkError`, `RateLimitError`, `TrackUnavailableError`, `EngineUnavailableError`) and always surfaced to the user with a translated message.
- UI: dark theme, green accent, own branding (no Spotify logos or trade dress). Use the frontend-design skill when building or restyling screens.

## Spotify gotchas (Development Mode, 2026)
- Redirect URI must be `http://127.0.0.1:5173/callback`. `localhost` is rejected.
- Auth: Authorization Code with **PKCE**, no client secret. Store tokens in localStorage, refresh before expiry.
- Scopes: `streaming user-read-email user-read-private user-library-read playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state`.
- Playlist tracks: `GET /playlists/{id}/items` (renamed from `/tracks`); only returns items for playlists the user owns or collaborates on. Response fields renamed (`items.items.item`). Verify against the current docs before coding.
- Removed in Dev Mode: batch endpoints (`GET /tracks?ids=`, `/albums?ids=`…), `GET /artists/{id}/top-tracks`, browse endpoints, `GET /users/{id}`, `popularity` and `available_markets` fields. `external_ids` (ISRC) is still available.
- Search `limit` max 10 (default 5) — paginate with `offset`.
- Web Playback SDK needs Premium + Widevine (desktop browsers). Start muted, unmute when actually playing, measure real clip length.
- Max 5 authorized users per app; quota is shared per developer account. Handle HTTP 429 with `Retry-After`.
- Policy: games are prohibited → personal local use only (see `REQUIREMENTS.md` §15).

## Deezer gotchas
- No CORS: always go through the Vite proxy (`/api/deezer/*`, `/api/deezer-audio?url=` restricted to `*.dzcdn.net`).
- Preview URLs are signed and expire → never persist them; refetch in `prepare()`.
- ISRC lookup: `GET /track/isrc:{ISRC}`. Album track lists may omit ISRC → fetch the track when needed (cache results).
- Rate limit ~50 requests / 5 s → debounce and cache.
- Previews are 30 s and are not the song's intro.

## How the owner works
- The owner builds this by prompting an agent ("vibe coding") and tests manually on a Windows laptop in Chrome.
- Explain results in plain language, keep messages short, and end each milestone with what to test.
