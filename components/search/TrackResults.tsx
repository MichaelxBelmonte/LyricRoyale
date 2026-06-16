import type { TrackSummary } from "@/lib/types";

interface TrackResultsProps {
  results: TrackSummary[];
  searched: boolean;
  loadingTrackId: number | null;
  labels: {
    emptyState: string;
    noResults: string;
    resultsTitle: string;
    resultMeta: string;
    playButton: string;
    loadingRound: string;
    richsyncBadge: string;
    lyricsBadge: string;
  };
  onPlay: (track: TrackSummary) => void;
}

export default function TrackResults({
  results,
  searched,
  loadingTrackId,
  labels,
  onPlay,
}: TrackResultsProps) {
  if (!searched) {
    return <p className="text-sm text-neutral-500">{labels.emptyState}</p>;
  }

  if (results.length === 0) {
    return <p className="text-sm text-neutral-500">{labels.noResults}</p>;
  }

  return (
    <section aria-labelledby="search-results-title" className="space-y-3">
      <h2
        id="search-results-title"
        className="text-sm font-semibold uppercase tracking-wider text-neutral-400"
      >
        {labels.resultsTitle}
      </h2>
      <ul className="space-y-2">
        {results.map((track) => (
          <li
            key={track.trackId}
            className="grid gap-3 rounded-md border border-neutral-850 bg-neutral-900/80 p-4 sm:grid-cols-[1fr_auto]"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{track.trackName}</p>
              <p className="truncate text-sm text-neutral-400">{track.artistName}</p>
              <p className="mt-1 text-xs text-neutral-500">{labels.resultMeta}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => onPlay(track)}
                disabled={loadingTrackId !== null}
                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingTrackId === track.trackId ? labels.loadingRound : labels.playButton}
              </button>
              {track.hasRichsync ? <Badge>{labels.richsyncBadge}</Badge> : null}
              {track.hasLyrics ? <Badge>{labels.lyricsBadge}</Badge> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-700/60 px-2 py-1 text-xs font-medium text-neutral-200">
      {children}
    </span>
  );
}
