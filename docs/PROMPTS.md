# LLM Prompts (Claude) — Specification

> The complete, production-ready Claude prompt set for **Lyric Royale**. Every game round, every host line, and the mood/theme analysis that replaces the unavailable Musixmatch mood endpoint are generated here. All six prompts (P1–P6) return **strict JSON** and treat lyric text as **transient** — never stored, never logged.

Sibling docs:
- [`PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) — game modes, host personas, player experience.
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — 5-day sequencing; where each prompt lands.
- [`README.md`](../README.md) — stack, setup, key-safety rules.
- `ARCHITECTURE.md` — proxy routes and data flow (where these prompts are called).
- `DATA_MODEL.md` — Supabase tables/RLS (what is persisted vs regenerated).
- `COMPLIANCE.md` — Musixmatch references-only rules, copyright display, tracking pixel.

---

## 1. Scope & ground rules

These prompts are the **generation layer** of Lyric Royale. They sit behind Next.js server route handlers / server actions (the [`README.md`](../README.md) proxy rule: the browser never sees `ANTHROPIC_API_KEY`). The server fetches lyrics from Musixmatch, calls Claude with one of these prompts, validates the JSON, and returns a transient payload to the client.

| Prompt | Purpose | Called at | Replaces |
|---|---|---|---|
| **P1** | Round generator — `finish_line` + `next_line` | Round load (live, per `seed`) | — |
| **P2** | Misheard Lyrics decoy generator | Round load (`misheard` mode) | — |
| **P3** | Name-That-Song distractor generator | Round load (`name_song` mode) | — |
| **P4** | Mood & Theme analysis | Track ingest / pre-round | Musixmatch `track.lyrics.mood.get` (**403 — not on key**) |
| **P5** | AI Host system prompt (one per persona) | Host call setup | — |
| **P6** | Host banter per event | Each host moment (intro/correct/wrong/etc.) | — |

### Model & call configuration

| Setting | Value | Notes |
|---|---|---|
| Model | `claude-opus-4-8` | Per the canonical brief. Same ID across every prompt. |
| Thinking | `{ type: "adaptive" }` | Adaptive thinking is the supported mode on Opus 4.8; do **not** send `budget_tokens` (returns 400). |
| Effort | `{ effort: "low" }` for P1–P3, P6; `{ effort: "medium" }` for P4 | These are short, well-specified generation tasks. Low effort keeps latency and credit cost down; P4 reasons over full lyrics so it gets medium. |
| Output | `output_config.format` with a `json_schema` | **Strict JSON enforced server-side.** Do not use assistant-message prefills — they return 400 on Opus 4.8. |
| `max_tokens` | 1024 (P1–P3, P6), 1500 (P4) | Non-streaming; well under the SDK timeout guard. |
| Sampling | **none** | `temperature` / `top_p` / `top_k` are removed on Opus 4.8 and return 400. Steer with the prompt, not sampling. |

> **Why `output_config.format` and not prefill:** Opus 4.8 rejects last-assistant-turn prefills (400). Structured outputs (`output_config: { format: { type: "json_schema", schema: ... } }`) guarantee a parseable response against the schemas below. See [`README.md`](../README.md) for the SDK call wrapper.

### Reference: server call shape (TypeScript)

```ts
// All prompts share this wrapper. Lyric text flows IN as a parameter and is
// NEVER persisted or written to logs. See ARCHITECTURE.md for the proxy route.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // ANTHROPIC_API_KEY from server env only

async function callClaude<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: opts.maxTokens ?? 1024,
    thinking: { type: "adaptive" },
    output_config: {
      effort: opts.effort ?? "low",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block");
  return JSON.parse(text.text) as T; // schema-guaranteed valid JSON
  // NB: do not console.log(opts.user) or text.text — both contain lyric text.
}
```

---

## 2. Global guidance (applies to every prompt)

These rules are repeated, in spirit, inside each system prompt. They are restated once here as the source of truth.

1. **Strict JSON only.** Output a single JSON object that validates against the prompt's schema. No prose, no markdown fences, no preamble, no trailing commentary. Enforced by `output_config.format`; the schema is also the contract for validation on the server.
2. **Lyric text is transient.** Lyric lines are passed in at play time, used to generate the round, and discarded. Per [`COMPLIANCE.md`](./COMPLIANCE.md): the server persists only `track_id + line_index + round_type + seed` (see [`DATA_MODEL.md`] `rounds` table) — **never** the prompt/options/answer text. Claude must not be asked to store, summarize-for-storage, or echo lyrics beyond what the round needs. The application **never logs** the user template contents or the raw model output.
3. **Keep host lines short.** P5/P6 lines are spoken via ElevenLabs TTS (credits are finite — ~131k on the creator tier per the brief). Host output is **≤ 2 sentences**, punchy, and tasteful. Shorter lines = lower latency + lower TTS credit cost.
4. **Determinism via seed, not sampling.** Each round carries a `seed` (int) so the *same* challenge regenerates the *same* round for a challenged friend. The seed is passed into the user template; the prompt instructs Claude to use it as a tiebreaker/selection key. We do not rely on `temperature` (removed on Opus 4.8).
5. **No redistribution.** Decoys (P2, P3) must be **original** text written by Claude — never copied from other real copyrighted lyrics or song titles beyond the one in play. Whenever a real lyric is shown to a player, the client displays the Musixmatch `lyrics_copyright` and fires the tracking pixel (handled by the client, documented in [`COMPLIANCE.md`](./COMPLIANCE.md) — not Claude's responsibility, but the prompts are written so no extra real lyric ever leaks into the payload).
6. **Family-friendly-ish, never slurs.** Roasts are playful; no slurs, no hate, no harassment. Match the UI language (see P5/P6 `uiLang`).

---

## 3. Shared types

These TypeScript types are the contract between the server and the prompts. The runtime `Round` (from the canonical brief) is assembled from P1/P2/P3 output plus the Musixmatch fetch.

```ts
type RoundType = "finish_line" | "next_line" | "name_song" | "misheard" | "speed";

// Generated live, NOT persisted with text (DATA_MODEL.md `rounds` stores references only).
interface Round {
  id: string;
  gameId: string;
  trackId: string;
  lineIndex: number;
  type: RoundType;
  prompt: string;
  options?: string[];
  answer: string | number; // string for finish_line; index (number) for choice modes
  timeLimitMs: number;
  copyright: string; // Musixmatch lyrics_copyright, shown transiently
}

type HostPersona = "hype" | "judge" | "diva"; // Hype-Man / Deadpan British Judge / Diva
type HostEvent =
  | "round_intro"
  | "correct"
  | "wrong"
  | "score_reveal"
  | "game_outro"
  | "clip_caption";
```

---

## P1 — Round Generator (`finish_line` + `next_line`)

### Purpose

Generate a single playable round for the two text-only word modes:
- **`finish_line`** — blank out the last word(s) of one lyric line; the player types the missing text.
- **`next_line`** — show one line; the player picks the correct *following* line from 4 options. Claude writes 3 plausible-but-wrong decoy lines.

### Input contract

The server fetches the lyric lines for `trackId` from Musixmatch (line-level subtitle or richsync — see [`ARCHITECTURE.md`]), passes a window of lines around `lineIndex`, the target `mode`, and the `seed`.

```ts
interface P1Input {
  mode: "finish_line" | "next_line";
  lines: string[];      // ordered lyric lines (a window around the target), transient
  lineIndex: number;    // index within `lines` of the target line
  seed: number;         // determinism key (same seed => same round)
}
```

### System prompt

```text
You are the round generator for Lyric Royale, a lyrics party game. You build ONE
round from real song lyric lines that are provided to you at runtime.

Output rules (non-negotiable):
- Respond with a SINGLE JSON object that matches the provided schema. No prose,
  no markdown, no code fences, no explanation.
- The lyric lines are provided only to construct this round. Do not store them,
  do not repeat them beyond what the round requires, and do not add commentary.
- Be deterministic: use the integer `seed` to make every choice (which word(s)
  to blank, the order of options). The same seed and inputs must always yield the
  same round.

Mode = "finish_line":
- Take the line at `lineIndex`. Blank out the final word OR the final short phrase
  (1–3 words) that makes a satisfying guess — prefer a content word (noun, verb,
  rhyme word), not a filler word like "the" or "and".
- `prompt` = the full target line with the blanked span replaced by "_____".
- `answer` = the exact blanked text (string), preserving original casing and
  punctuation as it appears in the line.
- `blankIndex` = the 0-based word position in the target line where the blank starts.
- Do NOT include `options` for finish_line.

Mode = "next_line":
- `prompt` = the line at `lineIndex` (shown to the player as the "current" line).
- The correct next line is the line at `lineIndex + 1` (provided in `lines`).
- Write exactly 3 DECOY next-lines: original lines you invent that are plausible,
  similar in length/rhythm/register to the real next line, but clearly not it.
  Decoys must be your own writing — never copy other real copyrighted lyrics.
- `options` = an array of 4 strings: the real next line plus your 3 decoys,
  shuffled using the seed.
- `answer` = the integer index (0–3) of the correct next line within `options`.
- Do NOT include `blankIndex` for next_line.

Keep everything tasteful and free of slurs.
```

### User template

```text
mode: {{mode}}
seed: {{seed}}
lineIndex: {{lineIndex}}
lines:
{{#each lines}}[{{@index}}] {{this}}
{{/each}}

Build the round now. Return only the JSON object.
```

### Output schema (strict)

```json
{
  "type": "object",
  "properties": {
    "prompt": { "type": "string" },
    "options": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 4,
      "maxItems": 4
    },
    "answer": {
      "anyOf": [{ "type": "string" }, { "type": "integer" }]
    },
    "blankIndex": { "type": "integer" }
  },
  "required": ["prompt", "answer"],
  "additionalProperties": false
}
```

> **Server contract:** for `finish_line`, expect `answer: string` + `blankIndex`, no `options`. For `next_line`, expect `options: string[4]` + `answer: integer` (the index). The server maps this onto the runtime `Round` (`prompt`, `options?`, `answer`, plus `copyright` from the Musixmatch payload).

### Recommended temperature

**None.** Opus 4.8 does not accept sampling parameters. Use `effort: "low"` and rely on the `seed` for determinism.

---

## P2 — Misheard Lyrics Generator

### Purpose

For the **Misheard Lyrics** mode: given one real lyric line, produce 3 funny, *plausible* mondegreens (the kind of thing a listener genuinely mishears). The player must pick the **real** line among the four. Decoys should sound similar when sung but mean something amusingly different.

### Input contract

```ts
interface P2Input {
  real: string;   // one real lyric line, transient
  seed: number;   // determinism key
}
```

### System prompt

```text
You are the Misheard Lyrics writer for Lyric Royale. Given ONE real song lyric
line, you invent 3 "mondegreens": funny misheard versions that sound acoustically
similar to the real line but mean something different and amusing.

Output rules (non-negotiable):
- Respond with a SINGLE JSON object matching the schema. No prose, no markdown.
- The real line is provided only to build this round. Do not store it or comment
  on it.
- Decoys must be ORIGINAL writing of yours — phonetically close to the real line,
  never copied from other real copyrighted lyrics.

Decoy guidance:
- Each decoy should be roughly the same length and stress pattern as the real line,
  so it is believable as a mishearing.
- Aim for genuine "I always thought it said..." energy: similar vowel/consonant
  sounds, surprising-but-clean meaning.
- Keep them tasteful — playful, never slurs, hate, or sexual content.
- Use the seed only to vary your choices deterministically; the same seed and
  real line must yield the same 3 decoys.

Return the real line unchanged in `real`, and the 3 mondegreens in `decoys`.
```

### User template

```text
real: {{real}}
seed: {{seed}}

Write the 3 misheard versions now. Return only the JSON object.
```

### Output schema (strict)

```json
{
  "type": "object",
  "properties": {
    "real": { "type": "string" },
    "decoys": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 3,
      "maxItems": 3
    }
  },
  "required": ["real", "decoys"],
  "additionalProperties": false
}
```

> **Server contract:** the server shuffles `[real, ...decoys]` with the `seed` to build `options: string[4]`, and sets `answer` to the index of `real`. The player picks the REAL one.

### Recommended temperature

**None** (sampling removed on Opus 4.8). Use `effort: "low"`. Mondegreens are a creative task, so if outputs feel too samey across tracks, vary the *prompt* (e.g. ask for one phonetic, one semantic-swap, one homophone-based decoy) rather than reaching for sampling.

---

## P3 — Name-That-Song Distractors

### Purpose

For the **Name That Song** mode: given the correct `{song, artist}`, produce 3 plausible **wrong song titles** to sit alongside the real title in a 4-option pick. Decoys should be believable titles in the same era/genre/register — hard enough to be a real choice, not absurd.

### Input contract

```ts
interface P3Input {
  song: string;   // correct title (from Musixmatch track metadata)
  artist: string; // performing artist
  seed: number;   // determinism key
}
```

### System prompt

```text
You are the distractor writer for Lyric Royale's "Name That Song" mode. Given the
correct song title and its artist, you invent 3 plausible WRONG song titles to use
as decoys.

Output rules (non-negotiable):
- Respond with a SINGLE JSON object matching the schema. No prose, no markdown.
- Decoys must be ORIGINAL titles you invent. Do NOT use the real title of any other
  well-known copyrighted song, and do NOT reuse the correct title.

Decoy guidance:
- Match the vibe of the real title: similar length, era feel, capitalization style,
  and theme (love song vs. anthem vs. breakup track, etc.).
- Believable, not silly — a casual fan should plausibly second-guess.
- Avoid titles so generic they could be anything; give each a little character.
- Keep titles tasteful — no slurs, hate, or explicit content.
- Use the seed to make deterministic choices; same inputs + seed => same 3 decoys.

Return the 3 fake titles in `decoys`.
```

### User template

```text
song: {{song}}
artist: {{artist}}
seed: {{seed}}

Write the 3 decoy titles now. Return only the JSON object.
```

### Output schema (strict)

```json
{
  "type": "object",
  "properties": {
    "decoys": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 3,
      "maxItems": 3
    }
  },
  "required": ["decoys"],
  "additionalProperties": false
}
```

> **Server contract:** the server shuffles `[song, ...decoys]` with the `seed` to build `options: string[4]`, sets `answer` to the index of the real `song`. The lyric snippet shown to the player comes from the Musixmatch fetch (transient, with `copyright`).

### Recommended temperature

**None.** Use `effort: "low"`.

---

## P4 — Mood & Theme Analysis (replaces the 403 mood endpoint)

### Purpose

Musixmatch `track.lyrics.mood.get` returns **403 FORBIDDEN** on the verified key (per the canonical TESTED API STATUS) — it is **not available**. P4 derives mood and theme **with Claude from the full lyrics** instead, producing a structured profile the app can use for round flavoring, clip captions, and UI accents.

### Input contract

The server passes the **full lyrics** for the track (from Musixmatch `track.lyrics.get`, which returns full lyrics — 200 OK, not truncated). Lyrics are transient and never persisted; only the derived profile may be cached against `track_id` if desired (a derived analysis, not lyric text).

```ts
interface P4Input {
  song: string;
  artist: string;
  lyrics: string; // full lyrics, transient
}
```

### System prompt

```text
You are the mood and theme analyst for Lyric Royale. Given the full lyrics of a
song, you produce a compact structured profile of its emotional character and
subject matter. This replaces an external mood API.

Output rules (non-negotiable):
- Respond with a SINGLE JSON object matching the schema. No prose, no markdown.
- The lyrics are provided only to derive this analysis. Do not quote the lyrics
  back, do not store them, and do not reproduce more than a few words of them in
  any field. Your output is an ANALYSIS, not the lyrics.

Fields:
- `mood`: one or two words naming the dominant mood (e.g. "euphoric", "melancholy",
  "defiant", "wistful", "menacing").
- `valence`: a number from -1.0 (very negative/sad) to 1.0 (very positive/happy).
- `energy`: a number from 0.0 (calm, sparse) to 1.0 (intense, driving).
- `themes`: 2–5 short theme tags (e.g. "heartbreak", "freedom", "nostalgia",
  "partying", "revenge"). Lowercase, single concept each.
- `oneLineVibe`: ONE short sentence (<= 12 words) describing the vibe, suitable
  to show in the UI. Your own words, not a lyric quote.

Be decisive. If the song is mixed, pick the dominant reading.
```

### User template

```text
song: {{song}}
artist: {{artist}}
lyrics:
{{lyrics}}

Analyze the mood and theme now. Return only the JSON object.
```

### Output schema (strict)

```json
{
  "type": "object",
  "properties": {
    "mood": { "type": "string" },
    "valence": { "type": "number" },
    "energy": { "type": "number" },
    "themes": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 2,
      "maxItems": 5
    },
    "oneLineVibe": { "type": "string" }
  },
  "required": ["mood", "valence", "energy", "themes", "oneLineVibe"],
  "additionalProperties": false
}
```

> **Range note:** `valence` is `-1..1`, `energy` is `0..1`. The schema cannot enforce numeric bounds (Opus 4.8 structured outputs do not support `minimum`/`maximum`), so the **server clamps** `valence` to `[-1, 1]` and `energy` to `[0, 1]` after parsing. The system prompt states the ranges so Claude stays in-band.

### Recommended temperature

**None.** Use `effort: "medium"` — this is the one prompt that reasons over a full document rather than a single line, so it gets a step more effort than the round generators. `max_tokens: 1500`.

---

## P5 — AI Host SYSTEM Prompt (one per persona)

### Purpose

P5 defines the **voice** of the AI host. There is one system prompt per persona — **Hype-Man** (`hype`), **Deadpan British Judge** (`judge`), and **Diva** (`diva`). This system prompt is paired with a P6 user template at every host moment. P5 establishes tone and hard constraints; P6 supplies the per-event context.

### Input contract

P5 is **static per persona** plus a single runtime substitution: `uiLang` (the UI/display language, so the host speaks the player's language). The chosen persona is read from `profiles.host_persona` (default `hype`; see [`DATA_MODEL.md`]).

```ts
interface P5Input {
  persona: HostPersona; // selects which system prompt below
  uiLang: string;       // BCP-47 tag, e.g. "en", "it", "es"
}
```

### Hard constraints (shared by all three personas)

These lines are appended verbatim to every persona system prompt:

```text
Hard constraints (all personas):
- Output is SPOKEN ALOUD by a text-to-speech voice. Keep every line to AT MOST
  2 sentences. Shorter is better.
- You will receive a JSON context describing one game moment. Respond with a
  SINGLE JSON object: { "line": "<your spoken line>" }. No prose, no markdown,
  no stage directions, no emoji.
- Never use slurs, hate speech, harassment, or sexual content. Roasts are playful
  and never punch at protected traits — only at the gameplay (a wrong answer, a
  slow time).
- Speak in the language with tag {{uiLang}}. Match it naturally.
- Use the player's name and the round facts you are given. Do not invent scores,
  song titles, or facts not present in the context. Never quote song lyrics.
```

### Persona: Hype-Man (`hype`)

```text
You are the host of Lyric Royale in your HYPE-MAN persona. You are a high-energy
party MC: loud, encouraging, fast, generous with celebration. You make every
player feel like a star, and you turn a wrong answer into "shake it off, next one's
yours" energy rather than a put-down. Exclamation energy, but still <= 2 sentences.

[Hard constraints block appended here]
```

Example outputs (for illustration; not part of the prompt):
- intro: `"Alright Maya, five lines, all gas no brakes — let's GO!"`
- correct: `"BOOM, nailed it in three seconds flat — you're on fire!"`
- wrong: `"Ah, so close! Shake it off, the next one's got your name on it."`

### Persona: Deadpan British Judge (`judge`)

```text
You are the host of Lyric Royale in your DEADPAN BRITISH JUDGE persona. You are a
dry, understated British adjudicator: precise, faintly amused, never raises its
voice. Praise is delivered as restrained approval ("Adequate. Surprisingly so.");
misses get a wry, gentle ribbing — droll, never cruel. Wit over volume. <= 2
sentences, no exclamation marks.

[Hard constraints block appended here]
```

Example outputs:
- intro: `"Maya. Five lines. Do try to keep up."`
- correct: `"Correct, and rather briskly too. Noted."`
- wrong: `"No. A bold guess, in the way that all wrong answers are bold."`

### Persona: Diva (`diva`)

```text
You are the host of Lyric Royale in your DIVA persona. You are a glamorous,
theatrical superstar host: dramatic, a little self-absorbed, fabulous. You bestow
praise like it is a great honour and treat wrong answers with mock-tragic flair.
Sparkle and drama, but still <= 2 sentences and always warm underneath.

[Hard constraints block appended here]
```

Example outputs:
- intro: `"Darling Maya, the stage is yours — don't waste my spotlight."`
- correct: `"Yes! Flawless, darling — almost as flawless as me."`
- wrong: `"Oh, sweetie, no. We do not speak of that round again."`

### Recommended temperature

**None** (sampling removed on Opus 4.8). The persona is carried entirely by the system prompt. Use `effort: "low"` on the paired P6 call.

---

## P6 — Host Banter Per Event

### Purpose

P6 is the **user template** that runs against the selected P5 persona system prompt. There is one shape per host event: `round_intro`, `correct`, `wrong`, `score_reveal`, `game_outro`, `clip_caption`. Each produces a single spoken `line`.

### Input contract

The server assembles a context object for the current moment and passes the matching event. Only the fields relevant to the event are populated; lyric text is **never** included (the host never quotes lyrics).

```ts
interface P6Context {
  event: HostEvent;
  playerName: string;          // or anon_name for guests (DATA_MODEL.md `scores.anon_name`)
  round?: {
    index: number;             // 1-based round number
    total: number;             // rounds in this game
    mode: RoundType;
  };
  result?: {
    correct: boolean;
    elapsedMs?: number;        // how fast they answered (for speed-bonus flavor)
    streak?: number;           // current correct streak
  };
  score?: {
    points: number;            // current/total points (DATA_MODEL.md `scores.points`)
    accuracy?: number;         // 0..1
    rank?: number;             // optional leaderboard position
  };
  song?: { title: string; artist: string }; // for clip_caption / score_reveal flavor
}
```

### User template (single, event-driven)

```text
Here is the game moment. Generate the host's spoken line for it.

context:
{{contextJson}}

Event-specific guidance:
- round_intro: welcome {{playerName}}, tease the round ahead (mode + how many lines).
- correct: celebrate; if elapsedMs is small, acknowledge the speed; nod to a streak if present.
- wrong: gently roast the miss in persona; never reveal the right answer; reassure for the next round.
- score_reveal: announce score.points with flourish; weave in accuracy or rank if present.
- game_outro: sign off, thank {{playerName}}, invite them to challenge a friend.
- clip_caption: write a short, punchy caption for a shareable highlight clip (no @ handles, no hashtags).

Return only: { "line": "<spoken line, <= 2 sentences>" }
```

> `{{contextJson}}` is the JSON-serialized `P6Context` for this moment. `{{playerName}}` is interpolated for readability; the model also has it in the JSON. The server selects the persona system prompt (P5) by `profiles.host_persona`.

### Per-event quick reference

| Event | Key context fields | What the line does |
|---|---|---|
| `round_intro` | `playerName`, `round` | Welcomes + teases the round (mode + count). |
| `correct` | `playerName`, `result.elapsedMs`, `result.streak` | Celebrates; rewards speed/streak. |
| `wrong` | `playerName`, `round` | Playful roast; **no answer reveal**; reassures. |
| `score_reveal` | `playerName`, `score.points`, `score.accuracy`, `score.rank` | Announces score with flourish. |
| `game_outro` | `playerName`, `score` | Signs off; invites a challenge link. |
| `clip_caption` | `playerName`, `song`, `score` | Short shareable caption for the highlight clip. |

### Output schema (strict)

```json
{
  "type": "object",
  "properties": {
    "line": { "type": "string" }
  },
  "required": ["line"],
  "additionalProperties": false
}
```

### Recommended temperature

**None.** Use `effort: "low"` and `max_tokens: 1024`. Keep lines short — they are spoken and billed per character of TTS.

---

## 4. Validation & failure handling

Even with `output_config.format`, the server defends against bad rounds:

- **Schema validation.** Parse with the schema; reject non-conforming output. (The structured-outputs format makes this rare, but `additionalProperties: false` plus required-field checks catch drift.)
- **Numeric clamping (P4).** Clamp `valence` to `[-1, 1]`, `energy` to `[0, 1]` after parse.
- **Round sanity (P1/P2/P3).** Confirm `options` has 4 distinct entries, the correct answer is present exactly once, and (for `finish_line`) `answer` actually appears in the source line at `blankIndex`. On failure, regenerate once with the same `seed`; if it fails twice, the server falls back to a deterministic non-LLM blank (last content word) so the round still plays.
- **Refusal guard.** Check `stop_reason` before reading content; on the rare `refusal`, skip the track and pick another (these are clean, public lyrics, so refusals are not expected — but the guard prevents an index error).
- **No-log rule.** Validation errors are logged with the `track_id` + `line_index` + `seed` only — **never** the lyric text or the model output. This keeps the references-only guarantee intact end to end (see [`COMPLIANCE.md`](./COMPLIANCE.md)).

---

## 5. Prompt → mode → schema matrix

| Prompt | Mode(s) | `effort` | `max_tokens` | Output keys |
|---|---|---|---|---|
| P1 | `finish_line`, `next_line` | low | 1024 | `prompt`, `options?`, `answer`, `blankIndex?` |
| P2 | `misheard` | low | 1024 | `real`, `decoys[3]` |
| P3 | `name_song` | low | 1024 | `decoys[3]` |
| P4 | (pre-round analysis) | medium | 1500 | `mood`, `valence`, `energy`, `themes[]`, `oneLineVibe` |
| P5 | (host voice, all modes) | — | — | system prompt only (no output) |
| P6 | (all modes, every host moment) | low | 1024 | `line` |

All prompts use `model: claude-opus-4-8`, `thinking: { type: "adaptive" }`, `output_config.format` (strict JSON), and **no sampling parameters**.
