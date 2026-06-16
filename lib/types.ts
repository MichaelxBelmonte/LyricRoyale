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

export interface SearchResponse {
  query: string;
  results: TrackSummary[];
}

export interface ErrorResponse {
  error: string;
  code?: string;
}
