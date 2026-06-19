"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

interface AudioConsoleProps {
  hostVolume: number;
  hostMuted: boolean;
  speaking: boolean;
  onHostVolume: (value: number) => void;
  onToggleHostMute: () => void;
  onStopSpeech: () => void;
}

function music(action: string, value?: number | boolean) {
  window.dispatchEvent(new CustomEvent("soundclash:audio-control", { detail: { action, value } }));
}

const ICON_BTN =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Compact audio strip: host voice + background music on a single slim row, each
 * an icon, a thin slider, and one control. Minimal by design — it lives above
 * the host screen and shouldn't compete with the show. Ducking (handled in
 * HostRoom + AudioDirector) keeps the two from fighting.
 */
export default function AudioConsole({
  hostVolume,
  hostMuted,
  speaking,
  onHostVolume,
  onToggleHostMute,
  onStopSpeech,
}: AudioConsoleProps) {
  const [musicVolume, setMusicVolume] = useState(0.42);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean; volume?: number }>).detail;
      if (typeof detail?.enabled === "boolean") setMusicEnabled(detail.enabled);
      if (typeof detail?.volume === "number" && !synced) {
        setMusicVolume(detail.volume);
        setSynced(true);
      }
    };
    window.addEventListener("soundclash:audio-state", onState);
    return () => window.removeEventListener("soundclash:audio-state", onState);
  }, [synced]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-neutral-850 bg-neutral-950/80 px-3 py-1.5">
      {/* Host voice */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={[
            "h-1.5 w-1.5 shrink-0 rounded-full",
            speaking ? "animate-pulse bg-aqua-300" : "bg-neutral-700",
          ].join(" ")}
        />
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-neutral-500">Host</span>
        <button
          type="button"
          onClick={onToggleHostMute}
          aria-pressed={hostMuted}
          aria-label={hostMuted ? "Unmute host voice" : "Mute host voice"}
          className={[ICON_BTN, hostMuted ? "text-brand-300" : "hover:text-white"].join(" ")}
        >
          <Icon name={hostMuted ? "volumeX" : "volume2"} size={14} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={hostMuted ? 0 : hostVolume}
          onChange={(event) => onHostVolume(Number(event.target.value))}
          aria-label="Host voice volume"
          className="h-1 w-20 cursor-pointer accent-[#C2563B]"
        />
        <button
          type="button"
          onClick={onStopSpeech}
          disabled={!speaking}
          aria-label="Stop the host talking"
          className={[ICON_BTN, "hover:text-brand-300"].join(" ")}
        >
          <Icon name="stop" size={12} />
        </button>
      </div>

      <span aria-hidden className="hidden h-4 w-px bg-neutral-850 sm:block" />

      {/* Music */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-neutral-500">Music</span>
        <button
          type="button"
          onClick={() => music("toggle")}
          aria-label={musicEnabled ? "Pause music" : "Play music"}
          className={[ICON_BTN, "hover:text-aqua-300"].join(" ")}
        >
          <Icon name={musicEnabled ? "pause" : "play"} size={14} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={musicVolume}
          onChange={(event) => {
            const value = Number(event.target.value);
            setMusicVolume(value);
            music("volume", value);
          }}
          aria-label="Music volume"
          className="h-1 w-20 cursor-pointer accent-[#2E7D6B]"
        />
      </div>
    </div>
  );
}
