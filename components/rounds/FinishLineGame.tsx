"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import LiveLyricPreview from "@/components/richsync/LiveLyricPreview";
import {
  MAX_HEAT,
  ROUND_TIME_LIMIT_MS,
  heatMultiplier,
  scoreRound,
  type RoundScoreBreakdown,
} from "@/lib/game/scoring";
import type {
  CheckResponse,
  ErrorResponse,
  FinishLineDrop,
  FinishLineRound,
  TrackSummary,
} from "@/lib/types";

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
    timeRemainingLabel: string;
    pointsLabel: string;
    streakLabel: string;
    heatLabel: string;
    heatOnHit: string;
    comboBreak: string;
    encoreLabel: string;
    encoreTagline: string;
    timedOutLabel: string;
    nextRound: string;
    viewResult: string;
    richsyncTitle: string;
    richsyncLoading: string;
    richsyncUnavailable: string;
  };
  roundNumber: number;
  maxRounds: number;
  totalScore: number;
  streak: number;
  onReset: () => void;
  onNextRound: () => void;
  onScored: (points: number) => void;
}

interface RoundResult {
  correct: boolean;
  elapsedMs: number;
  timedOut: boolean;
  breakdown: RoundScoreBreakdown;
  answer: string;
}

export default function FinishLineGame({
  round,
  track,
  labels,
  roundNumber,
  maxRounds,
  totalScore,
  streak,
  onReset,
  onNextRound,
  onScored,
}: FinishLineGameProps) {
  const [answer, setAnswer] = useState("");
  const [remainingMs, setRemainingMs] = useState(ROUND_TIME_LIMIT_MS);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [pending, setPending] = useState(false);
  const startedAt = useRef(Date.now());
  const scored = useRef(false);

  const isEncore = roundNumber >= maxRounds;

  const resolveRound = useCallback(
    async (value: string, elapsedMs: number, timedOut = false) => {
      if (scored.current) return;
      scored.current = true;
      setPending(true);
      const clampedElapsed = Math.min(elapsedMs, ROUND_TIME_LIMIT_MS);

      let correct = false;
      let answerText = "";
      try {
        const response = await fetch("/api/rounds/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId: round.trackId,
            seed: round.seed,
            guess: timedOut ? "" : value,
          }),
        });
        const payload = (await response.json()) as Partial<CheckResponse & ErrorResponse>;
        if (response.ok && typeof payload.correct === "boolean") {
          correct = payload.correct;
          answerText = payload.answer ?? "";
        }
      } catch {
        // Network/verify failure: resolve as a miss; the answer stays unknown.
      }

      // "On the drop" bonus: how close the lock was to the moment the karaoke
      // highlight reaches the gap (nearest looped drop instant). Null = no richsync.
      let dropProximityMs: number | null = null;
      if (correct && round.drop) {
        const cycle = dropCycle(round.drop);
        const tSec = (clampedElapsed / 1000) % cycle;
        const distance = Math.abs(tSec - round.drop.dropOffset);
        dropProximityMs = Math.min(distance, cycle - distance) * 1000;
      }

      const effectiveStreak = correct ? streak + 1 : 0;
      const breakdown = scoreRound({
        isCorrect: correct,
        elapsedMs: clampedElapsed,
        streak: effectiveStreak,
        isEncore,
        dropProximityMs,
      });

      setRemainingMs(Math.max(0, ROUND_TIME_LIMIT_MS - clampedElapsed));
      setResult({ correct, elapsedMs: clampedElapsed, timedOut, breakdown, answer: answerText });
      setPending(false);
      onScored(breakdown.total);
    },
    [isEncore, onScored, round.drop, round.seed, round.trackId, streak],
  );

  useEffect(() => {
    startedAt.current = Date.now();
    scored.current = false;
    setAnswer("");
    setRemainingMs(ROUND_TIME_LIMIT_MS);
    setResult(null);
    setPending(false);
  }, [round.trackId, round.prompt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (scored.current) return;
      const elapsedMs = Date.now() - startedAt.current;
      const nextRemainingMs = Math.max(0, ROUND_TIME_LIMIT_MS - elapsedMs);
      setRemainingMs(nextRemainingMs);
      if (nextRemainingMs === 0) void resolveRound("", ROUND_TIME_LIMIT_MS, true);
    }, 100);

    return () => window.clearInterval(timer);
  }, [resolveRound, round.trackId, round.prompt]);

  const animatedTotal = useCountUp(result?.breakdown.total ?? 0, 700, result);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || result || pending) return;
    void resolveRound(answer, Date.now() - startedAt.current);
  }

  const [promptBefore, promptAfter = ""] = round.prompt.split("_____");
  const remainingRatio = Math.max(0, Math.min(1, remainingMs / ROUND_TIME_LIMIT_MS));
  const timeDanger = remainingMs <= 5_000;
  const primaryAction = isEncore ? labels.viewResult : labels.nextRound;

  return (
    <section className="animate-pop-in rounded-lg border border-neutral-850 bg-neutral-925 p-4 shadow-card sm:p-6">
      {round.tracking.pixel ? (
        <img alt="" className="hidden" referrerPolicy="no-referrer" src={round.tracking.pixel} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">{labels.roundTitle}</p>
            {isEncore ? (
              <span className="rounded border border-brand/50 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-brand-300">
                {labels.encoreLabel} ×2
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 truncate text-xl font-bold text-white sm:text-2xl">{track.trackName}</h2>
          <p className="truncate text-sm text-neutral-400">{track.artistName}</p>
          {isEncore ? (
            <p className="mt-1 text-xs font-medium text-brand-300">{labels.encoreTagline}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label={labels.roundLabel} value={`${roundNumber}/${maxRounds}`} />
          <Stat label={labels.totalScoreLabel} value={totalScore} suffix={labels.pointsLabel} />
          <Stat label={labels.streakLabel} value={streak} />
        </div>
      </div>

      <HeatMeter streak={streak} result={result} labels={labels} />

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.15em]">
          <span className={timeDanger && !result ? "text-brand-300" : "text-neutral-500"}>
            {labels.timeRemainingLabel}
          </span>
          <span className="font-mono text-base tabular-nums text-white">
            {(remainingMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-850">
          <div
            className={[
              "h-full transition-[width,background-color] duration-100",
              timeDanger && !result ? "bg-brand" : "bg-neutral-500",
            ].join(" ")}
            style={{ width: `${remainingRatio * 100}%` }}
          />
        </div>
      </div>

      <p className="mt-7 text-2xl font-semibold leading-relaxed text-white sm:text-3xl sm:leading-relaxed">
        {round.drop && round.drop.tokens.length > 0 && !result ? (
          <KaraokeTokens drop={round.drop} />
        ) : (
          promptBefore
        )}
        <span
          className={[
            "mx-1 inline-flex min-w-[3rem] items-center justify-center rounded border-b-2 px-2 align-baseline font-mono tracking-tight",
            result ? "animate-slam-in" : "animate-blank-pulse",
            result
              ? result.correct
                ? "border-emerald-400 text-emerald-300"
                : "border-brand text-brand-300"
              : "border-brand text-brand-300",
          ].join(" ")}
        >
          {result ? result.answer : "_____"}
        </span>
        {promptAfter}
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={result !== null || pending}
          autoComplete="off"
          placeholder={labels.answerPlaceholder}
          className="h-12 rounded-md border border-neutral-800 bg-neutral-950 px-4 text-base text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-brand disabled:opacity-70"
        />
        <button
          disabled={result !== null || pending}
          className="h-12 rounded-md bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
        >
          {labels.submitAnswer}
        </button>
      </form>

      {result ? (
        <div
          className={[
            "mt-4 animate-pop-in rounded-md border p-4",
            result.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-brand/30 bg-brand/5",
          ].join(" ")}
        >
          {result.correct ? (
            <ScoreChain breakdown={result.breakdown} animatedTotal={animatedTotal} labels={labels} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={labels.scoreLabel}
              value={result.correct ? animatedTotal : 0}
              suffix={labels.pointsLabel}
            />
            <Stat
              label={labels.timeLabel}
              value={result.timedOut ? labels.timedOutLabel : `${(result.elapsedMs / 1000).toFixed(1)}s`}
            />
            <Stat
              label={result.correct ? labels.correctAnswer : labels.answerWas}
              value={result.answer}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-neutral-850 pt-4">
        <p className="max-w-md text-xs leading-5 text-neutral-500">{round.copyright}</p>
        <div className="flex shrink-0 gap-3">
          {result ? (
            <button
              type="button"
              onClick={onNextRound}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
              {primaryAction}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
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

function formatMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function dropCycle(drop: FinishLineDrop): number {
  const lastOffset = drop.tokens.length ? drop.tokens[drop.tokens.length - 1].offset : 0;
  return Math.max(drop.lineDuration, drop.dropOffset + 0.6, lastOffset + 0.6);
}

// "The Drop": the prefix of the real line lights word-by-word on the song's own
// cadence (richsync offsets), pulling toward the blank. Loops so the line stays
// alive while the player thinks. No audio — this is a visual ramp.
function KaraokeTokens({ drop }: { drop: FinishLineDrop }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const cycle = dropCycle(drop);
    const id = window.setInterval(() => {
      setElapsed(((Date.now() - startedAt) / 1000) % cycle);
    }, 80);
    return () => window.clearInterval(id);
  }, [drop]);

  let activeIndex = -1;
  for (let i = 0; i < drop.tokens.length; i++) {
    if (drop.tokens[i].offset <= elapsed) activeIndex = i;
  }

  return (
    <>
      {drop.tokens.map((token, index) => (
        <span
          key={index}
          className={[
            "transition-colors duration-150",
            index === activeIndex
              ? "text-brand-300"
              : index < activeIndex
                ? "text-white"
                : "text-neutral-600",
          ].join(" ")}
        >
          {/* richsync tokens may omit spacing — normalize to one space between words */}
          {token.text.trim()}
          {index < drop.tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

function HeatMeter({
  streak,
  result,
  labels,
}: {
  streak: number;
  result: RoundResult | null;
  labels: { heatLabel: string; heatOnHit: string; comboBreak: string };
}) {
  const broken = result != null && !result.correct;
  const level = broken ? 0 : result?.correct ? streak + 1 : streak;
  const segments = Math.min(level, MAX_HEAT);
  const multiplier = broken ? 1 : result?.correct ? result.breakdown.heat : heatMultiplier(streak + 1);
  const hot = multiplier >= MAX_HEAT;

  return (
    <div
      className={[
        "mt-5 flex items-center justify-between gap-4 rounded-md border px-3 py-2.5 transition-colors",
        broken
          ? "animate-flash-out border-neutral-800 bg-neutral-950"
          : hot
            ? "border-brand/60 bg-brand/5"
            : "border-neutral-850 bg-neutral-950",
      ].join(" ")}
    >
      <div className="min-w-0">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-neutral-500">
          {labels.heatLabel}
        </p>
        <p className="mt-0.5 truncate text-[0.7rem] text-neutral-500">
          {broken ? labels.comboBreak : labels.heatOnHit}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-end gap-1" aria-hidden>
          {Array.from({ length: MAX_HEAT }, (_, i) => (
            <span
              key={i}
              className={[
                "w-2 rounded-sm transition-colors",
                i === 0 ? "h-2" : i === 1 ? "h-3" : "h-4",
                i < segments ? (hot ? "bg-brand-300" : "bg-brand") : "bg-neutral-800",
              ].join(" ")}
            />
          ))}
        </div>
        <span
          className={[
            "font-mono text-2xl tabular-nums",
            broken ? "text-neutral-600" : hot ? "text-brand-300" : "text-white",
          ].join(" ")}
        >
          ×{formatMultiplier(multiplier)}
        </span>
      </div>
    </div>
  );
}

function ScoreChain({
  breakdown,
  animatedTotal,
  labels,
}: {
  breakdown: RoundScoreBreakdown;
  animatedTotal: number;
  labels: { pointsLabel: string };
}) {
  const factors: string[] = [];
  if (breakdown.heat > 1) factors.push(`×${formatMultiplier(breakdown.heat)}`);
  if (breakdown.drop > 1) factors.push(`×${breakdown.drop.toFixed(2)}`);
  if (breakdown.encore > 1) factors.push(`×${breakdown.encore}`);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm tabular-nums text-neutral-400">
      <span className="text-neutral-300">{breakdown.subtotal}</span>
      {factors.map((factor, index) => (
        <span key={index} className="text-brand-300">
          {factor}
        </span>
      ))}
      <span className="text-neutral-600">=</span>
      <span className="text-lg text-white">
        {animatedTotal}
        <span className="ml-1 text-xs text-neutral-500">{labels.pointsLabel}</span>
      </span>
    </div>
  );
}

function useCountUp(target: number, durationMs: number, trigger: unknown): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, trigger]);
  return value;
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
    <div className="min-w-0 rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 text-right">
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
