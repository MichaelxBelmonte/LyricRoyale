"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Led from "@/components/brand/Led";
import Sticker from "@/components/brand/Sticker";
import LiveLyricPreview from "@/components/richsync/LiveLyricPreview";
import type { ChallengeRoundResult } from "@/lib/game/challenge";
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
    rivalLabel: string;
    beatThisLine: string;
    lostThisLine: string;
    tiedThisLine: string;
    richsyncTitle: string;
    richsyncLoading: string;
    richsyncUnavailable: string;
  };
  roundNumber: number;
  maxRounds: number;
  totalScore: number;
  streak: number;
  ghost?: ChallengeRoundResult | null;
  onReset: () => void;
  onNextRound: () => void;
  onScored: (outcome: { points: number; correct: boolean; elapsedMs: number }) => void;
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
  ghost,
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
      onScored({ points: breakdown.total, correct, elapsedMs: clampedElapsed });
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
    <section className="tx-grain tx-grain-dark relative animate-pop-in overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e10] p-4 shadow-[0_20px_60px_-24px_rgba(255,0,127,0.35)] sm:p-6">
      {round.tracking.pixel ? (
        <img alt="" className="hidden" referrerPolicy="no-referrer" src={round.tracking.pixel} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ff007f]/40 bg-[#ff007f]/10 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#ff8cc0]">
              ◉ {labels.roundTitle}
            </span>
            {isEncore ? (
              <Sticker tone="yellow" rotate={-3}>
                {labels.encoreLabel} ×2
              </Sticker>
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

      {ghost ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-neutral-500">
            {labels.rivalLabel}
          </span>
          <div className="flex items-center gap-3 font-mono text-sm tabular-nums text-neutral-300">
            <span>{(ghost.elapsedMs / 1000).toFixed(1)}s</span>
            <span>
              {ghost.points} {labels.pointsLabel}
            </span>
            {result ? (
              <span
                className={
                  result.breakdown.total > ghost.points
                    ? "text-emerald-300"
                    : result.breakdown.total < ghost.points
                      ? "text-brand-300"
                      : "text-neutral-400"
                }
              >
                {result.breakdown.total > ghost.points
                  ? labels.beatThisLine
                  : result.breakdown.total < ghost.points
                    ? labels.lostThisLine
                    : labels.tiedThisLine}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-mono text-xs font-medium uppercase tracking-[0.15em] ${
              timeDanger && !result ? "text-[#ff8cc0]" : "text-neutral-500"
            }`}
          >
            {labels.timeRemainingLabel}
          </span>
          <Led value={`${(remainingMs / 1000).toFixed(1)}s`} danger={timeDanger && !result} />
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-850">
          <div
            className={[
              "h-full rounded-full transition-[width] duration-100",
              timeDanger && !result
                ? "animate-blank-pulse bg-[#ff007f]"
                : "bg-gradient-to-r from-[#00e5d2] to-[#2ceadb]",
            ].join(" ")}
            style={{ width: `${remainingRatio * 100}%` }}
          />
        </div>
      </div>

      <JCard className="mt-6" contentClassName="p-5 sm:p-6">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-black/45">
          {labels.roundTitle}
        </p>
        <p className="mt-3 text-2xl font-semibold leading-relaxed text-[#14110f] sm:text-3xl sm:leading-relaxed">
          {round.drop && round.drop.tokens.length > 0 && !result ? (
            <KaraokeTokens drop={round.drop} />
          ) : (
            promptBefore
          )}
          <span
            className={[
              "mx-1 inline-flex min-w-[3.5rem] items-center justify-center rounded-md border-2 px-2 align-middle font-mono tracking-tight",
              result ? "animate-slam-in" : "animate-blank-pulse",
              result
                ? result.correct
                  ? "border-[#00b8a8] bg-white text-[#00b8a8]"
                  : "border-[#ff007f] bg-white text-[#d80069]"
                : "border-dashed border-[#ff007f] bg-white/70 text-[#d80069]",
            ].join(" ")}
          >
            {result ? result.answer : "_____"}
          </span>
          {promptAfter}
        </p>
      </JCard>

      <HostBubble result={result} />

      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          disabled={result !== null || pending}
          autoComplete="off"
          placeholder={labels.answerPlaceholder}
          className="h-12 rounded-lg border border-neutral-800 bg-neutral-950 px-4 text-base text-white outline-none transition-all placeholder:text-neutral-600 focus:border-[#ff007f] focus:shadow-[0_0_0_3px_rgba(255,0,127,0.2)] disabled:opacity-70"
        />
        <Button type="submit" disabled={result !== null || pending}>
          {labels.submitAnswer}
        </Button>
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
              ? "text-[#d80069]"
              : index < activeIndex
                ? "text-[#14110f]"
                : "text-[#14110f]/35",
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
        "mt-5 rounded-xl border px-4 py-3 transition-colors",
        broken
          ? "animate-flash-out border-neutral-800 bg-neutral-950"
          : hot
            ? "border-[#ff007f]/60 bg-[#ff007f]/5"
            : "border-neutral-850 bg-neutral-950",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-neutral-400">
          {labels.heatLabel} {hot && !broken ? "🔥" : ""}
        </p>
        <div className="flex items-center gap-2">
          {hot && !broken ? (
            <span className="rounded-full bg-[#ff007f] px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-white">
              On fire
            </span>
          ) : null}
          <span
            className={[
              "font-mono text-2xl tabular-nums",
              broken ? "text-neutral-600" : hot ? "text-[#ff8cc0]" : "text-white",
            ].join(" ")}
          >
            ×{formatMultiplier(multiplier)}
          </span>
        </div>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full border border-black/40 bg-neutral-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00e5d2] via-[#ff8330] to-[#ff007f] transition-[width] duration-300"
          style={{ width: `${segments === 0 ? 0 : Math.max(8, (segments / MAX_HEAT) * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.15em] text-neutral-500">
        {broken ? labels.comboBreak : labels.heatOnHit}
      </p>
    </div>
  );
}

// BEATBOT, the cassette AI host — a light, always-on banter line tied to the
// round state. (Static copy for now; ready to swap for /api/host/speak output.)
function HostBubble({ result }: { result: RoundResult | null }) {
  const line = result
    ? result.correct
      ? "Clean hit! The tape approves."
      : "Ooh, not even close — shake it off."
    : "Lock in and finish the line!";
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#00e5d2]/30 bg-[#00e5d2]/[0.06] px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6402] to-[#ff007f] text-sm shadow-[0_4px_14px_-4px_rgba(255,0,127,0.7)]">
        🎙️
      </span>
      <p className="min-w-0">
        <span className="block font-mono text-[0.55rem] uppercase tracking-[0.22em] text-[#7df2e8]">
          AI Host · Beatbot
        </span>
        <span className="mt-0.5 block truncate text-sm text-neutral-200">{line}</span>
      </p>
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
