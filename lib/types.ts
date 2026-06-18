// Shared contracts used by route handlers and client components.
// Musixmatch-derived values are transient display data in the MVP; do not persist them.

export type Locale = "en" | "it";

export interface TrackSummary {
  trackId: number;
  trackName: string;
  artistName: string;
  hasLyrics: boolean;
  hasRichsync: boolean;
}

export interface SingerTeam {
  playerName: string;
  teamName: string;
  artists: string[];
}

export interface TrackingLinks {
  pixel: string | null;
  script: string | null;
}

// Richsync timing for "The Drop": the line karaoke-highlights word-by-word toward
// the blank. Contains ONLY the prefix tokens (before the blank) — never the answer
// word — plus the offset where the blank lands. Present only when a richsync line
// matches the chosen lyric line; otherwise the round plays with a static blank.
export interface FinishLineDrop {
  tokens: RichsyncToken[];
  dropOffset: number;
  lineDuration: number;
}

export interface FinishLineRound {
  trackId: number;
  seed: number;
  prompt: string;
  copyright: string;
  tracking: TrackingLinks;
  drop?: FinishLineDrop;
}

export interface RichsyncToken {
  text: string;
  offset: number;
}

export interface RichsyncLine {
  start: number;
  end: number;
  text: string;
  tokens: RichsyncToken[];
}

export interface RichsyncPreview {
  trackId: number;
  line: RichsyncLine;
  copyright: string;
  tracking: TrackingLinks;
}

export interface SearchResponse {
  query: string;
  results: TrackSummary[];
}

export interface TrackResponse {
  track: TrackSummary;
}

export interface FinishLineResponse {
  round: FinishLineRound;
}

// Server-side answer check — the answer never ships in the round payload; the
// client submits a guess and the server validates it and reveals the answer
// only at resolution.
export interface CheckResponse {
  correct: boolean;
  answer: string;
}

export interface RichsyncResponse {
  preview: RichsyncPreview;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}
