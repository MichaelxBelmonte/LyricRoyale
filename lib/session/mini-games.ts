import type { MiniGameId } from "@/lib/session/types";

// Each game belongs to one category, which drives its card accent + line-art.
export type MiniGameCategory = "lyrics" | "trivia" | "timing";

export interface MiniGameMeta {
  id: MiniGameId;
  name: string;
  blurb: string;
  /** One-line in-card example that shows the mechanic at a glance. */
  example: string;
  category: MiniGameCategory;
  /**
   * Optional raster art for the host picker card. When set, the card shows this
   * image instead of the built-in SVG line-art. Drop a PNG in public/games/ and
   * point here (e.g. "/games/finish_line.png") — no other change needed.
   */
  image?: string;
}

/** Category → display label + brand accent tone, used by the host picker cards. */
export const CATEGORY_META: Record<
  MiniGameCategory,
  { label: string; tagline: string; tone: "magenta" | "aqua" | "tangerine" }
> = {
  lyrics: { label: "Lyrics", tagline: "Know the words?", tone: "magenta" },
  trivia: { label: "Trivia", tagline: "Know the tracks?", tone: "aqua" },
  timing: { label: "Timing", tagline: "Got rhythm?", tone: "tangerine" },
};

// Categories in display order for the grouped picker.
export const MINI_GAME_CATEGORIES: MiniGameCategory[] = ["lyrics", "trivia", "timing"];

// Canonical catalog: single source of truth for rotation order AND the host
// picker labels. Order here is the order the autopilot cycles through.
export const MINI_GAME_CATALOG: MiniGameMeta[] = [
  { id: "finish_line", name: "Finish the Line", blurb: "Tap the missing last word.", example: "“…and I will always love ___”", category: "lyrics", image: "/games/finish_line.png" },
  { id: "mondegreen", name: "Misheard", blurb: "Spot the real lyric among the mondegreens.", example: "“Hold me closer, Tony Danza” — real or misheard?", category: "lyrics", image: "/games/mondegreen.png" },
  { id: "the_drop", name: "The Drop", blurb: "Hit the word as the lyric lands.", example: "tap ▶ right on the drop", category: "timing", image: "/games/the_drop.png" },
  { id: "on_beat", name: "On The Beat", blurb: "Lock the word right as the beat hits — timing scores.", example: "lock the word on the beat", category: "timing", image: "/games/on_beat.png" },
  { id: "song_mash", name: "Who Said It", blurb: "Which track dropped this line?", example: "“…” → which song?", category: "trivia", image: "/games/song_mash.png" },
  { id: "next_line", name: "Next Line", blurb: "Pick the line that comes next.", example: "pick the line that comes next", category: "lyrics", image: "/games/next_line.png" },
  { id: "name_song", name: "Name That Song", blurb: "Match the lyric to its track.", example: "match the lyric to its title", category: "trivia", image: "/games/name_song.png" },
  { id: "artist_pick", name: "Artist Lock", blurb: "Pick the artist behind the lyric.", example: "“…” → whose lyric?", category: "trivia", image: "/games/artist_pick.png" },
  { id: "word_rush", name: "Word Rush", blurb: "Pick the recurring keyword.", example: "spot the word that repeats most", category: "timing", image: "/games/word_rush.png" },
];

// Façade-only entries shown in the host gallery as "Coming soon". They are NOT
// MiniGameId values and never enter the rotation — purely for the demo/pitch feel.
export interface ComingSoonGame {
  id: string;
  name: string;
  blurb: string;
}

export const COMING_SOON_GAMES: ComingSoonGame[] = [
  { id: "stem_heist", name: "Stem Heist", blurb: "Guess the song from one isolated stem." },
  { id: "beat_roulette", name: "Beat Roulette", blurb: "BEATBOT spins up a fresh beat to play on." },
  { id: "karaoke_clash", name: "Karaoke Clash", blurb: "Sing the line — pitch & timing scored." },
  { id: "rap_battle", name: "Rap Battle", blurb: "Fill the bar before the beat drops." },
];

export const ALL_MINI_GAME_IDS: MiniGameId[] = MINI_GAME_CATALOG.map((meta) => meta.id);

const KNOWN_IDS = new Set<string>(ALL_MINI_GAME_IDS);

// Validate + de-duplicate + force canonical order, dropping anything unknown.
export function orderMiniGames(ids: readonly MiniGameId[]): MiniGameId[] {
  const wanted = new Set<string>((ids ?? []).filter((id) => KNOWN_IDS.has(id)));
  return MINI_GAME_CATALOG.filter((meta) => wanted.has(meta.id)).map((meta) => meta.id);
}
