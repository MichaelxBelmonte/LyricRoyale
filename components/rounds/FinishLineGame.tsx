"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import LiveLyricPreview from "@/components/richsync/LiveLyricPreview";
import { normalizeAnswer } from "@/lib/game/finish-line";
import { ROUND_TIME_LIMIT_MS, scoreFinishLine } from "@/lib/game/scoring";
import type { FinishLineRound, TrackSummary } from "@/lib/types";

interface FinishLineGameProps {
  round: FinishLineRound;
  track: TrackSummary;
  labels: {
    roundTitle: string;
    answerPlaceholder: string;
    submitAnswer: string;
    resetRound: string;
    correctAnswer: string;
    wrongAnswer: string;
    answerWas: string;
    scoreLabel: string;
    totalScoreLabel: string;
    roundLabel: string;
    timeLabel: string;
    pointsLabel: string;
    nextRound: string;
    richsyncTitle: string;
    richsyncLoading: string;
    richsyncUnavailable: string;
  };
  roundNumber: number;
  totalScore: number;
  onReset: () => void;
  onNextRound: () => void;
  onScored: (points: number) => void;
}

export default function FinishLineGame({
  round,
  track,
  labels,
  roundNumber,
  totalScore,
  onReset,
  onNextRound,
  onScored,
}: FinishLineGameProps) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; elapsedMs: number; points: number } | null>(null);
  const startedAt = useRef(Date.now());
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(round.answer);

  useEffect(() => {
    startedAt.current = Date.now();
    setAnswer("");
    setResult(null);
  }, [round.trackId, round.prompt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || result) return;
    const elapsedMs = Math.min(Date.now() - startedAt.current, ROUND_TIME_LIMIT_MS);
    const points = scoreFinishLine(isCorrect, elapsedMs);
    setResult({ correct: isCorrect, elapsedMs, points });
    onScored(points);
  }

  const [promptBefore, promptAfter = ""] = round.prompt.split("_____");

  return (
    <section className="animate-pop-in rounded-3xl border border-neutral-850 bg-neutral-900/70 p-5 shadow-card sm:p-7">
      {round.tracking.pixel ? (
        <img alt="" className="hidden" referrerPolicy="no-referrer" src={round.tracking.pixel} />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-brand-300">
            {labels.roundTitle}
          </p>
          <h2 className="mt-2 truncate text-xl font-bold text-white sm:text-2xl">{track.trackName}</h2>
          <p className="truncate text-sm text-neutral-400">{track.artistName}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Stat label={labels.roundLabel} value={roundNumber} />
          <Stat label={labels.totalScoreLabel} value={totalScore} suffix={labels.pointsLabel} />
        </div>
      </div>

      <p className="mt-7 text-balance text-2xl font-semibold leading-relaxed text-white sm:text-3xl sm:leading-relaxed">
        {promptBefore}
        <span
          className={[
            "mx-1 inline-flex min-w-[3.25rem] items-center justify-center rounded-lg border-b-2 px-2 align-baseline font-display tracking-wide",
            result
              ? result.correct
                ? "border-emerald-400 text-emerald-300"
                : "border-brand text-brand-300"
              : "animate-blank-pulse border-brand text-brand-300",
          ].join(" ")}
        >
          {result ? round.answer : "?????"}
        </span>
        {promptAfter}
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={result !== null}
          autoComplete="off"
          placeholder={labels.answerPlaceholder}
          className="h-14 rounded-2xl border border-neutral-750 bg-neutral-950/80 px-5 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-brand focus:ring-2 focus:ring-brand/35 disabled:opacity-70"
        />
        <button
          disabled={result !== null}
          className="h-14 rounded-2xl bg-brand px-7 text-base font-semibold text-white transition hover:bg-brand-400 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
        >
          {labels.submitAnswer}
        </button>
      </form>

      {result ? (
        <div
          className={[
            "mt-4 grid animate-pop-in gap-3 rounded-2xl border p-4 sm:grid-cols-3",
            result.correct
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-brand/30 bg-brand/10",
          ].join(" ")}
        >
          <Stat label={labels.scoreLabel} value={result.points} suffix={labels.pointsLabel} />
          <Stat label={labels.timeLabel} value={`${(result.elapsedMs / 1000).toFixed(1)}s`} />
          <Stat
            label={result.correct ? labels.correctAnswer : labels.wrongAnswer}
            value={round.answer}
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-neutral-850 pt-4">
        <p className="max-w-md text-xs leading-5 text-neutral-500">{round.copyright}</p>
        <div className="flex shrink-0 gap-4">
          {result ? (
            <button
              type="button"
              onClick={onNextRound}
              className="rounded-full bg-brand/15 px-4 py-2 text-sm font-semibold text-brand-300 transition hover:bg-brand hover:text-white"
            >
              {labels.nextRound}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            {labels.resetRound}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <LiveLyricPreview trackId={track.trackId} enabled={track.hasRichsync} labels={labels} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="text-right">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-xl text-white">
        {value}
        {suffix ? <span className="ml-1 text-sm text-neutral-400">{suffix}</span> : null}
      </p>
    </div>
  );
}
