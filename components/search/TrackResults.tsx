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
        className="font-display text-sm uppercase tracking-[0.2em] text-neutral-400"
      >
        {labels.resultsTitle}
      </h2>
      <ul className="space-y-2.5">
        {results.map((track, index) => (
          <li
            key={track.trackId}
            style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            className="group grid animate-fade-up gap-3 rounded-2xl border border-neutral-850 bg-neutral-900/60 p-4 transition hover:border-brand/40 hover:bg-neutral-900 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{track.trackName}</p>
              <p className="truncate text-sm text-neutral-400">{track.artistName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {track.hasRichsync ? <Badge tone="brand">{labels.richsyncBadge}</Badge> : null}
              {track.hasLyrics ? <Badge>{labels.lyricsBadge}</Badge> : null}
              <button
                type="button"
                onClick={() => onPlay(track)}
                disabled={loadingTrackId !== null}
                className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
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
        "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide",
        tone === "brand" ? "bg-brand/15 text-brand-300" : "bg-neutral-800 text-neutral-300",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
