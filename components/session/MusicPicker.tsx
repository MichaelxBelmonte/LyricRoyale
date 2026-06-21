"use client";

import { useState, type FormEvent } from "react";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import Icon from "@/components/ui/Icon";
import { CURATED_ARTISTS } from "@/lib/game/artists";
import type { MiniGameId } from "@/lib/session/types";
import type { ErrorResponse, SearchResponse, TrackSummary, TracksResponse } from "@/lib/types";

// Games that need word-synced lyrics, and games that need a varied pool of distinct
// tracks. Used only to surface ONE short readiness hint — not a checklist.
const RICHSYNC_GAMES = new Set<MiniGameId>(["the_drop", "on_beat"]);
const VARIETY_GAMES = new Set<MiniGameId>(["name_song", "song_mash", "artist_pick", "next_line"]);
const VARIETY_MIN = 4;
const AUTO_SEED = "queen";

const SEARCH_LABELS = {
  searchLabel: "Song or artist search",
  searchPlaceholder: "Search a song or artist…",
  searchButton: "Search",
  searchingButton: "Searching",
};

const RESULT_LABELS = {
  emptyState: "Search above, or just tap Surprise me.",
  noResults: "No matching tracks found.",
  resultsTitle: "Tap to add",
  resultMeta: "Live Musixmatch result",
  playButton: "Add",
  loadingRound: "Adding",
  richsyncBadge: "synced",
  lyricsBadge: "lyrics",
};

interface MusicPickerProps {
  deck: TrackSummary[];
  selectedGames: MiniGameId[];
  onToggle: (track: TrackSummary) => void;
  onAddMany: (tracks: TrackSummary[]) => void;
}

/**
 * Minimal, guided track picker. One primary path ("Surprise me"), one search, and a
 * few suggested artists — no source tabs, no genre grid, no checklist. The setlist
 * shows a single readiness hint so the host is nudged, not lectured.
 */
export default function MusicPicker({ deck, selectedGames, onToggle, onAddMany }: MusicPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTracks(url: string): Promise<TrackSummary[]> {
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as Partial<(SearchResponse & TracksResponse) & ErrorResponse>;
      if (!response.ok) throw new Error(payload.error ?? "Search failed");
      const found = payload.results ?? [];
      setResults(found);
      return found;
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
      return [];
    } finally {
      setLoading(false);
    }
  }

  function submitQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    void fetchTracks(`/api/mxm/search?q=${encodeURIComponent(q)}`);
  }

  function loadArtist(name: string) {
    if (loading) return;
    setQuery(name);
    void fetchTracks(`/api/mxm/tracks?artist=${encodeURIComponent(name)}`);
  }

  function surprise() {
    if (loading) return;
    setQuery("");
    void fetchTracks(`/api/mxm/search?q=${encodeURIComponent(AUTO_SEED)}`).then((found) => {
      if (found.length) onAddMany(found);
    });
  }

  // One short readiness hint derived from the chosen games (nudge, not checklist).
  const needRichsync = selectedGames.some((id) => RICHSYNC_GAMES.has(id));
  const needVariety = selectedGames.some((id) => VARIETY_GAMES.has(id));
  const richsyncCount = deck.filter((track) => track.hasRichsync).length;
  const distinctArtists = new Set(deck.map((track) => track.artistName.toLowerCase())).size;

  let ready = deck.length > 0;
  let hint = "Add a track to begin";
  if (deck.length > 0) {
    if (needRichsync && richsyncCount < 1) {
      ready = false;
      hint = "Add a synced track for The Drop / On The Beat";
    } else if (needVariety && distinctArtists < VARIETY_MIN) {
      ready = false;
      hint = `Add ${VARIETY_MIN - distinctArtists} more artist${VARIETY_MIN - distinctArtists === 1 ? "" : "s"} for variety`;
    } else {
      hint = "Ready to play";
    }
  }

  const selectedIds = deck.map((track) => track.trackId);

  return (
    <div>
      {/* Primary guided path */}
      <button
        type="button"
        onClick={surprise}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-condensed text-base uppercase tracking-[0.06em] text-white shadow-[0_4px_0_rgba(126,54,35,0.85)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-60"
      >
        <Icon name="shuffle" size={16} />
        {loading ? "Loading…" : "Surprise me — auto-pick a setlist"}
      </button>

      <div className="mt-3 flex items-center gap-3 text-black/30">
        <span className="h-px flex-1 bg-black/10" />
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em]">or pick your own</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>

      {/* One search + a few suggested artists */}
      <div className="mt-3">
        <SearchForm
          query={query}
          loading={loading}
          labels={SEARCH_LABELS}
          onQueryChange={setQuery}
          onSubmit={submitQuery}
        />
        <div className="mt-2.5 flex flex-wrap gap-2">
          {CURATED_ARTISTS.slice(0, 5).map((artist) => (
            <button
              key={artist.name}
              type="button"
              onClick={() => loadArtist(artist.name)}
              disabled={loading}
              className="rounded-full border border-black/10 px-3 py-1.5 font-condensed text-sm uppercase tracking-[0.03em] text-black/70 transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
            >
              {artist.name}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-brand">{error}</p> : null}

      {/* Setlist — compact, one hint */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">
          Setlist {deck.length}/8
        </span>
        <span className={`text-xs ${ready ? "text-aqua" : "text-tangerine-600"}`}>
          {ready ? "✓" : "⚠"} {hint}
        </span>
        {deck.length ? (
          <div className="flex w-full flex-wrap gap-2">
            {deck.map((track) => (
              <button
                key={track.trackId}
                type="button"
                onClick={() => onToggle(track)}
                aria-label={`Remove ${track.trackName}`}
                className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 py-1 pl-3 pr-2 text-sm text-ink transition-colors hover:border-brand"
              >
                <span className="max-w-[10rem] truncate">{track.trackName}</span>
                <span className="text-brand">✕</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Results */}
      {results.length ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">
            {results.length} found
          </span>
          <button
            type="button"
            onClick={() => onAddMany(results)}
            className="rounded-full border border-aqua/40 bg-aqua/10 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-aqua transition-colors hover:bg-aqua/20"
          >
            Add all
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        <TrackResults
          results={results}
          searched={searched}
          loadingTrackId={null}
          labels={RESULT_LABELS}
          onPlay={onToggle}
          variant="select"
          dense
          selectedIds={selectedIds}
        />
      </div>
    </div>
  );
}
