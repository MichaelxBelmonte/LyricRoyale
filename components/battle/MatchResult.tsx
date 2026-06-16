import type { SingerTeam, TrackSummary } from "@/lib/types";

interface MatchResultProps {
  team: SingerTeam;
  track: TrackSummary;
  score: number;
  roundsPlayed: number;
  maxRounds: number;
  bestStreak: number;
  labels: {
    matchCompleteTitle: string;
    matchCompleteBody: string;
    finalScoreLabel: string;
    bestStreakLabel: string;
    roundsPlayedLabel: string;
    rematchSong: string;
    pickAnotherSong: string;
    performanceTop: string;
    performanceMid: string;
    performanceLow: string;
    pointsLabel: string;
  };
  onRematch: () => void;
  onNewSong: () => void;
}

export default function MatchResult({
  team,
  track,
  score,
  roundsPlayed,
  maxRounds,
  bestStreak,
  labels,
  onRematch,
  onNewSong,
}: MatchResultProps) {
  const scoreRatio = score / (maxRounds * 1000);
  const rank =
    scoreRatio >= 0.78
      ? labels.performanceTop
      : scoreRatio >= 0.46
        ? labels.performanceMid
        : labels.performanceLow;

  return (
    <section className="animate-pop-in rounded-lg border border-neutral-850 bg-neutral-925 p-4 shadow-card sm:p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
        {labels.matchCompleteTitle}
      </p>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            {rank}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
            {labels.matchCompleteBody}
          </p>
          <p className="mt-4 truncate text-sm text-neutral-500">
            {team.teamName} vs {track.trackName} - {track.artistName}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ResultStat label={labels.finalScoreLabel} value={score} suffix={labels.pointsLabel} />
          <ResultStat label={labels.bestStreakLabel} value={bestStreak} />
          <ResultStat label={labels.roundsPlayedLabel} value={`${roundsPlayed}/${maxRounds}`} />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-[auto_auto]">
        <button
          type="button"
          onClick={onRematch}
          className="h-12 rounded-md bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
        >
          {labels.rematchSong}
        </button>
        <button
          type="button"
          onClick={onNewSong}
          className="h-12 rounded-md border border-neutral-800 px-5 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          {labels.pickAnotherSong}
        </button>
      </div>
    </section>
  );
}

function ResultStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 text-right">
      <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xl tabular-nums text-white">
        {value}
        {suffix ? <span className="ml-1 text-sm text-neutral-500">{suffix}</span> : null}
      </p>
    </div>
  );
}
