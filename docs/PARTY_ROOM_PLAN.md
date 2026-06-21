# Soundclash Party Room Plan

Soundclash is a shared-screen party game: one host device creates the room,
players join on phones, and BEATBOT runs an almost automatic lyric show.

The room experience must follow the cassette/Y2K visual system in
[`BRAND_SYSTEM.md`](./BRAND_SYSTEM.md): host screen as TV stage, phone as fast
controller, lyric prompts as J-card/tape-label surfaces, scores and timers as
LED/CRT elements.

## Current Skeleton

Implemented routes:

| Route | Purpose |
|---|---|
| `/` | Branded Soundclash entry: cassette/J-card hero, create session, join session, or open the solo lab. |
| `/host/new` | Creates a room and selects an ElevenLabs voice preset and narrator language. |
| `/host/[code]` | Shared-screen TV stage: join code, players, setlist deck, host-selected mini-game set, round display, scoreboard. |
| `/join` | Phone join form; should become a compact J-card/tape-label screen. |
| `/player/[code]` | Phone controller: tap answers, see locked state, personal score and round results. |
| `/solo` | Existing single-player/ghost-duel lab kept for iteration. |

Implemented API surface:

| Endpoint | Purpose |
|---|---|
| `POST /api/sessions` | Create an in-memory party room. |
| `GET /api/sessions/[code]` | Poll public room state. |
| `PATCH /api/sessions/[code]` | Reveal results or return to lobby. |
| `POST /api/sessions/[code]/join` | Join a room as a phone player. |
| `POST /api/sessions/[code]/round` | Host starts or auto-advances a guided round from a Musixmatch track reference. |
| `PATCH /api/sessions/[code]/round` | Player submits an answer; server validates and scores it. |
| `GET /api/mxm/tracks` | Setlist sourcing: top tracks for an `artist` name or a `genreId`. |
| `GET /api/mxm/genres` | Musixmatch genre list (server proxy). |

The skeleton uses a server-side in-memory store in `lib/server/session-store.ts`.
That is intentional for the first cut: it proves the room flow without adding
database complexity. The API shape is designed so this can be replaced by
Supabase tables + Realtime Broadcast/Presence.

## Guided Show Mode

The host should do as little as possible. The current room flow is:

1. Host creates a room and picks the host voice and narrator language.
2. Players join from phones.
3. Host builds a setlist (up to 8 tracks) by **artist**, **genre**, or **song**
   search — curated quick-pick chips one-tap-load a deck, or **Surprise me** seeds
   one — and selects which mini-games run.
4. Host taps **Start show** once; the session rotates the chosen mini-games over a
   host-selected set of **3, 6, or 9 rounds** (default 6).
5. A round reveals automatically when every player answers, or when the timer expires.
6. Results stay on screen briefly, then the next round starts automatically.

Current automatic mini-games (the canonical catalog in `lib/session/mini-games.ts`):

| Mini-game | Category | Input | Data source |
|---|---|---|---|
| Finish the Line | Lyrics | Multiple choice | Musixmatch lyrics, server-side answer validation. |
| Misheard | Lyrics | Multiple choice | Musixmatch lyrics, real line among generated mondegreens. |
| Next Line | Lyrics | Multiple choice | Musixmatch lyrics, deterministic line/options builder. |
| The Drop | Timing | Multiple choice | Musixmatch lyrics + richsync timing when available, animated TV prompt. |
| On The Beat | Timing | Multiple choice | Musixmatch lyrics + richsync timing; lock the word on the beat, proximity scored. |
| Word Rush | Timing | Multiple choice | Transient lyric keyword analysis, no lyric storage. |
| Who Said It | Trivia | Multiple choice | Musixmatch lyrics + track deck from the setlist. |
| Name That Song | Trivia | Multiple choice | Musixmatch lyrics + track deck from the setlist. |
| Artist Lock | Trivia | Multiple choice | Musixmatch lyrics + artist deck from the setlist. |

The host picks which of these run in the room; the session shuffles the chosen
set into a rotation and draws from it without repeats within a cycle. The Drop
and On The Beat need richsync timing and degrade gracefully when a track lacks
it. Four façade-only "coming soon" cards (Stem Heist, Beat Roulette, Karaoke
Clash, Rap Battle) appear in the gallery but never enter the rotation.

The host voice is wired through ElevenLabs and can speak room intros, round
transitions, reveal lines, leaders, and final-score moments. The host picks one
of 29 narrator languages at room creation (`lib/game/languages.ts`); the banter
pack BEATBOT reads is localized into that language — English and Italian ship as
built-in static packs, while any other language is generated once by Claude
(`lib/server/anthropic.ts`) and cached, falling back to English if Claude is
unavailable. The picked code is sent to ElevenLabs as `language_code`.

The global soundtrack is also wired. A personalized ElevenLabs Music v2 signature
with a short original vocal hook powers the home waveform:
`soundclash-signal-full.mp3`. LALAL.AI has split that same signature into
`soundclash-signal-vocals.mp3` and `soundclash-signal-backing.mp3`, which are
stored as static assets for the Signal Check entry mini-game. The home currently
uses only the full mix to keep the first screen minimal. Round screens use
`soundclash-clash.mp3`. The browser tries to start automatically, then falls
back to the first tap if autoplay is blocked. Once enabled, audio can be stopped
immediately and ducks while BEATBOT speaks.

## Compliance Position

The room state stores gameplay references and transient session data. It does not
persist lyric text, richsync payloads, or lyric snippets beyond the active
in-memory round. The server keeps the solution only long enough to validate
answers, omits it from public state while players are answering, and reveals it
only after the round resolves.

## Target Architecture

| Layer | Responsibility |
|---|---|
| Host screen | TV stage, LED code/QR, player lobby, guided mini-game set, J-card lyric display, CRT scoreboard. |
| Player controller | Phone input only: nickname, large tap targets, locked state, personal feedback. |
| Session service | Room lifecycle, player list, active round refs, answer submission, scoring. |
| Musixmatch proxy | Track search, live lyrics, richsync timing, copyright/tracking. |
| ElevenLabs proxy | Host voice presets, custom voice creation, spoken round events. |
| LALAL.AI proxy | Optional audio/stem mini-games after the room loop is stable. |

## Audio Provider Lab

`/solo/providers` is the safe test surface for external audio APIs:

| Surface | Endpoint | Notes |
|---|---|---|
| ElevenLabs host speech | `POST /api/host/speak` | Server-side TTS proxy. Accepts `text`, `preset`, optional `voiceId`, optional `languageCode` (one of the 29 supported), and returns `audio/mpeg`. |
| ElevenLabs soundtrack pack | `npm run soundtrack:generate` | Server-side Music v2 generation script. Writes reusable MP3 loops into `public/audio`; never runs on page load. |
| ElevenLabs + LALAL signature | `npm run soundtrack:signature` | Generates `soundclash-signal-full.mp3`, uploads it to LALAL, then stores vocal/backing split assets. |
| LALAL.AI stem split | `POST /api/lalal/stems` | Multipart audio upload. Uploads to LALAL v1 and starts a stem-separation task. |
| LALAL.AI task status | `GET /api/lalal/stems/[taskId]` | Polls LALAL v1 `/check/` and returns progress or processed track URLs. |

The current LALAL mini-game is **Stem Guess Lab**: upload a short audio clip,
split a stem, then play a blind round where the player guesses whether the
secret audio is the extracted stem or the backing track.

## Next Build Order

1. Replace polling with Supabase Realtime Broadcast + Presence.
2. Add room persistence tables: sessions, players, rounds, answers, scores.
3. Add QR code on host screen as a branded cassette/LED element.
4. Convert host/player room UI to the Soundclash brand system.
5. Add generated reveal/correct/wrong stingers and wire them to round events.
6. Add a home-entry **Signal Check** micro-game: the app plays full mix, vocal,
   or backing; the player taps the correct layer before starting a room.
7. Promote the in-memory mini-game registry into a reusable module with tests.
8. Add custom session voice flow with ElevenLabs IVC.
9. Promote Stem Guess Lab into a multiplayer room mini-game.

Done since this plan was written: search seeding was replaced by guided setlist
sourcing — the host builds the deck by artist, genre, or song search (item 10).

## LALAL.AI Mini-Game Ideas

| Mini-game | LALAL use |
|---|---|
| Instrumental Guess | Split vocal/backing; players guess the song from backing track. |
| Vocal Drop | Use isolated vocal + richsync timing for timing/recognition rounds. |
| Stem Showdown | Reveal stems one at a time; fewer stems used = higher score. |

These should remain optional until the shared room loop, Musixmatch gameplay, and
ElevenLabs host are polished.
