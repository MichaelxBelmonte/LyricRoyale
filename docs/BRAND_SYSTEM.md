# Soundclash Brand System

Soundclash should feel like a premium Y2K music party object: a cassette, a J-card,
a sticker sheet, and an arcade scoreboard collided into a fast social game. The shipped brand assets live in `public/brand/`
(`logomark.png`, `wordmark.png`, `mascot.png`, `intro.mp4`).

## Brand Position

| Attribute | Direction |
|---|---|
| Product name | Soundclash |
| One-liner | Press play. Pick a fight. |
| Category | Music party game for lyric lovers |
| Tone | Competitive, playful, tactile, high-energy |
| Core visual object | Cassette + J-card + sticker sheet |
| Host persona | BEATBOT, the cassette AI host |

## Palette

These are the actual tokens in `tailwind.config.ts`. The app renders on a warm
light "editorial paper" canvas, not on black.

| Token | Hex | Role |
|---|---:|---|
| `ink` | `#15120E` | Primary text, dot-grid, bezels, dark panels |
| `cream` | `#F4ECD8` | Tape-beige; same value as the `paper` canvas |
| `brand` (`brand.500`) | `#C2563B` | Primary terracotta CTA, active state, danger/tension |
| `tangerine` (`tangerine.500`) | `#D99A3C` | Secondary ochre accent, LED readouts, reward highlights |
| `aqua` (`aqua.500`) | `#2E7D6B` | Teal contrast: links, player/rival, secondary hover |
| `yellow` | `#ffd400` | Sticker/reward highlights |
| `chrome` | `#aab0ba` | Metallic button finish (with `chrome.light`/`chrome.dark`) |

The `brand`, `tangerine`, and `aqua` families each ship 300/400/500/600 steps
(`brand` adds a 700 `#7E3623`); `500` is the DEFAULT in every case.

A separate `paper` token family defines the light surfaces:

| Token | Hex | Role |
|---|---:|---|
| `paper` (DEFAULT) | `#F4ECD8` | App canvas |
| `paper.raised` | `#FBF6EA` | Cards/panels lifted above the canvas |
| `paper.sunken` | `#EADFC4` | Recessed secondary fills |
| `paper.line` | `#E3D5B6` | Hairline borders |

Use the palette as high-contrast blocks, not soft gradients everywhere. `ink`
surfaces should feel like plastic, vinyl, CRT, or stage equipment; `paper`/`cream`
surfaces should feel like printed paper or tape labels.

## Material Language

| Material | Use |
|---|---|
| Cream J-card paper | Home hero, setup forms, lyric prompt cards, rules panels |
| Clear plastic | Room shell, modal/overlay frames, cassette cases |
| Chrome metal | Primary buttons, logo accents, premium action surfaces |
| Holographic foil | Rare emphasis: winner reveal, final score, logo sheen |
| Glossy vinyl | Dark panels, scoreboards, host screen stage |
| Magnetic tape | Dividers, progress lines, round timeline |
| CRT scanlines | Timers, LED boards, TV host moments |
| Sticker sheet | Badges, VS marks, state labels, mini-game tags |

## Sound Direction

The product sound should match the visual object: cassette texture, chrome synths,
arcade percussion, tight bass, and a short original Soundclash vocal hook. Use
generated static assets, not live per-page generation.

Current static assets are generated with ElevenLabs Music v2 (`music_v2`, output
format `auto`) and stored as MP3 assets:

| Asset | Use |
|---|---|
| `/audio/soundclash-signal-full.mp3` | Personalized home signature and waveform. |
| `/audio/soundclash-signal-vocals.mp3` | LALAL vocal split for Signal Check. |
| `/audio/soundclash-signal-backing.mp3` | LALAL backing split for Signal Check. |
| `/audio/soundclash-mixtape.mp3` | Legacy/setup instrumental loop. |
| `/audio/soundclash-clash.mp3` | Host/player/solo round energy. |

The global `AudioDirector` keeps playback opt-in and ducks under BEATBOT voice
events. The home waveform is an attract-mode surface: it animates immediately,
uses real analyser data once the soundtrack is playing, and exposes one
play/stop interaction. Do not show the separated stems on the home hero unless
they become an explicit Signal Check game step.

## Typography

| Type role | Implementation |
|---|---|
| Product wordmark | Image asset at `/public/brand/wordmark.png` |
| Condensed display | `font-condensed` for tape labels and punchy headings |
| Marker handwriting | `font-marker` only for short J-card scribbles |
| Mono/technical | `font-mono` for scores, timers, room codes, metadata |
| Body | `font-sans` for readable instructions and forms |

Keep large text short. The mood board works because labels are punchy:
`MIX IT.`, `CLASH IT.`, `OWN THE PLAYLIST.`, `ROUND 2`, `TIME LEFT`.

## UI Components

| Component | Current source | Direction |
|---|---|---|
| Logo | `components/brand/Logo.tsx` | Use on all persistent navigation surfaces. |
| Home logo | `components/brand/HomeLogo.tsx` | Small fixed return link for utility screens. |
| J-card | `components/brand/JCard.tsx` | Preferred container for setup, onboarding, and lyric cards. |
| Sticker | `components/brand/Sticker.tsx` | Use for badges and playful state, not long copy. |
| Tape divider | `components/brand/TapeDivider.tsx` | Use for section rhythm and progress breaks. |
| LED | `components/brand/Led.tsx` | Use for timers, scores, room codes, final reveals. |
| Intro | `components/brand/BrandIntro.tsx` | First-session brand moment; must stay skippable. |
| Audio director | `components/audio/AudioDirector.tsx` | Global soundtrack control, route-aware initial loop, voice ducking. |
| Home waveform | `components/audio/HomeWaveform.tsx` | Interactive animated signal for the Soundclash theme. |

## Screen Guidance

### Home

The home screen should be a brand object, not a marketing page. The first viewport
should show the Soundclash wordmark, a playable intent, and the cassette/J-card
material language.

### Host Screen

The host screen is the TV stage. It should prioritize:

- Room code as a large LED/cassette-label element.
- Join link or QR as a secondary utility.
- Mini-game title as a sticker or tape label.
- Lyric prompt as a cream J-card or cassette insert.
- Scoreboard as a black LED/CRT panel.
- BEATBOT voice events as part of the show, not explanatory UI text.

### Player Controller

The phone should be fast, sparse, and tactile:

- One obvious tap per round.
- Large option buttons.
- Minimal instructions.
- Locked state before reveal.
- Personal score and room code always visible.

### Provider Lab

Labs can be more utilitarian, but still use Soundclash headers, dark vinyl panels,
and concise labels. Labs are not the main demo experience.

## Do / Avoid

Do:

- Use real brand assets from `/public/brand`.
- Use the mood-board palette as high-contrast blocks.
- Use J-cards for lyric/show content.
- Use LED styling for timers and scores.
- Keep phone actions tap-first.
- Keep Musixmatch attribution visible wherever lyrics render.

Avoid:

- Generic neutral dashboard styling on primary game screens.
- Long explanatory paragraphs inside the app UI.
- Emoji as UI icons; use brand stickers, assets, or the shared icon component.
- Overusing gradients where a material surface would be clearer.
- Large rounded cards nested inside other cards.
- Persisting or caching Musixmatch lyric content.

## Next Brand Alignment Tasks

1. Convert `/host/[code]` round view into a TV cassette stage.
2. Convert `/player/[code]` choices into tactile tape-label buttons.
3. Convert `/host/new` and `/join` into compact J-card setup screens.
4. Replace text emoji/symbols with brand assets or shared icons.
5. Optimize brand assets before public demo: mascot, wordmark, OG image, intro.
6. Build Signal Check from the existing LALAL stems: identify vocal hook,
   backing track, or full mix before entering a room.
7. Add short reveal/correct/wrong stingers from the same sound palette.
