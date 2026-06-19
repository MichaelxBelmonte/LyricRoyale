import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
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
    challengeFriend: string;
    copyLink: string;
    linkCopied: string;
  };
  shareUrl?: string;
  copied?: boolean;
  onCopyLink?: () => void;
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
  shareUrl,
  copied,
  onCopyLink,
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
    <div className="animate-pop-in">
      <JCard spine="MATCH · COMPLETE" contentClassName="p-5 sm:p-7">
        <Sticker tone="yellow" rotate={-3}>
          {labels.matchCompleteTitle}
        </Sticker>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <h2 className="font-condensed text-3xl uppercase tracking-tight text-[#15120E] sm:text-4xl">
              {rank}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">{labels.matchCompleteBody}</p>
            <p className="mt-3 truncate text-sm text-black/45">
              {team.teamName} vs {track.trackName} — {track.artistName}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ResultStat label={labels.finalScoreLabel} value={score} suffix={labels.pointsLabel} />
            <ResultStat label={labels.bestStreakLabel} value={bestStreak} />
            <ResultStat label={labels.roundsPlayedLabel} value={`${roundsPlayed}/${maxRounds}`} />
          </div>
        </div>

        {shareUrl ? (
          <Button onClick={onCopyLink} variant="magenta" full className="mt-5">
            {copied ? labels.linkCopied : labels.challengeFriend}
          </Button>
        ) : null}

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={onRematch} full>
            {labels.rematchSong}
          </Button>
          <Button onClick={onNewSong} variant="outlineDark" full>
            {labels.pickAnotherSong}
          </Button>
        </div>
      </JCard>
    </div>
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
    <div className="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
      <p className="font-mono text-[0.55rem] uppercase leading-tight tracking-[0.1em] text-black/45">
        {label}
      </p>
      <p className="mt-1 font-mono text-base tabular-nums text-[#15120E]">
        {value}
        {suffix ? <span className="ml-0.5 text-xs text-black/45">{suffix}</span> : null}
      </p>
    </div>
  );
}
