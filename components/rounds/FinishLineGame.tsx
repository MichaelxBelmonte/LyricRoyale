"use client";

import { useState, type FormEvent } from "react";
import { normalizeAnswer } from "@/lib/game/finish-line";
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
  };
  onReset: () => void;
}

export default function FinishLineGame({ round, track, labels, onReset }: FinishLineGameProps) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(round.answer);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answer.trim()) setSubmitted(true);
  }

  return (
    <section className="rounded-md border border-neutral-850 bg-neutral-900/80 p-5">
      {round.tracking.pixel ? (
        <img alt="" className="hidden" referrerPolicy="no-referrer" src={round.tracking.pixel} />
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wider text-red-300">
        {labels.roundTitle}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{track.trackName}</h2>
      <p className="text-sm text-neutral-400">{track.artistName}</p>

      <p className="mt-6 rounded-md bg-neutral-950 p-4 text-lg leading-8 text-white">
        {round.prompt}
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
            setSubmitted(false);
          }}
          placeholder={labels.answerPlaceholder}
          className="h-12 rounded-md border border-neutral-750 bg-neutral-950 px-4 text-white outline-none transition placeholder:text-neutral-500 focus:border-red-500"
        />
        <button className="h-12 rounded-md bg-red-600 px-5 font-semibold text-white transition hover:bg-red-500">
          {labels.submitAnswer}
        </button>
      </form>

      {submitted ? (
        <p className={["mt-4 text-sm", isCorrect ? "text-emerald-300" : "text-red-300"].join(" ")}>
          {isCorrect ? labels.correctAnswer : labels.wrongAnswer}. {labels.answerWas}:{" "}
          <span className="font-semibold">{round.answer}</span>
        </p>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-neutral-850 pt-4">
        <p className="text-xs leading-5 text-neutral-500">{round.copyright}</p>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm font-medium text-neutral-300 hover:text-white"
        >
          {labels.resetRound}
        </button>
      </div>
    </section>
  );
}
