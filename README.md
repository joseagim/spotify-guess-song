# Spotify Guess Song *(working title)*

Guess songs from tiny audio fragments, Wordle/Heardle-style — using your own Spotify playlists or any artist, playlist, album or chart from Deezer.

> Status: Phase 1 in development. Runs locally only. See [`PROGRESS.md`](PROGRESS.md).

## Game modes (Phase 1)
- **Classic** — 5, 10 or endless songs (with an optional sudden-death mode). Start with 0.1 s and unlock longer hints.
- **Pasapalabra** — an A–Z rosco of songs against the clock.
- **Daily song** — one song per category every day, with a shareable result.

## Requirements
- Node.js LTS and npm
- Chrome, Edge or Firefox on desktop
- For the Spotify engine/import: a Spotify **Premium** account and a Spotify developer app

## Setup
1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
   - Redirect URI: `http://127.0.0.1:5173/callback` (not `localhost`)
   - APIs: **Web API** and **Web Playback SDK**
2. Copy the app's **Client ID** into `.env.local`:
   ```
   VITE_SPOTIFY_CLIENT_ID=your_client_id
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open **http://127.0.0.1:5173** (use `127.0.0.1`, not `localhost`, or Spotify login will fail).

## Docs
- [`REQUIREMENTS.md`](REQUIREMENTS.md) — full specification (source of truth)
- [`CLAUDE.md`](CLAUDE.md) — working rules and technical notes for AI agents and contributors
- [`PROGRESS.md`](PROGRESS.md) — milestones, status and decision log

## Disclaimer
Personal, non-commercial project. The Spotify integration is for the owner's local use only; Spotify's Developer Policy does not allow games built on its platform. Not affiliated with Spotify, Deezer or Heardle.
