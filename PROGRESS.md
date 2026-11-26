# Progress

Living status of the project. Update at the end of every milestone (and whenever a decision is made).

## Current status
- **Phase:** 1
- **Current milestone:** M1 — built, waiting for the owner's manual test (Spotify spike + Sound Lab)
- **Next action:** Owner runs the app, tests the checklist below and reports. If the Spotify player connects and plays, continue with M2; if not, send the diagnostics log.

## Milestones — Phase 1

### M0 · Project docs ✅
- [x] `REQUIREMENTS.md`, `CLAUDE.md`, `PROGRESS.md`, `README.md`

### M1 · Scaffold + audio engines + Sound Lab
- [ ] **Spike (owner to verify):** Spotify PKCE login + Web Playback SDK connects in Development Mode and plays 1 s from position 0. *If this fails, stop and report.*
- [x] Vite + React + TS + Tailwind + Zustand + Router + Vitest + ESLint/Prettier scaffold; dev server fixed to `127.0.0.1:5173`
- [x] i18n layer (EN/ES, browser detection, switch in Settings)
- [x] App shell: dark/green theme, navigation, placeholder screens
- [x] Vite proxy for Deezer API and preview audio (allow-listed hosts)
- [x] `AudioEngine` interface
- [x] Deezer engine (Web Audio, sample-accurate clips) — verified in headless Chrome with mocked Deezer responses
- [x] Spotify engine (SDK, muted cueing, measured clip length, diagnostics log, browser/DRM check, reconnect after the device drops)
- [x] Independent review pass: 18 findings, all fixed (cancellation races, reconnects, proxy redirects, multi-tab token refresh, i18n of errors)
- [x] Sound Lab: play the same clip with both engines and show measured durations
- [x] Settings: default engine, language, volume, Spotify connect/disconnect

**M1 manual test checklist (owner)**
1. `npm install` then `npm run dev`, open http://127.0.0.1:5173 in Chrome.
2. Settings → Connect Spotify → log in → back in Settings it says "Connected as …".
3. Sound Lab → search a song → Deezer row: play 0.1 s, 1 s and 5 s, "From the start" and "Random".
4. Spotify row: status turns "Ready"; play 1 s "From the start" — it must be the real intro, with no audible delay or blip.
5. Try 0.1 s and 0.3 s on Spotify and note the measured "Played … ms".
6. "Play Deezer, then Spotify" plays both in order.
7. Switch language EN/ES in Settings; the whole UI changes.
8. If Spotify fails anywhere: open "Spotify diagnostics", copy the log and send it.

### M2 · Library and song sources
- [ ] IndexedDB schema (lists, tracks, match cache)
- [ ] Deezer search: artists (top tracks / discography), playlists, albums, charts; play directly or save
- [ ] Spotify import: liked songs + owned/collaborative playlists, multi-select import, greyed followed playlists with tip
- [ ] Spotify artist search (artist → albums → tracks)
- [ ] CSV import with column mapping
- [ ] Manual lists
- [ ] Cross-engine matching (ISRC → title/artist fallback), cache, unmatched flags
- [ ] Library screen: list management, refresh from origin, JSON export/import

### M3 · Classic mode
- [ ] `lib/normalize`, `lib/evaluate` (correct / partial / wrong), `lib/scoring` + tests
- [ ] Global autocomplete component (debounced, engine catalogue)
- [ ] Game setup (source, engine, 5/10/Endless, Sudden death, start point, hint ladder editor)
- [ ] Round flow (play, replay, skip, guess, unlock next step, reveal)
- [ ] Random start point (RMS silence check for Deezer, 10 s margins for Spotify)
- [ ] End screen + per-list records + global leaderboards

### M4 · Pasapalabra
- [ ] `lib/rosco` (starts-with → contains → disabled) + tests
- [ ] Setup (clip length, timer per rosco / per song, start point, playable-letters preview)
- [ ] Rosco UI, laps, Pasapalabra button, timers
- [ ] End screen + records (correct desc, time asc) per list and timer mode

### M5 · Daily song
- [ ] `src/config/daily.ts` with categories and sources
- [ ] `lib/dailySeed` + tests
- [ ] Daily screen, one play per category per day, stored results
- [ ] Share text with emoji grid, per-category stats and streaks

### M6 · Polish and review
- [ ] Complete ES/EN translations, empty states, error messages
- [ ] Keyboard shortcuts and accessibility pass
- [ ] Full review against `REQUIREMENTS.md` by a separate agent
- [ ] Owner's full manual test pass; decide final engine (or keep both)

## Phase 2 (not started — do not build yet)
Online multiplayer · deployment · accounts & sync · extra modes (Timeline, Higher/Lower, Odd one out, Artist duel).

## Decision log
| Date | Decision | Why |
|---|---|---|
| 2026-11-25 | Two audio engines (Deezer + Spotify) behind one interface; owner picks after testing in the Sound Lab | Deezer: exact short clips but not the intro. Spotify: real intro but imprecise very short clips. |
| 2026-11-25 | Spotify integration is personal/local only | Spotify Developer Policy prohibits games; Dev Mode is limited to 5 users. |
| 2026-11-25 | Phase 1 is single-player and local; multiplayer and deployment go to Phase 2 | Validate gameplay before infrastructure. |
| 2026-11-25 | Autocomplete suggests from the whole catalogue, not the played list | Suggesting only list songs makes it too easy. |
| 2026-11-25 | Default hint ladder 0.1 / 0.3 / 0.5 / 1 / 2 s, configurable; wrong guess unlocks next step | Owner prefers short hints; Heardle-style flow. |
| 2026-11-25 | Wrong version (remix, live…) = partial: yellow, half points | The player recognised the song; shouldn't count as a miss or a full hit. |
| 2026-11-25 | Pasapalabra uses a fixed, replayable clip (default 2 s, configurable) and a timer per rosco or per song | Owner preference. |
| 2026-11-25 | Pasapalabra records ranked by correct answers, then time | 25 in 100 s beats 24 in 90 s. |
| 2026-11-25 | Daily song with several genre categories | More variety than a single daily song. |
| 2026-11-25 | Dark theme with green accent, own branding | Owner preference; avoid Spotify trade dress. |
| 2026-11-25 | CSV import kept as a secondary option | Backup if Spotify import is unreliable; useful for testing. |
| 2026-11-25 | Code and docs in English; UI in EN/ES following the browser language | Owner preference. |
| 2026-11-25 | SoundCloud engine parked | Spotify already provides real intros. |
| 2026-11-25 | Final name pending; avoid "Spotify" and "Heardle" | Third-party trademarks. |
| 2026-11-26 | Working title in the UI is "Guess Song" (`src/config/app.ts`) | Needs some name until the final one is chosen. |
| 2026-11-26 | Spotify engine hides start latency by cueing: start muted, pause once really playing, seek to the start point; each clip is then a local resume/pause | Keeps the intro intact and makes replays instant. |
| 2026-11-26 | Premium is detected only via the player's account error; the browser/DRM check runs before connecting | The Web API no longer exposes the user's plan (Feb 2026). |
| 2026-11-26 | M1 uses a simple Spotify lookup (ISRC, then exact title + artist); full matching with cache comes in M2 | Sound Lab needs it now; §4.3 is M2 scope. |

## Notes
- Stack versions: Vite 8, React 19, React Router 7, Tailwind 4, Zustand 5, TypeScript 6.0 (typescript-eslint does not support TS 7 yet), Vitest 5, ESLint 9.
- Install dependencies on the machine that runs the app (`npm install` on Windows). Do not copy `node_modules` between operating systems.
- Spotify SDK spike result: *pending owner test.*
