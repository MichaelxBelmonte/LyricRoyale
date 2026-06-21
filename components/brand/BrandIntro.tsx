"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "sc_intro_seen";

/**
 * Landing intro: the BEATBOT mascot video plays in the foreground OVER the visible
 * landing page (transparent background — WebM/VP9 alpha, MP4 fallback). Contained,
 * not full-screen, so it stays crisp. Shown once per session and always skippable.
 * Audio needs a user gesture, so the video is gated behind a "Press play" button;
 * the soundtrack stays silent until the video ends (see AudioDirector).
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
    // Intro over → tell the AudioDirector to fade the soundtrack in now (it stayed
    // silent while the video played, so the song never starts on top of the intro).
    window.dispatchEvent(new CustomEvent("soundclash:intro", { detail: { phase: "end" } }));
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
    // Transparent overlay — the landing page stays visible behind; only the video
    // (and the minimal play/skip controls) sit in the foreground.
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="dialog"
      aria-label="Soundclash intro"
    >
      {/* Transparent (alpha) video, contained and centered over the page. */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        onEnded={finish}
        className={`aspect-video w-[min(90vw,900px)] max-h-[80vh] object-contain ${
          phase === "playing" ? "block" : "hidden"
        }`}
      >
        <source src="/brand/intro.webm" type="video/webm" />
        <source src="/brand/intro.mp4" type="video/mp4" />
      </video>

      {phase === "splash" ? (
        <div className="flex animate-fade-up flex-col items-center text-center">
          <button
            type="button"
            onClick={play}
            className="flex h-14 items-center gap-3 rounded-full bg-brand px-10 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-glow transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span>Press play</span>
            <span aria-hidden>▶</span>
          </button>
          <button
            type="button"
            onClick={finish}
            className="mt-4 inline-flex min-h-11 items-center px-4 text-xs font-medium uppercase tracking-[0.2em] text-black/45 transition-colors hover:text-ink"
          >
            Skip intro
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-black/15 bg-paper/70 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-black/60 backdrop-blur transition-colors hover:text-ink"
        >
          Skip <span aria-hidden>▶▶</span>
        </button>
      )}
    </div>
  );
}
