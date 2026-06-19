"use client";

import { useState } from "react";

const POINTS: [string, string][] = [
  ["Host screen", "Room code, live lyrics, timer and scoreboard on the big screen."],
  ["Phone controller", "Players answer from their own phones — no install."],
  ["AI host — BEATBOT", "Hypes, roasts and reveals scores in an ElevenLabs voice."],
];

/** Minimal "i" button, top-right. The how-it-works guide lives here, on demand. */
export default function InfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-40 sm:right-[max(1.25rem,env(safe-area-inset-right))] sm:top-[max(1.25rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="How it works"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 font-condensed text-lg lowercase text-white backdrop-blur transition-colors hover:border-[#2E7D6B] hover:text-[#2E7D6B]"
      >
        i
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 max-h-[calc(100dvh_-_5rem)] w-72 max-w-[calc(100vw_-_1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#0e0e10]/95 p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.85)] backdrop-blur">
          <p className="font-condensed text-sm uppercase tracking-[0.12em] text-white">How it works</p>
          <ul className="mt-3 space-y-3">
            {POINTS.map(([title, body]) => (
              <li key={title}>
                <p className="text-xs font-semibold text-[#86BDB0]">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-neutral-400">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
