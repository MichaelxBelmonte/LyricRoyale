import type { TrackSummary } from "@/lib/types";

interface TrackResultsProps {
  results: TrackSummary[];
  searched: boolean;
  labels: {
    emptyState: string;
    noResults: string;
    resultsTitle: string;
    resultMeta: string;
    richsyncBadge: string;
    lyricsBadge: string;
  };
}

export default function TrackResults({ results, searched, labels }: TrackResultsProps) {
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
            <div className="flex items-start gap-2 sm:justify-end">
              {track.hasRichsync ? (
                <span className="rounded bg-red-600/20 px-2 py-1 text-xs font-medium text-red-200">
                  {labels.richsyncBadge}
                </span>
              ) : null}
              {track.hasLyrics ? (
                <span className="rounded bg-neutral-700/60 px-2 py-1 text-xs font-medium text-neutral-200">
                  {labels.lyricsBadge}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
