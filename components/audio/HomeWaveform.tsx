"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

interface AudioState {
  enabled: boolean;
  blocked: boolean;
  title: string;
  vibe: string;
  currentTime: number;
  duration: number;
}

const IDLE_BARS = 36;

function control(action: "play" | "pause" | "toggle") {
  window.dispatchEvent(new CustomEvent("soundclash:audio-control", { detail: { action } }));
}

export default function HomeWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const stateRef = useRef<AudioState>({
    enabled: false,
    blocked: false,
    title: "Soundclash Signal",
    vibe: "Mix",
    currentTime: 0,
    duration: 0,
  });
  const [state, setState] = useState(stateRef.current);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{
        enabled?: boolean;
        blocked?: boolean;
        track?: { title?: string; vibe?: string };
        currentTime?: number;
        duration?: number;
      }>).detail;
      const next = {
        enabled: Boolean(detail?.enabled),
        blocked: Boolean(detail?.blocked),
        title: detail?.track?.title ?? "Soundclash Signal",
        vibe: detail?.track?.vibe ?? "Mix",
        currentTime: detail?.currentTime ?? 0,
        duration: detail?.duration ?? 0,
      };
      stateRef.current = next;
      setState(next);
    };
    const onFrame = (event: Event) => {
      const detail = (event as CustomEvent<{ levels?: number[] }>).detail;
      levelsRef.current = detail?.levels ?? [];
    };
    window.addEventListener("soundclash:audio-state", onState);
    window.addEventListener("soundclash:audio-frame", onFrame);
    return () => {
      window.removeEventListener("soundclash:audio-state", onState);
      window.removeEventListener("soundclash:audio-frame", onFrame);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let raf = 0;

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.clearRect(0, 0, width, height);

      const levels = levelsRef.current.length
        ? levelsRef.current
        : Array.from({ length: IDLE_BARS }, (_, index) => {
            const pulse = Math.sin(time / 240 + index * 0.52) * 0.5 + 0.5;
            const wobble = Math.sin(time / 520 + index * 0.19) * 0.5 + 0.5;
            return 0.1 + pulse * 0.35 + wobble * 0.18;
          });
      const active = stateRef.current.enabled;
      const progress = stateRef.current.duration > 0 ? stateRef.current.currentTime / stateRef.current.duration : 0;
      const bars = levels.length;
      const gap = 3 * dpr;
      const barWidth = Math.max(3 * dpr, (width - gap * (bars - 1)) / bars);
      const mid = height * 0.52;
      // Warm editorial sweep — terracotta into amber, matching the cream/terracotta
      // hero (the cool teal is reserved for the play-state button, not the bars).
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#C2563B");
      gradient.addColorStop(0.55, "#D06A4E");
      gradient.addColorStop(1, "#D99A3C");

      context.fillStyle = gradient;

      for (let index = 0; index < bars; index++) {
        const value = levels[index] ?? 0;
        const played = index / Math.max(1, bars - 1) <= progress;
        const intensity = active ? value : value * 0.62;
        const barHeight = Math.max(8 * dpr, intensity * height * 0.84);
        const x = index * (barWidth + gap);
        const y = mid - barHeight / 2;
        context.globalAlpha = played || active ? 0.95 : 0.38;
        context.fillRect(x, y, barWidth, barHeight);
      }

      context.globalAlpha = 1;
      context.strokeStyle = "rgba(21,18,14,0.18)";
      context.lineWidth = 1 * dpr;
      context.beginPath();
      context.moveTo(0, mid);
      context.lineTo(width, mid);
      context.stroke();

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative" aria-label="Soundclash theme signal">
      <button
        type="button"
        onClick={() => control("toggle")}
        className="group relative block w-full py-2 text-left"
        aria-label={state.enabled ? "Stop soundtrack" : "Play soundtrack"}
      >
        <canvas ref={canvasRef} className="h-24 w-full sm:h-28" aria-hidden="true" />
        <span
          className={[
            "absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-white shadow-[0_5px_0_rgba(126,54,35,0.7)] transition-transform group-hover:-translate-y-[54%] group-active:-translate-y-[46%]",
            state.enabled ? "border-[#2E7D6B] bg-[#2E7D6B]" : "border-[#C2563B] bg-[#C2563B]",
          ].join(" ")}
          aria-hidden
        >
          <Icon name={state.enabled ? "pause" : "play"} size={18} />
        </span>
      </button>

      <p className="text-center font-mono text-[0.58rem] uppercase tracking-[0.22em] text-black/40">
        {state.enabled ? "Stop theme" : "Play theme"}
      </p>
    </div>
  );
}
