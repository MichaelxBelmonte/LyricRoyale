"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/brand/Logo";

const SEEN_KEY = "sc_intro_seen";

/**
 * Landing intro: when you first land on the site you get a branded splash, then
 * the BEATBOT mascot intro video (with audio) plays full-screen. Shown once per
 * session (sessionStorage) and always skippable. Audio needs a user gesture, so
 * we gate the video behind a "Press play" button rather than autoplaying.
 */
export default function BrandIntro() {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"splash" | "playing">("splash");
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      const skip = new URLSearchParams(window.location.search).has("nointro");
      if (skip || sessionStorage.getItem(SEEN_KEY) === "1") setVisible(false);
    } catch {
      /* sessionStorage unavailable — just show the intro */
    }
  }, []);

  function finish() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 450);
  }

  function play() {
    setPhase("playing");
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      void v.play().catch(() => finish());
    }
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0b0b0b] px-6 transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-label="Soundclash intro"
    >
      <video
        ref={videoRef}
        src="/brand/intro.mp4"
        playsInline
        preload="auto"
        onEnded={finish}
        className={`absolute inset-0 h-full w-full bg-[#0b0b0b] object-contain ${
          phase === "playing" ? "block" : "hidden"
        }`}
      />

      {phase === "splash" ? (
        <div className="relative z-10 flex animate-fade-up flex-col items-center text-center">
          <Logo className="h-16 drop-shadow-[0_0_25px_rgba(255,0,127,0.3)] sm:h-24" />
          <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.32em] text-neutral-400">
            Same track. Different challenge.
          </p>
          <button
            type="button"
            onClick={play}
            className="mt-10 flex h-14 items-center gap-3 rounded-full bg-brand px-10 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span>Press play</span>
            <span aria-hidden>▶</span>
          </button>
          <button
            type="button"
            onClick={finish}
            className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-neutral-300"
          >
            Skip intro
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 top-4 z-20 flex h-10 items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          Skip <span aria-hidden>▶▶</span>
        </button>
      )}
    </div>
  );
}
