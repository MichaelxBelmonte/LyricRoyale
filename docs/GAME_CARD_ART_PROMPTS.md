# Mini-game card art — generation spec

The host mini-game picker ships with built-in **SVG line-art** (`components/session/MiniGameArt.tsx`).
This doc is for replacing those with **raster images** generated in any image tool
(ElevenLabs → Image & Video — beta, UI only; ChatGPT/DALL·E; Midjourney…).

When images exist, the card uses them automatically — see **Wiring** at the bottom.

> Style note: the brand is now **"Warm editorial"** (retro cassette / mixtape J-card —
> cream paper, paper grain, faint scanlines, die-cut stickers). The art is a flat two-tone
> screen-print look, **not** neon. One warm accent color per category, on warm cream paper.

## Output settings (same for all)

- **Aspect ratio:** `1:1` (square). The card crops to a banner with `object-cover`, so keep the
  subject **centered** with breathing room at top/bottom.
- **Size:** `1024 × 1024` PNG.
- **Keep them consistent:** generate every card from the **same base style prompt**, changing only
  the subject line. That's what makes the gallery feel like one cohesive set of cassette stickers.

## Base style prompt (paste before every subject)

> Minimalist screen-print / risograph icon, warm retro-editorial mixtape aesthetic. A single clean
> subject drawn in slightly hand-inked strokes in one accent color **{ACCENT}**, on a warm cream
> paper background (#F4ECD8) with subtle paper grain and very faint horizontal scanlines. Flat
> two-tone look (accent + cream), bold and friendly, die-cut sticker feel. Centered composition,
> generous padding, lots of negative space. **No text, no letters, no numbers, no words.** No neon,
> no glow, no 3D render, no photograph, no background gradient. Crisp, high-contrast edges. Square 1:1.

Replace `{ACCENT}` with the game's category color:

| Category    | Accent       | Hex       |
|-------------|--------------|-----------|
| Lyrics      | terracotta   | `#C2563B` |
| Trivia      | pine teal    | `#2E7D6B` |
| Timing      | amber ochre  | `#D99A3C` |
| Coming soon | warm charcoal (monochrome — reads as "locked") | `#15120E` |

## Per-game subject + filename

Save each as `public/games/<id>.png` (the filename **must** match the `id`).

### Live games (9)

| Filename (`id`)     | Game            | Accent      | Subject prompt |
|---------------------|-----------------|-------------|----------------|
| `finish_line.png`   | Finish the Line | terracotta  | Three short horizontal lyric lines; the last word is a dashed blank box waiting to be filled in. |
| `mondegreen.png`    | Misheard        | terracotta  | A stylized ear with two overlapping, slightly mismatched sound waves and a small question mark — the feeling of mishearing a lyric. |
| `next_line.png`     | Next Line       | terracotta  | Two stacked lyric lines with a downward arrow pointing to a third, highlighted line below — "what comes next". |
| `song_mash.png`     | Who Said It     | pine teal   | A speech bubble holding a pair of bold quotation marks — an unattributed quoted line. |
| `name_song.png`     | Name That Song  | pine teal   | A spinning vinyl record with a single music note rising from it. |
| `artist_pick.png`   | Artist Lock     | pine teal   | A retro stage microphone under a soft spotlight cone. |
| `the_drop.png`      | The Drop        | amber ochre | An equalizer / waveform building up to one big peak, with a pin marker at the drop moment. |
| `on_beat.png`       | On The Beat     | amber ochre | A metronome caught mid-swing, with a couple of pulsing beat dots. |
| `word_rush.png`     | Word Rush       | amber ochre | A stopwatch with fast motion / speed lines streaking past it — urgency and speed. |

### Coming soon (3 — facade cards, monochrome to read as "locked")

| Filename (`id`)      | Game           | Accent         | Subject prompt |
|----------------------|----------------|----------------|----------------|
| `stem_heist.png`     | Stem Heist     | warm charcoal  | A stack of horizontal waveform layers with one single layer lifted out and highlighted — isolating one stem. |
| `karaoke_clash.png`  | Karaoke Clash  | warm charcoal  | A handheld microphone with a karaoke pitch curve / bouncing-ball line rising beside it. |
| `rap_battle.png`     | Rap Battle     | warm charcoal  | Two crossed stage microphones facing off, with a small speech bubble between them. |

(Dropped `beat_roulette` — vaguest concept of the four; trim `COMING_SOON_GAMES` to these three.)

## Wiring (after you have the PNGs)

1. Drop the files in `public/games/`.
2. In `lib/session/mini-games.ts`, add `image: "/games/<id>.png"` to each catalog entry, e.g.

   ```ts
   { id: "finish_line", name: "Finish the Line", blurb: "...", category: "lyrics", image: "/games/finish_line.png" },
   ```

   The card checks `game.image` first and falls back to the SVG when it's absent — so you can add
   them one at a time and mix images with line-art while you fill out the set.

(Ask Claude to do step 2 once the files are in `public/games/`.)
