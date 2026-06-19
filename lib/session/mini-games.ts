import type { MiniGameId } from "@/lib/session/types";

// Each game belongs to one category, which drives its card accent + line-art.
export type MiniGameCategory = "lyrics" | "trivia" | "timing";

export interface MiniGameMeta {
  id: MiniGameId;
  name: string;
  blurb: string;
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
  { label: string; tone: "magenta" | "aqua" | "tangerine" }
> = {
  lyrics: { label: "Lyrics", tone: "magenta" },
  trivia: { label: "Trivia", tone: "aqua" },
  timing: { label: "Timing", tone: "tangerine" },
};

// Canonical catalog: single source of truth for rotation order AND the host
// picker labels. Order here is the order the autopilot cycles through.
export const MINI_GAME_CATALOG: MiniGameMeta[] = [
  { id: "finish_line", name: "Finish the Line", blurb: "Tap the missing last word.", category: "lyrics" },
  { id: "mondegreen", name: "Misheard", blurb: "Spot the real lyric among the mondegreens.", category: "lyrics" },
  { id: "the_drop", name: "The Drop", blurb: "Hit the word as the lyric lands.", category: "timing" },
  { id: "on_beat", name: "On The Beat", blurb: "Lock the word right as the beat hits — timing scores.", category: "timing" },
  { id: "song_mash", name: "Who Said It", blurb: "Which track dropped this line?", category: "trivia" },
  { id: "next_line", name: "Next Line", blurb: "Pick the line that comes next.", category: "lyrics" },
  { id: "name_song", name: "Name That Song", blurb: "Match the lyric to its track.", category: "trivia" },
  { id: "artist_pick", name: "Artist Lock", blurb: "Pick the artist behind the lyric.", category: "trivia" },
  { id: "word_rush", name: "Word Rush", blurb: "Pick the recurring keyword.", category: "timing" },
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
