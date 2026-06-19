import type { MiniGameId } from "@/lib/session/types";

export interface MiniGameMeta {
  id: MiniGameId;
  name: string;
  blurb: string;
}

// Canonical catalog: single source of truth for rotation order AND the host
// picker labels. Order here is the order the autopilot cycles through.
export const MINI_GAME_CATALOG: MiniGameMeta[] = [
  { id: "finish_line", name: "Finish the Line", blurb: "Tap the missing last word." },
  { id: "mondegreen", name: "Misheard", blurb: "Spot the real lyric among the mondegreens." },
  { id: "the_drop", name: "The Drop", blurb: "Hit the word as the lyric lands." },
  { id: "on_beat", name: "On The Beat", blurb: "Lock the word right as the beat hits — timing scores." },
  { id: "song_mash", name: "Who Said It", blurb: "Which track dropped this line?" },
  { id: "next_line", name: "Next Line", blurb: "Pick the line that comes next." },
  { id: "name_song", name: "Name That Song", blurb: "Match the lyric to its track." },
  { id: "artist_pick", name: "Artist Lock", blurb: "Pick the artist behind the lyric." },
  { id: "word_rush", name: "Word Rush", blurb: "Pick the recurring keyword." },
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
