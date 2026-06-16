# Lyric Royale — Product Specification

> A web **party game** built on real song **lyrics** with an **AI host**. Built for the Musixmatch Musicathon 2026. Solo developer, ~5 days, deadline **21 June 2026**.

Positioning: *"Genius tells you what a lyric means; Lyric Royale uses the lyrics you know to make a game out of it."*

Sibling docs: see [`README.md`](../README.md) for stack/setup and key-safety rules, and [`PROMPTS.md`](./PROMPTS.md) for the full Claude prompt set (P1–P6).

---

## 1. Vision & Positioning

Lyric Royale turns the lyrics people already know into a fast, social party game. No microphone is needed for the core experience — you read a lyric and type or tap an answer. An AI emcee runs the show: it hypes you up, roasts you, and reveals scores with personality. You play, get a score, and challenge friends on the **same rounds** via a link.

### The white space (from competitive analysis)

Nobody combines all three of these in one product:

| Pillar | What it means | Who else does it |
|---|---|---|
| **AI personality host/judge** | An emcee that speaks (TTS) with a selectable persona, generated live by Claude | Trivia apps have static prompts, not a reactive personality |
| **Lyric-centric gameplay** | Games built on the *words* of songs — not pitch detection, not "name the artist" trivia | Karaoke apps score pitch; trivia apps don't use real synced lyrics |
| **Async social** | Room-code play, async challenge links, leaderboards, shareable clips | Jackbox/Kahoot are synchronous-only or install-bound |

Critically: **Musixmatch — the sponsor and a judge — ships zero games.** Lyric Royale is the game-shaped showcase of their lyrics API that they don't build themselves.

### Why this wins judging

Judging is four criteria, **25% each**: Originality, Craft, Use of Musixmatch API, Impact. See the [feature → criteria map](#9-features--judging-criteria) for how each feature is intended to score. The short version: the AI host (Originality), the references-only compliance architecture (Craft + Use-of-Musixmatch), word-level richsync karaoke (Use-of-Musixmatch), and zero-install async social (Impact).

---

## 2. Player Experience — One Session, Start to Finish

This walkthrough is one casual async challenge, the primary MVP flow.

1. **Land.** Alex opens the public demo URL (no install, no login). The home screen offers *Start a game* or *Enter a room code*.
2. **Pick a mode + host.** Alex picks **Finish the Line** and the **Hype-Man** host persona. (Personas are described in [§7](#7-the-ai-host).)
3. **Round intro.** The host speaks: *"Alright Alex, five lines, no mercy — let's GO."* (Claude generates the line via prompt P6 `round_intro`; ElevenLabs speaks it. The Musixmatch `lyrics_copyright` is shown and the tracking pixel fires the moment a lyric is on screen.)
4. **Play a round.** A lyric appears with its last word(s) blanked: *"Is this the real life? Is this just ______?"* A 15-second timer runs. Alex types `fantasy`.
5. **Verdict.** Correct. The speed bonus is large because Alex answered in 3s. The host reacts: *"FANTASY! Didn't even blink — respect."* (P6 `correct`.)
6. **Repeat.** Four more rounds, mixing in a wrong answer (host roast via P6 `wrong`) and a near-miss.
7. **Score reveal.** After round 5, the host reveals the total with flourish: *"4 out of 5 and a stack of speed points — that's a 920."* (P6 `score_reveal`.)
8. **Outro + challenge.** The host signs off (P6 `game_outro`). Alex gets a **share slug link** and an optional **AI-narrated highlight clip**. Alex sends the link to Sam.
9. **The async loop closes.** Sam opens the link, plays the **exact same rounds** (same `track_id` + `line_index` + `seed`, regenerated live), and tries to beat 920. Both scores land on the **daily and global leaderboards**.

No lyric text is ever stored or redistributed — every prompt/option/answer is regenerated live at play time from a Musixmatch fetch + Claude, and shown transiently. See [§8](#8-compliance--data-model) and [`PROMPTS.md`](./PROMPTS.md).

---

## 3. Game Modes Overview

| # | Mode | Mic? | Tier | One-liner |
|---|---|---|---|---|
| 1 | Finish the Line | No | MVP | Type the hidden last word(s) of a line |
| 2 | Next Line | No | MVP | Pick the correct following line (4 options) |
| 3 | Name That Song | No | MVP | Pick the correct song for a snippet (4 options) |
| 4 | Misheard Lyrics | No | MVP | Pick the REAL line among funny mondegreen decoys |
| 5 | Speed Lyrics | No | Stretch | Timed rapid-fire word rounds |
| 6 | Karaoke (sing-and-score) | **Yes** | Stretch / wow | Pitch + word/timing accuracy vs a reference |

All word-game scoring is **correctness + speed bonus** (the bonus decays with elapsed time). Karaoke scoring is **pitch accuracy + word/timing accuracy**.

---

## 4. The Five No-Mic Modes (MVP)

Each mode below specifies its **goal**, the **round flow** step by step, and **scoring**. Round prompts/options/answers are generated live; the persisted round stores only references (`track_id`, `line_index`, `round_type`, `seed`). The runtime `Round` shape is in [§8](#8-compliance--data-model).

### 4.1 Finish the Line

- **Goal:** Recall the missing word(s) that end a lyric line.
- **How a round works:**
  1. Server picks a `track_id` + `line_index` (seeded) and fetches full lyrics from Musixmatch (`track.lyrics.get`).
  2. Claude (prompt **P1**, `finish_line`) selects the line, blanks the last word(s), and returns `{ prompt, answer }` as strict JSON.
  3. Client shows the line with a blank and starts the `time_limit_ms` timer (default 15000).
  4. Player types the answer; submit (or timeout) ends the round.
  5. Answer is matched case-insensitively with light normalization (trim, punctuation-tolerant).
- **Scoring:** `points = base (if correct) + speed_bonus`. `speed_bonus` decays with elapsed time toward zero at the time limit. Wrong/timeout = 0 for that round.

### 4.2 Next Line

- **Goal:** Identify which line comes next in the song.
- **How a round works:**
  1. Server picks `track_id` + `line_index` (seeded); fetches full lyrics.
  2. Claude (prompt **P1**, `next_line`) returns the shown line, the correct following line, and 3 plausible distractor lines — `{ prompt, options[4], answer }` (answer is the index or text).
  3. Client renders the prompt line + 4 shuffled options; timer starts.
  4. Player taps one option.
  5. Correct option closes the round.
- **Scoring:** `base (if correct) + speed_bonus`. Wrong/timeout = 0.

### 4.3 Name That Song

- **Goal:** Match a lyric snippet to the song it comes from.
- **How a round works:**
  1. Server picks a `track_id` + `line_index` (seeded); fetches lyrics for the snippet.
  2. Claude (prompt **P3**, name-that-song decoys) returns the snippet and 4 song choices (correct title + 3 decoys) — `{ prompt, options[4], answer }`.
  3. Client shows the snippet + 4 song options; timer starts.
  4. Player taps the song.
  5. Correct choice closes the round.
- **Scoring:** `base (if correct) + speed_bonus`. Wrong/timeout = 0.

### 4.4 Misheard Lyrics

- **Goal:** Pick the **real** line out of funny mondegreen (misheard) decoys.
- **How a round works:**
  1. Server picks `track_id` + `line_index` (seeded); fetches the real line.
  2. Claude (prompt **P2**, misheard decoys) returns the real line plus 3 funny-but-wrong mondegreens — `{ options[4], answer }` (broadly tasteful, no slurs).
  3. Client shows 4 shuffled versions; timer starts.
  4. Player taps the version they believe is real.
  5. Correct (the real line) closes the round.
- **Scoring:** `base (if correct) + speed_bonus`. Wrong/timeout = 0.

### 4.5 Speed Lyrics *(stretch)*

- **Goal:** Answer as many rapid-fire lyric prompts as possible against the clock.
- **How a round works:**
  1. A single timed session strings together short word-game prompts (mostly Finish-the-Line / Next-Line style), each seeded.
  2. Prompts are pre-generated/queued so there's no per-item wait; each is shown for a brief window.
  3. Player answers fast; the next prompt loads immediately.
  4. Session ends when the global timer expires.
- **Scoring:** Sum of per-item `base + speed_bonus` across the run; the tighter per-item windows make the speed component dominate. Streaks may amplify the bonus (tunable). Wrong answers score 0 for that item and do not pause the clock.

---

## 5. Karaoke — Sing-and-Score (Stretch / wow)

- **Goal:** Sing along to a reference melody and get scored on pitch and on hitting the right words at the right time.
- **How a round works:**
  1. Server selects a track with **word-level synced** lyrics via Musixmatch `track.richsync.get`.
  2. (Optional) A vocal stem is produced via LALAL.AI or the user's own Soundberry stem service for cleaner pitch tracking.
  3. Pitch is tracked from the **vocal stem** with **CREPE/pYIN** and compared to a reference melody. **Do not** use the user's audio-to-MIDI path — it is not performant.
  4. Word/timing accuracy is derived from Musixmatch **richsync** (word-level timestamps) cross-checked with **ElevenLabs Scribe** (speech-to-text).
  5. Lyrics scroll in time with the song while the player sings.
- **Scoring:** `pitch accuracy + word/timing accuracy`. Pitch accuracy compares tracked pitch vs the reference melody; word/timing accuracy rewards singing the right words at the right moments per the richsync timeline.

### Richsync line shape (reference)

`track.richsync.get` returns a JSON array of lines. Each line:

```json
{
  "ts": 12.34,
  "te": 15.67,
  "x": "full line text",
  "l": [
    { "c": "full", "o": 0.00 },
    { "c": "line", "o": 0.42 },
    { "c": "text", "o": 0.88 }
  ]
}
```

Where `ts`/`te` are line start/end seconds, `x` is the full line text, and `l` is the token list with `c` (token text) and `o` (offset seconds within the line).

---

## 6. Live Generation Pipeline (all modes)

All gameplay text is produced at play time, never persisted. High level:

```ts
// Server route handler / server action — keys never reach the browser.
// Persisted round = { track_id, line_index, round_type, seed }  (NO text)
async function buildRound(ref: { trackId: string; lineIndex: number; type: RoundType; seed: number }): Promise<Round> {
  // 1. Fetch lyrics LIVE from Musixmatch (full lyrics, line-level, or word-level synced)
  const lyrics = await mxm.lyricsGet(ref.trackId);        // track.lyrics.get → 200, FULL lyrics

  // 2. Generate prompt/options/answer LIVE with Claude (strict JSON; lyric usage transient)
  const generated = await claude.generateRound(ref, lyrics); // P1 / P2 / P3 per round_type

  // 3. Return transient Round to the client; persist ONLY the reference + score later
  return { ...generated, copyright: lyrics.lyrics_copyright };
}
```

The Claude model is **`claude-opus-4-8`** (the current, verified model ID). All prompts (P1–P6) return **strict JSON**; lyric text is never logged or stored. See [`PROMPTS.md`](./PROMPTS.md).

---

## 7. The AI Host

The host is an ElevenLabs TTS voice driven by short, punchy lines that Claude generates per event. Lines are 1–2 sentences, no slurs, broadly tasteful.

### Personalities

Selectable per game. Each maps to an ElevenLabs voice + a Claude system prompt (**P5**, host system prompt per persona).

| Persona | Voice / vibe | Behavior |
|---|---|---|
| **Hype-Man** | High-energy, loud | Celebrates wins hard, gasses players up, playful trash talk |
| **Deadpan British Judge** | Dry, understated | Cutting wit, unimpressed, deadpan praise and roasts |
| **Diva** | Theatrical, glamorous | Dramatic flourishes, melodramatic verdicts, big reveals |

### When the host speaks

Banter is generated per event via prompt **P6** (host banter per event):

| Event | When it fires | Prompt event key |
|---|---|---|
| Round intro | Before a round (or game) starts | `round_intro` |
| Correct answer | Player answers correctly | `correct` |
| Wrong answer | Player answers wrong / times out | `wrong` |
| Score reveal | Score is revealed (per-round or end) | `score_reveal` |
| Game outro | Game ends | `game_outro` |
| Clip caption | Generating the shareable highlight | `clip_caption` |

Optionally, the host auto-generates a shareable **highlight clip** with an AI-narrated caption (`clip_caption`).

> Mood/theme for track selection and flavor is derived by Claude from the full lyrics (prompt **P4**), because Musixmatch `track.lyrics.mood.get` returns **403** on the key. See [§10](#10-tested-api-status).

---

## 8. Compliance & Data Model

### Hard compliance rules

- **Persist only references — never store lyric text.** A persisted round stores `track_id + line_index + round_type + seed`. The prompt/options/answer **text** is regenerated **live** (Musixmatch fetch + Claude) at play time and shown transiently.
- **No redistribution** of lyric text in shared challenges.
- **Display the Musixmatch `lyrics_copyright`** and fire the tracking pixel/script **whenever lyrics are shown**.
- **Non-commercial demo use only.**
- All provider calls happen **only** in the Next.js server (route handlers / server actions) acting as a proxy; the browser **never** sees server-side keys.
- **Key rotation note:** some keys were pasted in chat — rotate the **ElevenLabs key** and the **Supabase DB password**.

### Runtime Round shape (TypeScript)

Generated live, not persisted with text:

```ts
type RoundType = "finish_line" | "next_line" | "name_song" | "misheard" | "speed";

interface Round {
  id: string;
  gameId: string;
  trackId: string;
  lineIndex: number;
  type: RoundType;
  prompt: string;
  options?: string[];
  answer: string | number;
  timeLimitMs: number;
  copyright: string;
}
```

### Supabase / Postgres schema (references only)

RLS is enabled on every table. Anonymous casual play is allowed via `anon_name` (challenge guests, no auth); authed users go through `profiles`. Supabase `project_ref = twqdwrkbztwssfhaznvw`.

```sql
create table profiles (
  id uuid primary key references auth.users,
  display_name text,
  host_persona text default 'hype',
  created_at timestamptz default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  mode text check (mode in ('finish_line','next_line','name_song','misheard','speed','karaoke')),
  created_by uuid references profiles,
  config jsonb,
  created_at timestamptz default now()
);

-- NO lyric-text columns: only references + a seed.
create table rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games on delete cascade,
  track_id text not null,
  line_index int,
  round_type text,
  seed int,
  time_limit_ms int default 15000,
  position int
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games,
  challenger uuid references profiles,
  share_slug text unique not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games,
  challenge_id uuid references challenges,
  player_id uuid references profiles,
  anon_name text,
  points int default 0,
  accuracy numeric,
  mode text,
  created_at timestamptz default now()
);

-- Top scores joined to display names.
create view leaderboard_global as ( /* top scores joined to profiles.display_name */ );
```

### Environment variables

Server-side secrets (no `NEXT_PUBLIC` prefix): `MXM_KEY`, `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
Public (browser, protected by RLS): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Secrets live only in `.env.local` (gitignored). The repo is public at github.com/MichaelxBelmonte/LyricRoyale. See [`README.md`](../README.md) for the local-setup steps.

---

## 9. Social Loop

Web-based, Jackbox/Kahoot-style: zero install, room-code or shareable link.

- **Room code / share link.** Start a game and get a code or link; friends join with no install and no required login.
- **Async challenge.** Play, get a score, share a **slug link** (`challenges.share_slug`, unique). Friends open the link and try to beat you on the **same rounds** — the same `track_id` + `line_index` + `seed`, regenerated live (no lyric text in the link).
- **Leaderboards.** Global + daily. Backed by the `scores` table and the `leaderboard_global` view; anonymous guests appear via `anon_name`, authed players via `profiles.display_name`.
- **Shareable clip.** Optional AI-narrated highlight clip (host caption via prompt P6 `clip_caption`) for organic sharing — no lyric text redistributed.

---

## 10. Tested API Status

Musixmatch key verified **live**:

| Endpoint | Status | Notes |
|---|---|---|
| `track.search` | 200 OK | |
| `track.lyrics.get` | 200 OK | **Full** lyrics (not 30% truncated) |
| `track.subtitle.get` | 200 OK | Line-level synced (LRC) |
| `track.richsync.get` | 200 OK | **Word-level** synced (line shape in [§5](#5-karaoke--sing-and-score-stretch--wow)) |
| `matcher.track.get` | 200 OK | |
| `track.lyrics.mood.get` | **403 FORBIDDEN** | Not available on the key → derive mood/theme with Claude (prompt P4) |

**ElevenLabs** verified: tier creator, ~131k credits. `POST /v1/text-to-speech/{voice_id}` returns 200 `audio/mpeg`; auth via the `xi-api-key` header.

**Anthropic (Claude):** model `claude-opus-4-8` (current, verified). All host/round generation runs server-side; the browser never sees the key.

---

## 11. MVP vs Stretch

| Area | MVP | Stretch / wow |
|---|---|---|
| Game modes | Finish the Line, Next Line, Name That Song, Misheard Lyrics | Speed Lyrics; Karaoke (sing-and-score) |
| Input | No microphone — type/tap | Microphone (karaoke) |
| AI host | 3 personas; speaks at round intro / correct / wrong / score reveal / outro | Auto-generated AI-narrated highlight clip |
| Lyrics use | Full lyrics + line-level synced (LRC) | Word-level richsync; ElevenLabs Scribe word/timing scoring |
| Pitch | — | CREPE/pYIN on a vocal stem (LALAL.AI or Soundberry); reference-melody scoring |
| Social | Room code, async challenge slug, global + daily leaderboards, anon play | Shareable highlight clip with AI caption |
| Mood/theme | Claude-derived (P4) replacing the 403 endpoint | — |

---

## 12. Features → Judging Criteria

Judging: four criteria, **25% each**. This maps each feature to the criterion it primarily advances.

| Feature | Originality | Craft | Use of Musixmatch API | Impact |
|---|:--:|:--:|:--:|:--:|
| AI personality host (3 personas, live Claude banter + ElevenLabs TTS) | ● | ● | | ● |
| Lyric-centric no-mic modes (Finish/Next/Name/Misheard) | ● | ● | ● | ● |
| Misheard Lyrics (mondegreen decoys via Claude) | ● | | ● | |
| Word-level **richsync** karaoke (pitch + word/timing) | ● | ● | ● | |
| References-only compliance architecture (no lyric text persisted) | | ● | ● | |
| `lyrics_copyright` display + tracking pixel on every lyric view | | ● | ● | |
| Claude-derived mood/theme (replaces 403 endpoint) | ● | ● | ● | |
| Async challenge link on the **same rounds** (seeded) | ● | ● | | ● |
| Room-code / zero-install web play (Jackbox/Kahoot-style) | | ● | | ● |
| Global + daily leaderboards | | ● | | ● |
| Shareable AI-narrated highlight clip | ● | | | ● |
| Server-side proxy (keys never reach the browser) | | ● | ● | |

● = the feature meaningfully contributes to that 25% criterion.

---

## 13. Stack (summary)

Next.js (App Router, TypeScript) + Tailwind. Supabase (Postgres + Auth + RLS) for scores/challenges/leaderboards. Deploy on Replit (public demo URL). LLM = Anthropic Claude (`claude-opus-4-8`). TTS = ElevenLabs. Lyrics = Musixmatch. Optional stem separation = LALAL.AI (or the user's own Soundberry stem service).

Full setup and key-safety rules: [`README.md`](../README.md). Claude prompts P1–P6: [`PROMPTS.md`](./PROMPTS.md).
