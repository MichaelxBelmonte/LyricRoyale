# System Architecture

Soundclash is a web party game built on real song lyrics with an AI host, for the Musixmatch Musicathon 2026. This document describes how the system is structured: the trust boundary between the browser and the providers, the App Router folder layout, the end-to-end data flow for one round, room state, and the rationale behind each technology choice.

This is the engineering source of truth for *how the pieces fit together*. For *what* the product does, see [PRODUCT_SPEC.md](./PRODUCT_SPEC.md). For visual implementation rules, see [BRAND_SYSTEM.md](./BRAND_SYSTEM.md). For the current room/autopilot plan, see [PARTY_ROOM_PLAN.md](./PARTY_ROOM_PLAN.md).

> Current implementation note: the app has already pivoted from a primarily async challenge MVP to a Jackbox-style shared-room show. Some Supabase/Claude sections below remain the target architecture for persistence, leaderboards, mood-aware generation, and richer host banter.

---

## 1. High-Level Diagram

Everything outbound to a third-party provider goes through the Next.js server. The browser never talks to Musixmatch, ElevenLabs, Claude, or LALAL.AI directly. The browser *does* talk to Supabase directly — but only through the publishable key, with Row-Level Security as the enforcement layer.

```
                            ┌──────────────────────────────────────────────┐
                            │                  BROWSER                     │
                            │   React client (App Router, Tailwind)        │
                            │   - renders rounds, timers, host audio       │
                            │   - holds only NEXT_PUBLIC_* values          │
                            └───────────────┬──────────────────┬───────────┘
                                            │                  │
              fetch() to OUR origin only    │                  │  supabase-js (publishable key)
              (route handlers / actions)    │                  │  reads/writes guarded by RLS
                                            │                  │
                                            ▼                  ▼
   ┌────────────────────────────────────────────────┐   ┌─────────────────────────────────┐
   │        NEXT.JS SERVER  (the proxy)              │   │           SUPABASE              │
   │  Route Handlers (app/api/*) + Server Actions    │   │  Postgres + Auth + RLS          │
   │                                                 │   │  profiles / games / rounds /    │
   │  Holds server-side secrets (process.env):       │   │  challenges / scores            │
   │   MXM_KEY                                        │   │  view: leaderboard_global       │
   │   ELEVENLABS_API_KEY                             │   └───────────────┬─────────────────┘
   │   ANTHROPIC_API_KEY                              │                   │ service-role
   │   SUPABASE_DB_PASSWORD / SUPABASE_PROJECT_REF    │◄──────────────────┘ writes (server-side
   │                                                 │                     when needed)
   └───┬──────────────┬──────────────┬───────────┬───┘
       │              │              │           │
       ▼              ▼              ▼           ▼
 ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐
 │ Musixmatch│  │ElevenLabs │  │  Claude  │  │ LALAL.AI  │
 │ lyrics /  │  │  TTS      │  │ opus-4-8 │  │  stems    │
 │ richsync /│  │ (host     │  │ round    │  │ (karaoke, │
 │ search /  │  │  voice)   │  │ gen +    │  │  optional)│
 │ subtitle  │  │           │  │ banter   │  │           │
 └───────────┘  └───────────┘  └──────────┘  └───────────┘
   server-side    server-side    server-side    server-side
   MXM_KEY        xi-api-key     ANTHROPIC_KEY   LALAL_API_KEY
```

**Two distinct channels to data:**

| Channel | Who initiates | Auth | Used for |
|---|---|---|---|
| Provider proxy | Browser → our server → provider | Server-side secrets in `process.env` | Lyrics, TTS, Claude generation, stems |
| Supabase | Browser → Supabase (direct) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + RLS | Scores, challenges, leaderboards, profiles |

---

## 2. The Server-Proxy Security Pattern

> **Hard rule (from the canonical brief): ALL provider calls happen ONLY in Next.js server (route handlers / server actions) acting as a proxy. The browser NEVER sees server-side keys.**

### Why a proxy at all

Musixmatch, ElevenLabs, Claude, and LALAL.AI all authenticate with a long-lived secret. If any of those secrets shipped in a client bundle — even minified, even behind an "internal" flag — it would be trivially extractable from the browser and immediately abusable (quota theft, billing, abuse attribution back to us). A public GitHub repo (`github.com/MichaelxBelmonte/LyricRoyale`) makes the bar even higher: nothing secret can live in committed source either.

The pattern is: **the browser only ever calls our own origin.** Our server is the single place that holds provider secrets and the single place that calls providers.

### How secrets are scoped

Next.js treats any env var prefixed `NEXT_PUBLIC_` as inlined-into-the-client and everything else as server-only. We lean on that split exactly as the brief specifies.

| Variable | Exposure | Where it is read |
|---|---|---|
| `MXM_KEY` | Server-only | Route handlers / server actions calling Musixmatch |
| `ELEVENLABS_API_KEY` | Server-only | Route handler calling ElevenLabs TTS (`xi-api-key` header) |
| `ANTHROPIC_API_KEY` | Server-only | Server-side `@anthropic-ai/sdk` client |
| `SUPABASE_DB_PASSWORD` | Server-only | Migrations / direct Postgres only — never at runtime in app code |
| `SUPABASE_PROJECT_REF` | Server-only | CLI / migrations tooling |
| `LALAL_API_KEY` | Server-only | Route handler calling LALAL.AI (optional, karaoke) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | supabase-js in the browser |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | supabase-js in the browser |

Only the two `NEXT_PUBLIC_SUPABASE_*` values reach the browser. They are *designed* to be public: the publishable key grants nothing on its own — Row-Level Security on every table is what actually authorizes reads and writes.

### Secret hygiene

- Secrets live only in `.env.local`, which is gitignored (`.env*` is ignored with a `!.env.example` exception). `.env.example` documents the variable names with placeholder values and is the only env file committed.
- In production on Replit, the same variables are re-entered as Replit Secrets — never committed.
- **Rotation note (from the brief):** some keys were pasted into chat during development. The ElevenLabs key and the Supabase DB password should be rotated before the public demo.

### Server-side hardening of the proxy

The proxy is not a dumb pass-through. Each provider route handler:

1. Reads its secret from `process.env` at request time (never imported into a shared client module that could leak into a client bundle).
2. Validates and narrows the request — a client asks for "the round for `gameId`/`position`", not "fetch this arbitrary Musixmatch URL." This prevents the proxy from becoming an open relay.
3. Returns only what the client needs for transient display. Lyric *text* is returned for rendering but never persisted (see §4 and §5).

```ts
// app/api/round/route.ts — illustrative shape of a proxy route handler.
// Secrets are read here, on the server, and never serialized to the client.
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { gameId, position } = await req.json();

  // MXM_KEY and ANTHROPIC_API_KEY exist only in this process, never in the browser bundle.
  const mxmKey = process.env.MXM_KEY!;
  const round = await buildRoundLive({ gameId, position, mxmKey }); // fetch + Claude

  // Returns the transient Round (prompt/options/answer text) for display only.
  return NextResponse.json(round);
}
```

---

## 3. Folder Structure (Next.js App Router)

A pragmatic App Router layout for a solo, ~5-day build. The hard boundary is `lib/server/` vs `lib/client/`: anything that imports a server-side secret must live under `lib/server/` (or directly in a route handler / server action) so it can never be pulled into a client component bundle.

```
LyricRoyale/
├─ app/
│  ├─ layout.tsx                 # root layout, Tailwind, fonts
│  ├─ page.tsx                   # landing / create-or-join
│  ├─ globals.css
│  │
│  ├─ play/
│  │  └─ [gameId]/
│  │     └─ page.tsx             # the game loop screen (client component)
│  │
│  ├─ c/
│  │  └─ [slug]/
│  │     └─ page.tsx             # async challenge entry (resolves share_slug)
│  │
│  ├─ leaderboard/
│  │  └─ page.tsx                # global + daily leaderboards
│  │
│  └─ api/                       # ── route handlers = the provider proxy ──
│     ├─ round/route.ts          # POST: fetch lyrics live + Claude → Round
│     ├─ host/route.ts           # POST: Claude banter → ElevenLabs TTS (audio)
│     ├─ mood/route.ts           # POST: Claude mood/theme (replaces MXM 403 endpoint)
│     ├─ challenge/route.ts      # POST: create challenge + share_slug
│     └─ stems/route.ts          # POST: LALAL.AI stem separation (optional, karaoke)
│
├─ components/
│  ├─ rounds/
│  │  ├─ FinishTheLine.tsx
│  │  ├─ NextLine.tsx
│  │  ├─ NameThatSong.tsx
│  │  ├─ Misheard.tsx
│  │  └─ SpeedLyrics.tsx         # stretch
│  ├─ HostBubble.tsx             # renders host line + plays TTS audio
│  ├─ RoundTimer.tsx             # speed-bonus countdown
│  ├─ ScoreReveal.tsx
│  ├─ CopyrightBadge.tsx         # shows Musixmatch lyrics_copyright + fires tracking pixel
│  └─ ShareCard.tsx              # share_slug link + clip
│
├─ lib/
│  ├─ server/                    # SERVER-ONLY. Imports secrets. Never imported by a client component.
│  │  ├─ musixmatch.ts           # track.search / lyrics.get / subtitle.get / richsync.get / matcher
│  │  ├─ claude.ts               # @anthropic-ai/sdk client (ANTHROPIC_API_KEY)
│  │  ├─ elevenlabs.ts           # TTS POST /v1/text-to-speech/{voice_id}
│  │  ├─ lalal.ts                # stem separation (optional)
│  │  ├─ round-builder.ts        # orchestrates fetch + Claude → runtime Round
│  │  ├─ scoring.ts              # correctness + speed-bonus / karaoke scoring (server-authoritative)
│  │  └─ supabase-admin.ts       # service-role client for server-side writes when needed
│  │
│  ├─ client/
│  │  └─ supabase.ts             # browser supabase-js (NEXT_PUBLIC_* only)
│  │
│  ├─ prompts/                   # Claude prompt templates P1–P6 (see PROMPTS.md)
│  │  ├─ round.ts                # P1, P2, P3
│  │  ├─ mood.ts                 # P4
│  │  └─ host.ts                 # P5, P6
│  │
│  └─ types.ts                   # Round, RoundType, shared DB row types
│
├─ supabase/
│  └─ migrations/                # SQL schema + RLS policies (references-only model)
│
├─ public/                       # static assets, cover image
│
├─ .env.example                  # variable names only (committed)
├─ .env.local                    # secrets (gitignored)
└─ docs/
   ├─ ARCHITECTURE.md            # this file
   ├─ PRODUCT_SPEC.md
   ├─ BUILD_PLAN.md
   └─ PROMPTS.md
```

**Conventions:**

- `app/api/*/route.ts` route handlers and inline server actions are the *only* code that reads provider secrets.
- `lib/server/*` is the shared implementation those handlers call; it is server-only by construction and never reaches a `"use client"` module.
- `lib/client/supabase.ts` is the single browser Supabase entry point and touches only `NEXT_PUBLIC_*`.
- `lib/prompts/*` holds the strict-JSON Claude prompts; their full text lives in [PROMPTS.md](./PROMPTS.md).

---

## 4. End-to-End Data Flow for One Round

A round is *generated live and shown transiently*. The database stores only references — `track_id`, `line_index`, `round_type`, and a `seed` — never lyric text. The actual prompt/options/answer are rebuilt at play time from a live Musixmatch fetch plus Claude. This is the compliance backbone of the whole system.

### Sequence

```
Browser (play screen)        Next.js server (proxy)            Providers / Supabase
        │                            │                                  │
   1.   │ POST /api/round            │                                  │
        │ { gameId, position } ─────►│                                  │
        │                            │ 2. read round REFERENCE row      │
        │                            │    (track_id, line_index,        │
        │                            │     round_type, seed) ──────────►│ Supabase (rounds)
        │                            │◄─────────────────────────────────│
        │                            │ 3. fetch lyrics LIVE             │
        │                            │    track.lyrics.get / subtitle / │
        │                            │    richsync (MXM_KEY) ──────────►│ Musixmatch
        │                            │◄───────────────────────────────  │ full lyrics + copyright
        │                            │ 4. Claude builds the round       │
        │                            │    (P1/P2/P3, strict JSON,        │
        │                            │     model claude-opus-4-8) ─────►│ Claude
        │                            │◄───────────────────────────────  │ {prompt, options, answer}
        │                            │ 5. assemble runtime Round        │
        │◄── Round (transient) ──────│    (+ copyright string)          │
        │                            │                                  │
   6.   │ render mode component,     │                                  │
        │ show CopyrightBadge,       │                                  │
        │ fire MXM tracking pixel    │                                  │
        │                            │                                  │
   7.   │ player answers; timer      │                                  │
        │ gives speed bonus          │                                  │
        │                            │                                  │
   8.   │ write score ──────────────────────────────────────────────► │ Supabase (scores)
        │ (supabase-js, RLS, or via server for authoritative scoring)  │
        │                            │                                  │
   9.   │ optional: POST /api/host   │ Claude banter (P6) → ElevenLabs  │
        │ for emcee line + TTS ─────►│ TTS (correct/wrong/reveal) ─────►│ Claude + ElevenLabs
        │◄── host text + audio ──────│                                  │
```

### The runtime Round shape (generated live, NOT persisted with text)

This is the canonical TypeScript shape returned by `POST /api/round` and consumed by the mode components. It carries the lyric-derived `prompt`/`options`/`answer` only in memory and only for the duration of the round.

```ts
type RoundType =
  | "finish_line"
  | "the_drop"
  | "next_line"
  | "artist_pick"
  | "word_rush"
  | "name_song";

interface Round {
  id: string;
  gameId: string;
  trackId: string;
  lineIndex?: number;
  type: RoundType;
  prompt: string;
  options?: string[];
  answer: string;
  drop?: FinishLineDrop;
  timeLimitMs: number;
  copyright: string;
}
```

`copyright` is the Musixmatch `lyrics_copyright` string. The client must display it (via `CopyrightBadge`) and fire the Musixmatch tracking pixel/script whenever lyrics are shown.

### What gets persisted vs. what stays transient

| Field | Persisted? | Where |
|---|---|---|
| `track_id`, `line_index`, `round_type`, `seed` | Yes (reference only) | `rounds` table |
| `prompt`, `options`, `answer` (lyric-derived text) | **No — regenerated live** | In-memory `Round` only |
| `copyright` string | No (re-fetched with the lyrics) | Shown transiently |
| Player result (`points`, `accuracy`, `mode`) | Yes | `scores` table |

Because the answer text is never stored, the server reconstructs each playable
round from a track reference, a mini-game type, and a seed via a live Musixmatch
fetch plus deterministic server-side round logic. No lyric text changes hands
through persistence.

### Why Claude derives mood/theme

`track.lyrics.mood.get` returns **403 FORBIDDEN** on our Musixmatch key. Instead, `POST /api/mood` sends the full lyrics (which *are* available — `track.lyrics.get` returns 200 with full, non-truncated text) to Claude (prompt **P4**) and gets back a strict-JSON mood/theme classification. Lyric text used in P4 is transient — never logged, never stored.

---

## 5. Shared-Room Flow

Current Soundclash is a Jackbox-style shared room:

- `/host/new` creates a session.
- `/host/[code]` is the TV/stage screen.
- `/join` binds a phone to the room.
- `/player/[code]` is the phone controller.
- `POST /api/sessions/[code]/round` starts or auto-advances a round.
- `PATCH /api/sessions/[code]/round` submits a player answer.
- `PATCH /api/sessions/[code]` reveals results or returns to lobby.

The current implementation uses a server-side in-memory store for the active
session. The target implementation is Supabase Realtime Broadcast/Presence plus
reference-only persistence for sessions, players, rounds, answers, and scores.

### Future async challenge extension

Async challenge links remain a future social loop: play a set, share a slug, and
friends replay the same reference set later. This should reuse the same
references-only rule: share `track_id`, `round_type`, `seed`, and position, never
lyric text.

### How it works

```
  Challenger                    Server                         Friend (later)
      │                           │                                 │
 1.   │ finishes a game           │                                 │
      │                           │                                 │
 2.   │ POST /api/challenge ─────►│ insert challenges row:          │
      │ { gameId }                │  game_id, challenger,           │
      │                           │  share_slug (unique), expires_at│──► Supabase
      │◄── { share_slug } ────────│                                 │
      │                           │                                 │
 3.   │ shares /c/<share_slug>    │                                 │
      │ ───────────────────────────────────────────────────────────►│ opens link
      │                           │                                 │
 4.   │                           │ /c/[slug] resolves slug →       │◄── GET (supabase-js, RLS)
      │                           │ challenge → game_id → the SAME  │
      │                           │ round references (track_id,     │
      │                           │ line_index, round_type, seed)   │
      │                           │                                 │
 5.   │                           │ friend plays: each round is     │
      │                           │ REBUILT LIVE from references    │
      │                           │ (fetch + Claude, same seed) ───►│ identical rounds
      │                           │                                 │
 6.   │                           │ friend's score written with     │
      │                           │ challenge_id → leaderboard      │──► Supabase (scores)
      │                           │ comparison on the same rounds   │
```

### Key properties

- **Same rounds, reconstructed — not redistributed.** The challenge stores `game_id` and a unique `share_slug`; it does **not** store lyric text. The friend's client hits the *same round references*, and the server rebuilds each round live (same `seed` → deterministic Claude output). No lyric text travels through the shared link. This satisfies the "no redistribution of lyric text in shared challenges" compliance rule.
- **Anonymous play allowed.** A challenge guest can play without an account: their result is written to `scores` with `anon_name` (no `player_id`). Authenticated users play via their `profiles` row. RLS distinguishes the two.
- **Expiry.** `challenges.expires_at` lets a challenge lapse; resolution of `/c/[slug]` checks it.
- **Leaderboards.** Global and daily leaderboards are plain Supabase reads against `leaderboard_global` (top scores joined to display names). Comparison "did my friend beat me" is just two `scores` rows sharing a `challenge_id` — no live coordination needed.

Because comparison is asynchronous and read-time, the system needs no realtime infrastructure at all — a deliberate scope decision for a 5-day build.

---

## 6. Data Model (Supabase / Postgres)

References-only by design. RLS enabled on every table. These are the canonical definitions — see `supabase/migrations/` for the executable SQL plus policies.

```sql
-- profiles: one row per authenticated user
create table profiles (
  id            uuid primary key references auth.users,
  display_name  text,
  host_persona  text default 'hype',
  created_at    timestamptz default now()
);

-- games: a created game with a mode and config
create table games (
  id          uuid primary key default gen_random_uuid(),
  mode        text check (mode in ('finish_line','the_drop','next_line','artist_pick','word_rush','name_song','karaoke')),
  created_by  uuid references profiles,
  config      jsonb,
  created_at  timestamptz default now()
);

-- rounds: REFERENCES ONLY — no lyric-text columns
create table rounds (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid references games on delete cascade,
  track_id      text not null,
  line_index    int,
  round_type    text,
  seed          int,
  time_limit_ms int default 15000,
  position      int
);

-- challenges: async share links
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid references games,
  challenger  uuid references profiles,
  share_slug  text unique not null,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);

-- scores: results (authed via player_id, anonymous via anon_name)
create table scores (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid references games,
  challenge_id  uuid references challenges,
  player_id     uuid references profiles,
  anon_name     text,
  points        int default 0,
  accuracy      numeric,
  mode          text,
  created_at    timestamptz default now()
);

-- leaderboard_global: top scores joined to display names
-- (view; RLS enabled on every underlying table)
```

The `rounds` table is intentionally text-free: it stores the reference quadruple (`track_id`, `line_index`, `round_type`, `seed`) that lets any round be reconstructed live, and nothing that would constitute stored or redistributed lyrics.

---

## 7. State Management

The state strategy follows the asynchronous, server-authoritative nature of the game. There is no global client store and no realtime sync.

| State | Lives where | Why |
|---|---|---|
| Round content (`prompt`/`options`/`answer`) | Server-built, held in the play screen's React component state for the round's lifetime | Transient by compliance; never persisted, never lifted into a global store |
| Current game progress (which `position`, score so far) | React component state in `app/play/[gameId]/page.tsx` | A single-screen flow; local `useState`/`useReducer` is sufficient |
| Timer / speed-bonus countdown | Local component state (`RoundTimer`) | UI-only, per-round |
| Selected host persona | `profiles.host_persona` (authed) or local state (guest) | Persona is a small, durable preference |
| Scores, challenges, leaderboards | Supabase (server of record) | Durable, queried at read-time; RLS-guarded |
| Auth session | supabase-js (browser) + cookie-bridged to server for server actions | Standard Supabase Auth/SSR pattern |

**Principles:**

- **Server is authoritative for anything that counts.** Round generation and scoring happen on the server so neither the round answer nor the score can be tampered with from the client. The client renders and reports interactions; it does not own the truth.
- **No global client state library.** A Jackbox/Kahoot-style single-flow game doesn't need Redux/Zustand. Local component state plus server fetches keeps the codebase small for a 5-day build.
- **Fetch, don't subscribe.** Leaderboards and challenge comparisons are read on demand (page load / refresh), consistent with the no-realtime design.
- **Supabase as the only persistent store**, accessed directly from the browser through the publishable key + RLS for reads/writes the user is allowed to make, and through a server-side service-role client only when a write must be authoritative (e.g. server-validated scoring).

---

## 8. Tech-Choice Rationale

| Choice | Why |
|---|---|
| **Next.js (App Router, TypeScript)** | Route handlers and server actions give us a first-class server tier in the same project as the UI — exactly what the proxy pattern needs. The `NEXT_PUBLIC_` convention makes the secret boundary explicit and enforceable. TypeScript lets the canonical `Round` shape be a real type shared across server and client. |
| **Tailwind** | Fast, consistent styling for a game UI under a 5-day deadline; no separate design system to build. |
| **Supabase (Postgres + Auth + RLS)** | One managed service covers the database, authentication, and authorization. RLS lets the browser talk to the DB directly with the publishable key without trusting the client — the database enforces who can read/write what. Anonymous challenge guests (`anon_name`) and authed players (`profiles`) coexist under one policy model. |
| **Anthropic Claude (`claude-opus-4-8`)** | Drives live round generation (P1–P3), the mood/theme analysis that replaces the 403 Musixmatch endpoint (P4), and the host persona + banter (P5–P6). All prompts return strict JSON for reliable parsing. We default to adaptive thinking (`thinking: {type: "adaptive"}`) for the generation prompts and keep lyric usage transient (never logged/stored). Calls are made server-side via `@anthropic-ai/sdk` so `ANTHROPIC_API_KEY` never reaches the browser. |
| **ElevenLabs (TTS)** | The AI emcee's voice. Verified working: `POST /v1/text-to-speech/{voice_id}` returns `200 audio/mpeg`, auth via the `xi-api-key` header, on the creator tier (~131k credits). Selectable personalities map to different voices/prompts. Called only server-side. |
| **Musixmatch (lyrics)** | The sponsor API and the heart of the game. Verified live: `track.search`, `track.lyrics.get` (full lyrics, not truncated), `track.subtitle.get` (line-level synced), `track.richsync.get` (word-level synced), and `matcher.track.get` all return 200. `track.lyrics.mood.get` is 403 on our key — handled by deriving mood with Claude. Heavy Musixmatch use directly serves the "Use of Musixmatch API" judging criterion. |
| **LALAL.AI (optional)** | Stem separation for the karaoke stretch goal (vocal stem for pitch tracking), or the developer's own Soundberry stem service as an alternative. Optional and server-side only. |
| **Replit (deploy)** | Gives a public demo URL with the same env vars re-entered as Secrets — the brief's chosen host. |
| **No realtime layer** | A deliberate non-choice: the async `share_slug` model needs no sockets/presence, which removes an entire class of complexity and infrastructure from a solo 5-day build (see §5). |

### Compliance constraints that shaped the architecture

These are not optional and are the reason the data model and round flow look the way they do:

- **Persist only references** — `rounds` stores `track_id` + `line_index` + `round_type` + `seed`; prompt/options/answer text is regenerated live and shown transiently.
- **No redistribution of lyric text** in shared challenges — the `share_slug` carries a `game_id`, not lyrics; rounds are rebuilt live for each player.
- **Display the Musixmatch `lyrics_copyright` and fire the tracking pixel/script** whenever lyrics are shown — enforced in the client via `CopyrightBadge`.
- **Non-commercial demo use only.**
- **Rotate** the ElevenLabs key and Supabase DB password before the public demo (some keys were pasted in chat during development).

---

## Related Documents

- [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) — product vision, game modes, player experience, judging mapping.
- [BUILD_PLAN.md](./BUILD_PLAN.md) — the day-by-day 5-day build schedule and risk register.
- [PROMPTS.md](./PROMPTS.md) — the full Claude prompts (P1 round generator, P2 misheard decoys, P3 name-that-song decoys, P4 mood/theme, P5 host system prompt, P6 host banter), all returning strict JSON.
