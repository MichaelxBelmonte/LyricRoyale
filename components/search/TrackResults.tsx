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
        className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500"
      >
        {labels.resultsTitle}
      </h2>
      <ul className="space-y-2">
        {results.map((track, index) => (
          <li
            key={track.trackId}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            className="group grid animate-fade-up gap-3 rounded-md border border-neutral-850 bg-neutral-950 p-3.5 transition-colors hover:border-neutral-700 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{track.trackName}</p>
              <p className="truncate text-sm text-neutral-400">{track.artistName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {track.hasRichsync ? <Badge tone="brand">{labels.richsyncBadge}</Badge> : null}
              {track.hasLyrics ? <Badge>{labels.lyricsBadge}</Badge> : null}
              <button
                type="button"
                onClick={() => onPlay(track)}
                disabled={loadingTrackId !== null}
                className="h-9 rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
              >
                {loadingTrackId === track.trackId ? labels.loadingRound : labels.playButton}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Badge({ children, tone }: { children: string; tone?: "brand" }) {
  return (
    <span
      className={[
        "rounded border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.1em]",
        tone === "brand"
          ? "border-brand/40 text-brand-300"
          : "border-neutral-800 text-neutral-400",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
