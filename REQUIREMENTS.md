# Requirements

> **Source of truth.** This document defines *what* the app does. Nothing is built that is not described here, and nothing described here is skipped or changed without the project owner's approval. When a requirement changes, this file is updated **first**, then the code, and the change is logged in `PROGRESS.md` → Decision log.

- **Working title:** Spotify Guess Song (final name TBD — must not use "Spotify" or "Heardle", which are third-party trademarks)
- **Last updated:** 2026-11-25
- **Status:** Phase 1 — specification approved, implementation not started

---

## 1. Vision

A web game in the spirit of Wordle/Heardle: you hear a tiny fragment of a song and have to guess which one it is. Songs come from music the player actually cares about — their own Spotify playlists and liked songs, a single artist's catalogue, a public playlist, an album or a chart.

Short sessions, instant replay, records to beat.

## 2. Scope by phase

### Phase 1 (current)
- Single player only.
- Runs **locally** on the owner's laptop (`http://127.0.0.1:5173`). No deployment.
- Desktop browser first (Chrome, Edge, Firefox). Layout must still be responsive.
- Features: two audio engines + Sound Lab, Library & sources, Classic mode (incl. Endless & Sudden death), Pasapalabra, Daily song, Records, Settings, i18n (EN/ES).

### Phase 2 (later — do not build now)
- Online multiplayer with friends (rooms with a join code; Supabase Realtime or PartyKit — no custom server).
- Public deployment (Vercel, with a serverless proxy for Deezer).
- Accounts and cross-device sync of library and records.
- Extra modes: Timeline (order songs by release year), Higher/Lower (older or newer than the previous one), Odd one out (which of 4 clips is not by this artist/album), Artist duel (is it artist A or B?).

### Never
- Lyrics-based modes (lyrics are copyrighted).
- Downloading or caching full audio files.

### Parked
- SoundCloud as a third engine (only reconsidered if Deezer is chosen and real intros are missed).

## 3. Platform and stack

| Concern | Choice |
|---|---|
| Language | TypeScript (strict) |
| UI | React + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Routing | React Router |
| Persistence | IndexedDB (library, matches cache, records, daily results) + localStorage (settings, auth tokens) |
| Tests | Vitest (pure logic) |
| Backend | None. Deezer calls go through the Vite dev-server proxy (see §4.1). |

- All code, comments, commit messages and documentation are in **English**.
- The only secret-like value is the Spotify **Client ID**, read from `VITE_SPOTIFY_CLIENT_ID` in `.env.local` (git-ignored). No client secret is used anywhere (PKCE flow).

## 4. Audio engines

The game logic never talks to Deezer or Spotify directly; it talks to an `AudioEngine` interface with two implementations. The user picks the engine in Settings (default) and can override it per game.

Common contract (conceptual):
- `prepare(track)` → resolves everything needed to play (fresh preview URL / Spotify URI, playable length). Fails cleanly if the track is not available on this engine.
- `playClip(prepared, startSec, durationSec)` → plays exactly that window and resolves when it ends, reporting the **actual** duration played.
- `stop()`.
- Exposes `playableLengthSec` so the game knows the valid range for start points.

### 4.1 Deezer engine
- Uses Deezer's public API (no login) and its **30-second preview MP3** per track.
- The preview is a fragment of the song, **not** the song's real intro. In the UI, "From the start" means "from the start of the preview" when this engine is active, and the setup screen says so.
- Clips are cut **sample-accurately** with the Web Audio API (decode the MP3 into an `AudioBuffer`, play with `start(when, offset, duration)`).
- Browsers block direct calls to `api.deezer.com` (CORS). In Phase 1 the Vite dev server proxies:
  - `/api/deezer/*` → `https://api.deezer.com/*`
  - `/api/deezer-audio?url=…` → the preview MP3, **only** for hosts ending in `.dzcdn.net` (allow-list, never an open proxy).
- Preview URLs are signed and expire: never persist them. Store the Deezer track ID and fetch a fresh preview URL in `prepare()`.

### 4.2 Spotify engine
- Uses the **Spotify Web Playback SDK** in the browser. Requires a Spotify **Premium** account (the owner has one) and a desktop browser with DRM (Widevine). Does not work in mobile browsers — the UI must say so instead of failing silently.
- Plays the **real song**, so "From the start" is the true intro (position 0).
- Start latency must be inaudible: start playback muted, wait until the player reports it is actually playing at the requested position, then unmute and start the clip timer; pause when the timer ends.
- Known limitation: very short clips (0.1–0.5 s) are approximate. The engine measures and reports the real duration played so it can be shown in the Sound Lab.
- **First task of the project** is a minimal spike proving the SDK works in Development Mode (a community report says `player.connect()` can hang since the 2026 changes). If it does not work, stop and report — do not build workarounds without approval.

### 4.3 Cross-engine matching
A track coming from one platform must be found on the other when the other engine is used.
1. Match by **ISRC** (Deezer: `GET /track/isrc:{ISRC}`; Spotify: search `isrc:{ISRC}`).
2. Fallback: search by normalized title + primary artist; accept only a confident match (same normalized title and same primary artist).
3. Results (including "no match") are cached in IndexedDB.
4. Unmatched tracks are flagged in the list view and **skipped** during games, with a non-blocking notice ("2 songs skipped: not available on Deezer").

### 4.4 Sound Lab (comparison tool)
A screen to choose between engines:
- Pick any track (from search or library).
- Play the same clip (duration and start point selectable) with Deezer, then Spotify, back to back, or each individually.
- Show the measured duration actually played by each engine.

## 5. Song sources

### 5.1 Deezer search (no login)
Tabs: **Artists**, **Playlists**, **Albums**, **Charts**.
- **Artist** → play with their top tracks or their full discography (all albums). This is how you play "only David Bisbal" or "only Quevedo".
- **Playlists** → any public Deezer playlist, including Deezer's own editorial ones.
- **Album** → its tracks.
- **Charts** → Deezer charts (country charts where available).
- Any result can be **played directly** or **saved to the Library**.

### 5.2 Spotify import (login)
- Login with **Authorization Code + PKCE** entirely in the browser. Redirect URI: `http://127.0.0.1:5173/callback` (Spotify rejects `localhost`).
- After login the user sees **Liked Songs** and **their playlists**, multi-selects them and imports them into the Library in one click.
- Spotify only returns tracks of playlists the user **owns or collaborates on**. Playlists the user merely follows (e.g. Spotify's "This Is …") are listed greyed out with a tip: *"Copy its songs into a playlist of your own in the Spotify app, then import that one."*
- Artist search through Spotify: artist → albums → tracks (Spotify no longer offers "top tracks" in Development Mode).
- Spotify Development Mode limits to respect: search `limit` max 10, no batch endpoints, no `popularity` field. See `CLAUDE.md` → Spotify gotchas.

### 5.3 CSV import (secondary)
- Import a CSV file (e.g. exported with Exportify) into the Library.
- Required columns: track name and artist. Optional but preferred: ISRC, Spotify track URI. A column-mapping step handles different header names.

### 5.4 Manual lists
- Create a list by searching songs one by one and adding them.

## 6. Library ("My lists")

- Stores lists from every origin: Spotify import, Deezer save, CSV, manual.
- Per list: name, origin, cover, track count, number of unmatched tracks per engine, created/updated dates.
- Actions: play (any mode), rename, delete, refresh from origin (Spotify/Deezer lists), view tracks, remove a track.
- Stored in IndexedDB in this browser only (no sync in Phase 1). An "Export/Import library (JSON)" option allows manual backup.

## 7. Game rules shared by all modes

### 7.1 Answering — global autocomplete
- The player types and suggestions appear as they type (e.g. "ni…" → "Ni Borracho – Quevedo").
- Suggestions come from the **whole catalogue** of the active engine (Deezer search / Spotify search), **not** only from the list being played — otherwise it is too easy. Debounced (~250 ms), cover + title + artist shown.
- A guess is a selected suggestion. Free text is not accepted.

### 7.2 Answer evaluation
Given the target track and the guessed track:
| Result | Rule | Colour | Points |
|---|---|---|---|
| **Correct** | Same track ID, or same ISRC, or same normalized base title + same primary artist + same version tags (e.g. single vs album release of the same recording) | Green | Full |
| **Partial** | Same normalized base title + same primary artist, but **different version tags** (remix, live, acoustic, sped up, remaster…). The player recognised the song but picked the wrong version. | Yellow | Half |
| **Wrong** | Anything else | Red | 0 |

**Normalization** (shared by evaluation, matching and Pasapalabra): lowercase, strip accents/diacritics, remove `feat./ft./with …` segments, separate bracketed or dash-suffixed version info (`(Remix)`, `- Live`, `[Remastered 2011]`) into *version tags*, collapse punctuation and whitespace. Covered by unit tests.

### 7.3 Hint ladder
- Default ladder: **0.1 s → 0.3 s → 0.5 s → 1 s → 2 s**.
- Editable in the game setup (add/remove/change steps; ascending values; 1–10 steps).
- **Skip** or a **wrong guess** unlocks the next step. The number of attempts equals the number of steps. A wrong guess at the last step loses the song.
- Each step replays the clip from the same start point with the longer duration. The player can replay the current step any number of times.

### 7.4 Start point
- **From the start**: real intro (Spotify) / start of preview (Deezer).
- **Random**: a random start point per song, chosen so that the longest clip of the ladder fits, avoiding the last seconds of the playable range. With Deezer, silent windows are avoided by checking the decoded audio's loudness (RMS). With Spotify the audio cannot be analysed, so the first and last 10 s of the song are excluded instead.

### 7.5 Scoring (Classic and Daily)
- Points for a correct answer at step *i* (0-based) of a ladder with *n* steps: `round(100 − i × 100 / n)`. With the default 5 steps: **100 / 80 / 60 / 40 / 20**.
- Partial = half of what that step would give. Wrong/lost = 0.

### 7.6 Round end
After each song: reveal cover, title, artist and result colour; button to play a longer fragment; link to open the song on Deezer/Spotify.

## 8. Mode: Classic

### Setup
- Source: a Library list, or a direct Deezer search result (artist / playlist / album / chart).
- Engine (default from Settings).
- Number of songs: **5**, **10** or **Endless**.
- **Sudden death** toggle (Endless only).
- Start point: From the start / Random.
- Hint ladder (§7.3).

### Flow
- Songs are drawn in random order without repetition. Unmatched/unavailable songs are skipped.
- Endless without sudden death runs until the list is exhausted or the player quits.
- **Sudden death**: the run ends at the first wrong/lost song. A partial keeps the run alive and counts towards the streak, flagged in yellow.
- End screen: total points, per-song summary (colour, step reached, cover, title, artist), "Play again" and "Change setup".

### Records
- **Per list**: best score for 5-song games, best score for 10-song games, best Sudden death streak.
- **Global leaderboards per mode** (top 10 across all lists), e.g. *Sudden death: 1st — 12 in a row with "Quevedo mix", 2nd — 11 with "Liked Songs"…*
- Records are only comparable with the same ladder length; a record set with a custom ladder is stored and labelled with its ladder.

## 9. Mode: Pasapalabra

### Rosco generation
- Letters **A–Z without Ñ** (26 letters).
- For each letter, pick a random song from the source whose **normalized title starts with** that letter; if none, one whose title **contains** it (marked "contains" in the rosco); if none, the letter is **disabled**.
- A song is used at most once per rosco.
- The setup screen shows how many letters are playable for the chosen source before starting.

### Setup
- Source and engine (as Classic).
- Start point: From the start / Random.
- **Clip length**: fixed, configurable — default **2 s** (range 0.5–5 s). No hint ladder; the clip can be replayed freely.
- **Timer mode**:
  - **Per rosco** — one global countdown (default 120 s, configurable).
  - **Per song** — a countdown per letter (default 15 s, configurable); when it runs out the letter counts as wrong.

### Flow
- Current letter highlighted; the player guesses with the global autocomplete (§7.1).
- **Correct** → green. **Partial** → yellow (counts 0.5). **Wrong** → red, final (no retry, as in the TV show).
- **Pasapalabra** button → the letter stays pending for the next lap.
- Laps continue over pending letters until none remain or time runs out.
- End screen: rosco with colours, correct count, time used, every song revealed.

### Records
- Per list **and** timer mode: ranked by **correct answers (desc)**, then **time used (asc)**. Example: 25 correct in 100 s beats 24 correct in 90 s.
- Global leaderboard per timer mode, as in Classic.

## 10. Mode: Daily song

- Several **categories** every day, each with one song, e.g. *English pop*, *Spanish classics*, *Urban / Reggaeton*, *Top Spain 2026*. Categories and their source playlists live in one config file (`src/config/daily.ts`) so they can be changed easily.
- The day's song per category is chosen **deterministically** from the date (seeded hash over the source's tracks sorted by ID), so it is the same on every reload. (When published in Phase 2, sources will be frozen snapshots so every player gets the same song.)
- Plays like a single Classic round: default ladder, skip/wrong unlocks the next step.
- One play per category per day; the result is stored and shown again if reopened.
- **Share** button copies a result such as `🎵 Daily · Urban · 2026-11-25  🟥🟥🟩⬜⬜` (🟥 wrong, ⬛ skipped, 🟨 partial, 🟩 correct, ⬜ unused).
- Stats per category: games played, win %, current and best streak.
- Uses the Deezer engine by default; the Spotify engine works through matching.

## 11. Settings
- Default audio engine.
- Language: **English / Español**, defaulting to the browser language (`es*` → Spanish, otherwise English); persisted.
- Volume.
- Spotify account: connect / disconnect, connection status, Premium/DRM check.
- Data: export/import library and records (JSON), clear all data (with confirmation).

## 12. Internationalisation
- Every user-facing string goes through the i18n layer (English and Spanish dictionaries). No hard-coded UI text in components.
- Music metadata (titles, artists) is never translated.

## 13. Visual design
- Dark theme with a green accent, in the spirit of a music app, but with the app's **own** name, logo and identity (no Spotify logo, wordmark or trade dress).
- Playful but clean; big, satisfying play button; clear green/yellow/red feedback; small animations on reveal.
- Desktop first, responsive down to phone width.
- Accessibility: keyboard-operable game (Enter to guess, Space to play, S to skip), visible focus, colour is never the only signal (icons/labels accompany colours).

## 14. Non-functional requirements
- No visible error states without a message: network errors, rate limits (HTTP 429), unavailable tracks and engine failures all show a friendly, translated message and a way forward.
- Rate limits respected: debounced search, cached lookups, no request storms.
- Pure logic (normalization, evaluation, scoring, matching, rosco generation, daily seed, record ranking) lives in framework-free modules with unit tests.
- `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build` pass at the end of every milestone.

## 15. Known external constraints
- **Spotify Developer Policy** prohibits games and trivia quizzes built on the Spotify Platform. The Spotify integration is therefore for the owner's **personal, local, non-commercial use only** and must be removed or replaced before any public release. The realistic risk is Spotify disabling the developer app.
- **Spotify Development Mode** (since Feb 2026): app owner needs Premium; max 5 authorized users; restricted endpoint set; search limit 10; some fields removed (`popularity`, `available_markets`, …); playlist tracks only for owned/collaborative playlists; endpoint is `GET /playlists/{id}/items`.
- **Deezer**: previews are 30 s and not the song's intro; API has rate limits (~50 requests / 5 s); no CORS → proxy required.

## 16. Open items
- Final app name.
- Exact Deezer playlists/charts for each Daily category.
