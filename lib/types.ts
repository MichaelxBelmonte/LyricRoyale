// Shared types. Per COMPLIANCE: these values flow through the app transiently
// for real-time display and are NEVER persisted (the MVP has no database).

export interface TrackSummary {
  trackId: number;
  trackName: string;
  artistName: string;
  hasLyrics: boolean;
  hasRichsync: boolean;
}

export interface SearchResponse {
  results: TrackSummary[];
}
