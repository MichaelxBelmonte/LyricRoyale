# API Integration Guide

How Soundclash talks to its four external providers — **Musixmatch** (lyrics), **ElevenLabs** (AI host TTS), **Anthropic Claude** (round generation, host banter, mood analysis), and **LALAL.AI** (optional karaoke stem separation).

Sibling docs: [`README.md`](../README.md) (stack, setup, key-safety), [`BUILD_PLAN.md`](./BUILD_PLAN.md) (5-day sequencing), [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) (full product/data model), [`PROMPTS.md`](./PROMPTS.md) (the six Claude prompts P1–P6, all strict JSON).

---

## 0. Golden rule — server-side only, no key ever reaches the browser

**Every provider call happens ONLY in the Next.js server** (route handlers under `app/api/**` or server actions), acting as a thin proxy. The browser calls *our* backend; the backend calls the provider. No provider key is ever exposed client-side.

| Secret (server-side only) | Provider | Reached by |
|---|---|---|
| `MXM_KEY` | Musixmatch | `apikey` query param |
| `ELEVENLABS_API_KEY` | ElevenLabs | `xi-api-key` header |
| `ANTHROPIC_API_KEY` | Anthropic Claude | `@anthropic-ai/sdk` (reads env automatically) |
| `LALAL_API_KEY` | LALAL.AI API v1 | `X-License-Key` header |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | Supabase | migrations / direct Postgres only |

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are exposed to the browser (protected by RLS). Secrets live only in `.env.local` (gitignored); on Replit they go in Secrets. **Rotate the ElevenLabs key and the Supabase DB password before submission** — both were pasted in chat at some point.

> Each fetch example below reads its key from `process.env.*`. If you find a provider key anywhere in a client bundle, that is a compliance/security bug — fix it before shipping.

---

## 1. Musixmatch

- **Base URL:** `https://api.musixmatch.com/ws/1.1`
- **Auth:** `apikey` **query parameter** (e.g. `?apikey=${process.env.MXM_KEY}`), reads `MXM_KEY`.
- **Response envelope:** every response wraps a `message.header` (with `status_code`) and a `message.body`. Always check `message.header.status_code === 200` before reading the body.

### 1.1 Tested status (key verified live)

The Musixmatch key has been exercised live. Treat this table as ground truth.

| Endpoint | Status | Notes |
|---|---|---|
| `track.search` | **200 OK** | Search tracks by query/artist/title. |
| `track.lyrics.get` | **200 OK** | Returns **FULL lyrics** (not 30% truncated). |
| `track.subtitle.get` | **200 OK** | Line-level synced lyrics (LRC / line timestamps). |
| `track.richsync.get` | **200 OK** | **WORD-level** synced lyrics. Shape below. |
| `matcher.track.get` | **200 OK** | Resolve a track from free-text artist + title. |
| `track.lyrics.mood.get` | **403 FORBIDDEN** | **NOT available on the key → derive mood/theme with Claude** (P4) from the full lyrics. Never call this endpoint at runtime. |

### 1.2 richsync shape (WORD-level)

`track.richsync.get` returns, inside the body, a `richsync_body` string that is itself a JSON array of lines. Each line has the **exact** shape:

```json
{
  "ts": 12.3,
  "te": 15.8,
  "x": "full line text",
  "l": [
    { "c": "full", "o": 0.0 },
    { "c": " line", "o": 0.4 },
    { "c": " text", "o": 0.9 }
  ]
}
```

- `ts` — line start, seconds.
- `te` — line end, seconds.
- `x` — full line text.
- `l` — array of tokens; each `{ c: token_text, o: offset_seconds_within_line }`.

The `<LiveLyric>` component (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) Day 1) highlights tokens word-by-word against an audio clock using `ts`/`te` and per-token `o`. This same timing powers the karaoke word/timing accuracy score.

### 1.3 Which endpoint powers which game mode

| Game mode | Musixmatch endpoint(s) | How it is used |
|---|---|---|
| **Finish the Line** | `track.lyrics.get` | Pick a playable lyric line, hide the last word, build 4 tap options server-side. |
| **The Drop** | `track.lyrics.get` + `track.richsync.get` | Same missing-word mechanic, enhanced with word-level richsync timing when available. |
| **Next Line** | `track.lyrics.get` | Show one line and build 4 deterministic choices for the line that follows. |
| **Artist Lock** | `track.lyrics.get` + `track.search` | Show a lyric and build artist choices from the seed deck. |
| **Word Rush** | `track.lyrics.get` | Analyze recurring lyric keywords transiently and build 4 choices. |
| **Name That Song** | `track.lyrics.get` + `track.search` | Show a lyric and build song-title choices from the seed deck. |
| **Stem Guess Lab** | LALAL.AI upload/split + optional Musixmatch metadata | Split a local clip and guess extracted stem vs backing. |
| **Karaoke (stretch)** | `track.richsync.get` + `track.subtitle.get` | Word/timing accuracy from richsync token offsets; line-level fallback from subtitle. |

> **Mood/theme is NOT a Musixmatch call.** `track.lyrics.mood.get` is 403 on the key — the mood/theme used to flavor host banter and round selection comes from Claude (P4) reading the full lyrics. See [§3](#3-anthropic-claude).

### 1.4 Mandatory copyright + tracking display rule

**Whenever lyrics are shown, you MUST display the Musixmatch `lyrics_copyright` and fire the Musixmatch tracking pixel/script.** This is a hard licensing rule, not optional polish.

- `track.lyrics.get` / `track.subtitle.get` / `track.richsync.get` return a `lyrics_copyright` (and the subtitle/richsync variants carry their own copyright field). Surface it on every screen that renders lyric text.
- The lyrics body also carries the tracking pixel/script payload (`pixel_tracking_url` / `script_tracking_url` style fields). The client must fire it **on display** of any lyric content.
- Persist **only references** (`track_id + line_index + round_type + seed`) — never store lyric text, and never redistribute lyric text in shared challenges. See [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) §8 (Compliance & data model).

### 1.5 Server-side fetch example

```ts
// app/api/mxm/richsync/route.ts  (Next.js route handler — server only)
import { NextRequest, NextResponse } from "next/server";

const MXM_BASE = "https://api.musixmatch.com/ws/1.1";

export async function GET(req: NextRequest) {
  const trackId = req.nextUrl.searchParams.get("track_id");
  if (!trackId) {
    return NextResponse.json({ error: "track_id required" }, { status: 400 });
  }

  // apikey is a QUERY PARAM; MXM_KEY is read server-side and never sent to the client.
  const url =
    `${MXM_BASE}/track.richsync.get` +
    `?track_id=${encodeURIComponent(trackId)}` +
    `&apikey=${process.env.MXM_KEY}`;

  const res = await fetch(url);
  const json = await res.json();

  const status = json?.message?.header?.status_code;
  if (status !== 200) {
    return NextResponse.json({ error: "musixmatch", status }, { status: 502 });
  }

  const body = json.message.body.richsync;
  // richsync_body is a JSON string: array of { ts, te, x, l:[{c,o}] }
  const lines = JSON.parse(body.richsync_body);

  // Return ONLY what the client needs: timed lines + the copyright + tracking payload.
  // Do NOT persist lyric text anywhere — references only (track_id + line_index + seed).
  return NextResponse.json({
    lines,
    copyright: body.lyrics_copyright,
    tracking: {
      pixel: body.pixel_tracking_url ?? null,
      script: body.script_tracking_url ?? null,
    },
  });
}
```

Sibling proxy routes follow the same pattern: `GET /api/mxm/search` (`track.search`), `GET /api/mxm/lyrics` (`track.lyrics.get`), `GET /api/mxm/subtitle` (`track.subtitle.get`), `GET /api/mxm/match` (`matcher.track.get`). **Do not** add a `mood` route — that endpoint is 403; mood comes from Claude (P4).

---

## 2. ElevenLabs (AI host TTS + soundtrack)

The AI host (Hype-Man / Deadpan British Judge / Diva) speaks Claude-written lines at: round intro, correct answer, wrong answer, score reveal, game outro.

- **Auth:** `xi-api-key` **header**, reads `ELEVENLABS_API_KEY`.
- **Tier (verified):** creator, **~131k credits**. Lines are short (1–2 sentences) to stay well within budget.
- **Verified call:** `POST /v1/text-to-speech/{voice_id}` returns **200 `audio/mpeg`**.

### 2.1 Endpoints

| Endpoint | Use |
|---|---|
| `POST /v1/text-to-speech/{voice_id}` | One-shot synthesis → full `audio/mpeg` body. Use for pre-generated / cached banter. |
| `POST /v1/text-to-speech/{voice_id}/stream` | Streaming variant → progressive `audio/mpeg`. Use for low-latency in-game playback. |
| `POST /v1/music` | Prompt-to-music generation. Use offline through `npm run soundtrack:generate`, not on page load. Current default model: `music_v2`. |

Map each persona to a `voice_id`. Persona selection is stored on `profiles.host_persona` (default `hype`).

**Model choice:** use `eleven_turbo_v2_5` (low latency, multilingual — best fit for live, short, punchy host lines). Use `eleven_multilingual_v2` only if you need higher fidelity for a pre-rendered highlight-clip narration where latency does not matter.

**Credits note:** synthesis bills credits per character. With ~131k credits and 1–2 sentence host lines, a full demo run is comfortably within budget — but **pre-generate and cache** host audio for the demo (per the [`BUILD_PLAN.md`](./BUILD_PLAN.md) risk register R5) so a live rate-limit or credit hiccup can't interrupt the show.

### 2.2 Optional — Scribe for karaoke word scoring

For the karaoke stretch, ElevenLabs **Scribe** (speech-to-text) can transcribe the player's sung audio so we can score word/timing accuracy against the Musixmatch richsync tokens (`x` / `l[].c` / `l[].o`). This is optional and gated behind the karaoke feature flag — pitch accuracy + word/timing accuracy together form the karaoke score (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) Day 4). Do **not** use the user's audio-to-MIDI path; it is not performant.

### 2.3 Server-side fetch example

```ts
// app/api/host/tts/route.ts  (server only)
import { NextRequest, NextResponse } from "next/server";

const ELEVEN_BASE = "https://api.elevenlabs.io/v1";

export async function POST(req: NextRequest) {
  const { voiceId, text } = (await req.json()) as { voiceId: string; text: string };

  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!, // header auth, server-side only
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text, // short, Claude-written host line (1–2 sentences)
      model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.4, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "elevenlabs", status: res.status }, { status: 502 });
  }

  // Stream the audio/mpeg straight back to the client; the key never leaves the server.
  return new NextResponse(res.body, {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  });
}
```

For the low-latency in-game path, swap the URL for `${ELEVEN_BASE}/text-to-speech/${voiceId}/stream` and pipe `res.body` through unchanged.

### 2.4 Soundtrack generation

Soundclash uses ElevenLabs Music v2 to generate reusable static audio. This is an
asset-build step, not a runtime page feature, so credits and latency are
controlled.

```bash
npm run soundtrack:generate
```

The script reads `ELEVENLABS_API_KEY` server-side, calls `POST /v1/music` with
`model_id: "music_v2"`, `output_format=auto`, and `force_instrumental: true`,
then writes:

| File | Runtime use |
|---|---|
| `public/audio/soundclash-mixtape.mp3` | Legacy/setup instrumental loop. |
| `public/audio/soundclash-clash.mp3` | Host/player/solo round screens. |

For the personalized home sound, run:

```bash
npm run soundtrack:signature
```

This uses `ELEVENLABS_API_KEY` to generate an original vocal signature, then uses
`LALAL_API_KEY` to upload that full mix to LALAL.AI, split `vocals`, poll until
success, and download:

| File | Runtime use |
|---|---|
| `public/audio/soundclash-signal-full.mp3` | Home waveform soundtrack. |
| `public/audio/soundclash-signal-vocals.mp3` | Signal Check vocal layer. |
| `public/audio/soundclash-signal-backing.mp3` | Signal Check backing layer. |

`components/audio/AudioDirector.tsx` is the only browser playback layer. It never
sees the provider key, attempts browser autoplay, falls back to first tap when
blocked, alternates tracks on end, and ducks under `soundclash:duck` events
emitted by BEATBOT voice playback. `components/audio/HomeWaveform.tsx` subscribes
to the audio-state/analyser events and controls the same player.

---

## 3. Anthropic Claude

- **Model:** `claude-opus-4-8` (use exactly this string).
- **SDK:** `@anthropic-ai/sdk`. The client reads `ANTHROPIC_API_KEY` from the environment automatically — never hardcode the key.
- **Used for:** round generation (P1–P3), host banter (P5/P6), and **mood/theme analysis (P4)** — the replacement for the 403 `track.lyrics.mood.get` endpoint.
- **Output:** all six prompts return **strict JSON**. Use structured output (`output_config.format` with a `json_schema`) so the response is guaranteed parseable. Default to adaptive thinking for the generation prompts.

> The six prompts (P1 round generator, P2 misheard decoys, P3 name-that-song decoys, P4 mood+theme, P5 host system prompt per persona, P6 host banter per event) are fully written in [`PROMPTS.md`](./PROMPTS.md). This section covers only the transport.

### 3.1 Where Claude is used

| Prompt | Purpose | Game surface |
|---|---|---|
| **P1** | `finish_line` + `next_line` round generation | Round engine (`/api/round/generate`) |
| **P2** | Misheard mondegreen decoys | Misheard Lyrics mode |
| **P3** | Name-that-song decoys | Name That Song mode |
| **P4** | **Mood + theme analysis** (replaces the 403 mood endpoint) | Round selection + host banter flavor |
| **P5** | Host system prompt per persona | AI host (Hype-Man / Deadpan British Judge / Diva) |
| **P6** | Host banter per event (`round_intro`, `correct`, `wrong`, `score_reveal`, `game_outro`, `clip_caption`) | AI host |

**Compliance:** lyric text passed to Claude at round-generation time is **transient** — never logged, never stored. The persisted round holds only `track_id + line_index + round_type + seed`; the prompt/options/answer text is regenerated live each play.

### 3.2 Server-side example (structured JSON output)

```ts
// app/api/round/generate/route.ts  (server only)
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// Strict-JSON schema for a generated round (see PROMPTS.md P1).
const ROUND_SCHEMA = {
  type: "object",
  properties: {
    prompt: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    // string for finish_line; integer option-index for next_line / name_song / misheard
    answer: { anyOf: [{ type: "string" }, { type: "integer" }] },
  },
  required: ["prompt", "answer"],
  additionalProperties: false,
} as const;

export async function POST(req: NextRequest) {
  // lyricLine is fetched LIVE from Musixmatch upstream and used transiently — never stored.
  const { lyricLine, roundType } = (await req.json()) as {
    lyricLine: string;
    roundType: "finish_line" | "next_line";
  };

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    system: "You generate Soundclash rounds. Return STRICT JSON only. See PROMPTS.md P1.",
    output_config: { format: { type: "json_schema", schema: ROUND_SCHEMA } },
    messages: [{ role: "user", content: `Round type: ${roundType}\nLine: ${lyricLine}` }],
  });

  // output_config.format guarantees the first block is text with valid JSON.
  const text = response.content.find((b) => b.type === "text");
  const round = JSON.parse(text!.text);

  // Validate, then return transiently. Do NOT log or persist the lyric text or the round text.
  return NextResponse.json(round);
}
```

The host banter route (`/api/host/banter`) uses the same client and `output_config.format`, with the P5 persona system prompt and P6 per-event user message. Mood analysis (`/api/mood`) calls Claude with P4 over the full lyrics and returns a strict-JSON `{ mood, theme }` — this is the runtime substitute for the 403 Musixmatch mood endpoint.

---

## 4. LALAL.AI (optional — stem mini-games / karaoke)

Used for optional stem-based mini-games and the karaoke stretch. The first implemented
surface is `/solo/providers`: upload a short audio file, separate a stem, and play
a blind stem/backing guessing round.

- **Auth:** `X-License-Key` header, reads `LALAL_API_KEY`.
- **Flow:** upload audio → request split (stem type `vocals`, `drum`, etc.) → poll task status → play returned track URLs. All provider calls run server-side.
- **Current app endpoints:** `POST /api/lalal/stems` and `GET /api/lalal/stems/[taskId]`.
- **No app persistence:** uploaded media IDs, task IDs, and result URLs are transient in the client lab.

### 4.1 Server-side fetch example (upload step)

```ts
// app/api/lalal/stems/route.ts  (server only)
import { NextRequest, NextResponse } from "next/server";

const LALAL_BASE = "https://www.lalal.ai/api/v1";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;

  const upload = await fetch(`${LALAL_BASE}/upload/`, {
    method: "POST",
    headers: {
      "X-License-Key": process.env.LALAL_API_KEY!, // server-side only
      "Content-Disposition": `attachment; filename="${file.name}"`,
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!upload.ok) {
    return NextResponse.json({ error: "lalal", status: upload.status }, { status: 502 });
  }

  const { id } = (await upload.json()) as { id: string };
  // Next: POST /api/v1/split/stem_separator/ with { source_id, presets: { stem } },
  // then poll /api/v1/check/ with { task_ids: [task_id] }.
  return NextResponse.json({ uploadId: id });
}
```

---

## 5. Quick reference — env var per call

| Call | Env var read | Auth mechanism |
|---|---|---|
| `GET /api/mxm/*` (search, lyrics, subtitle, richsync, match) | `MXM_KEY` | `apikey` query param |
| `POST /api/host/tts` (one-shot + `/stream`) | `ELEVENLABS_API_KEY` | `xi-api-key` header |
| `POST /api/round/generate`, `/api/host/banter`, `/api/mood` | `ANTHROPIC_API_KEY` | `@anthropic-ai/sdk` (env) |
| `POST /api/lalal/stems`, `GET /api/lalal/stems/[taskId]` | `LALAL_API_KEY` | `X-License-Key` |

No provider key is ever sent to the browser. The client only ever calls Soundclash's own `/api/**` routes; the routes proxy to the providers using the server-side secrets above.
