# Mini-game card art — generation spec

The host mini-game picker ships with built-in **SVG line-art** (`components/session/MiniGameArt.tsx`).
This doc is for replacing those with **raster images** generated in **ElevenLabs → Image & Video**
(beta, UI only — there is no image API, so generation is manual) or any other image tool
(ChatGPT/DALL·E, Midjourney…).

When images exist, the card uses them automatically — see **Wiring** at the bottom.

## Output settings (same for all 9)

- **Aspect ratio:** `1:1` (square). The card crops to a banner with `object-cover`, so keep the
  subject **centered** with breathing room at top/bottom.
- **Size:** `1024 × 1024` PNG (transparent or dark background — see style).
- **Format:** PNG.
- **Keep them consistent:** generate all 9 from the **same base style prompt**, changing only the
  subject line. This is what makes the gallery feel like one set.

## Base style prompt (paste before every subject)

> Minimal neon line-art icon, Y2K cassette / synth aesthetic, on a near-black background (#0b0b0b).
> Single glowing accent color: **{ACCENT}**. Thin clean strokes with a soft neon glow, flat vector
> look, centered composition, generous padding, lots of negative space. **No text, no letters, no
> numbers, no words.** No realistic photo, no 3D render, no gradients on the background. High
> contrast, crisp edges. Square 1:1.

Replace `{ACCENT}` with the game's category color:

| Category | Accent color | Hex |
|----------|--------------|-----|
| Lyrics   | magenta      | `#ff007f` |
| Trivia   | aqua         | `#00e5d2` |
| Timing   | tangerine    | `#ff6402` |

## Per-game subject + filename

Save each as `public/games/<id>.png` (the filename **must** match the `id`).

| Filename (`id`)          | Game            | Accent     | Subject prompt |
|--------------------------|-----------------|------------|----------------|
| `finish_line.png`        | Finish the Line | magenta    | Three short horizontal lyric lines, the last word replaced by a glowing dashed blank box waiting to be filled. |
| `mondegreen.png`         | Misheard        | magenta    | A stylized ear with two overlapping, slightly mismatched sound waves and a faint question mark — the feeling of mishearing a lyric. |
| `next_line.png`          | Next Line       | magenta    | Two stacked lyric lines with a downward arrow pointing to a third, highlighted line below — "what comes next". |
| `song_mash.png`          | Who Said It     | aqua       | A speech bubble containing bold quotation marks — an unattributed quoted line. |
| `name_song.png`          | Name That Song  | aqua       | A spinning vinyl record with a single music note rising from it. |
| `artist_pick.png`        | Artist Lock     | aqua       | A retro stage microphone with a soft spotlight glow. |
| `the_drop.png`           | The Drop        | tangerine  | An audio waveform / equalizer building up to a big peak, with a glowing marker pinned at the drop moment. |
| `on_beat.png`            | On The Beat     | tangerine  | A metronome caught mid-swing, with a couple of pulsing beat dots. |
| `word_rush.png`          | Word Rush       | tangerine  | A stopwatch with fast motion / speed lines streaking past it — urgency and speed. |

## Wiring (after you have the PNGs)

1. Drop the 9 files in `public/games/`.
2. In `lib/session/mini-games.ts`, add `image: "/games/<id>.png"` to each catalog entry, e.g.

   ```ts
   { id: "finish_line", name: "Finish the Line", blurb: "...", category: "lyrics", image: "/games/finish_line.png" },
   ```

   The card checks `game.image` first and falls back to the SVG when it's absent — so you can add
   them one at a time and mix images with line-art while you fill out the set.

(Ask Claude to do step 2 once the files are in `public/games/`.)
