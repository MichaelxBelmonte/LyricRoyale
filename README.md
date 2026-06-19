# Soundclash

Soundclash is a zero-install music party game for the Musixmatch Musicathon 2026.
One device hosts the room, players join on phones, and an AI host runs lyric-based
mini-games powered by live Musixmatch data.

The current product direction is a Jackbox-style show with a strong cassette/Y2K
identity: cream J-cards, clear plastic, chrome, holographic accents, neon magenta,
cyber teal, electric tangerine, LED scoreboards, stickers, and tape-label UI.

## Current Experience

- Host creates a shared-screen room at `/host/new`.
- Players join from `/join` or a room link on their phones.
- Host can tap **Auto-pick show** once; the session then rotates a 6-round set.
- Mini-games are mostly tap-based to keep phone input fast.
- ElevenLabs voices handle room intro, round transitions, reveals, leaders, and final-score moments.
- A personalized ElevenLabs Music v2 signature powers the animated home waveform.
- LALAL.AI split assets are kept for the upcoming Signal Check micro-game, but the home currently plays only the full mix.

## Mini-games

The autopilot rotates a 6-round set drawn from this catalog (all lyric-based, mostly tap input):

| Game | What you do |
|---|---|
| Finish the Line | Tap the missing last word |
| Misheard | Spot the real lyric among the mondegreens |
| The Drop | Hit the word as the lyric lands |
| On The Beat | Lock the word right as the beat hits — timing scores |
| Who Said It | Which track dropped this line? |
| Next Line | Pick the line that comes next |
| Name That Song | Match the lyric to its track |
| Artist Lock | Pick the artist behind the lyric |
| Word Rush | Pick the recurring keyword |

A "coming soon" gallery (Stem Heist, Beat Roulette, Karaoke Clash, Rap Battle) is shown in the
host picker for the pitch but never enters rotation.

## Online & multiplayer

- One host on a shared screen/TV; everyone else plays from their own phone — **no install**.
- Players join by **room code or QR** (`/join` or the QR on the host screen).
- Host and phones stay in sync via lightweight **1s HTTP polling** (no WebSocket needed).
- **Many rooms run in parallel** (keyed by code) and there is **no player cap** per room.
- Sessions live in the server process: this works great on **one always-on instance**.
  A redeploy/restart clears active rooms — moving the session store to Redis/Supabase
  (planned) makes rooms survive restarts and enables serverless/multi-instance.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js App Router, React, TypeScript |
| Styling | Tailwind + Soundclash brand utilities |
| Lyrics | Musixmatch server-side proxy |
| Voice + soundtrack | ElevenLabs server-side proxy + generated static MP3 assets |
| Stem separation | LALAL.AI server-side proxy |
| Future persistence | Supabase Postgres + Realtime |

## Provider Status

| Provider | Use | Status |
|---|---|---|
| Musixmatch | Search, lyrics, richsync, track metadata | Verified |
| ElevenLabs | AI host text-to-speech | Verified |
| LALAL.AI | Stem separation lab | Wired |
| Supabase | Persistence/realtime target | Planned for room hardening |
| Anthropic Claude | Future host banter/mood/round generation | Planned |

## Local Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Never commit `.env.local`. All provider keys are server-side only; browser clients
call this app's `/api/**` routes, and those routes call providers.

To regenerate the instrumental gameplay loops with ElevenLabs Music v2:

```bash
npm run soundtrack:generate
```

This writes `public/audio/soundclash-mixtape.mp3` and `public/audio/soundclash-clash.mp3`.
The browser tries to start playback automatically, then falls back to the first
tap if autoplay is blocked.

To regenerate the personalized home signature and split it with LALAL.AI:

```bash
npm run soundtrack:signature
```

This writes:

- `public/audio/soundclash-signal-full.mp3`
- `public/audio/soundclash-signal-vocals.mp3`
- `public/audio/soundclash-signal-backing.mp3`

## Deploy (Replit)

Soundclash is a standard Next.js server — deploy it to a **single always-on instance**.

- **Replit:** use a **Reserved VM** deployment — **not Autoscale** (sessions live in the
  server process; Autoscale's multiple instances would break room sharing).
- **Build:** `npm run build` · **Run:** `npm run start` (binds `0.0.0.0:$PORT`).
- **Secrets:** `MXM_KEY` (required) + optional `ELEVENLABS_API_KEY` / voice ids.
- Step-by-step: [`docs/DEPLOY_REPLIT.md`](./docs/DEPLOY_REPLIT.md).

Once deployed you get a public HTTPS URL; the join QR/links resolve to it automatically,
so judges/players can join from anywhere in the world.

## Documentation

Start with [`docs/README.md`](./docs/README.md). The key docs are:

- [`docs/DEPLOY_REPLIT.md`](./docs/DEPLOY_REPLIT.md) — how to publish (Replit Reserved VM).
- [`docs/BRAND_SYSTEM.md`](./docs/BRAND_SYSTEM.md) — visual system and mood-board rules.
- [`docs/PARTY_ROOM_PLAN.md`](./docs/PARTY_ROOM_PLAN.md) — current room flow and mini-game plan.
- [`docs/API_INTEGRATION.md`](./docs/API_INTEGRATION.md) — provider wiring.
- [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md) — Musixmatch usage rules.

## Musixmatch Compliance

Persist only references. Do not store lyric text, richsync payloads, lyric snippets,
or generated answer text beyond the active transient round. Whenever lyrics are
shown, display the Musixmatch copyright/tracking requirements.
