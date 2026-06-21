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
  onSpeakIntro: () => void;
}

function music(action: string, value?: number | boolean) {
  window.dispatchEvent(new CustomEvent("soundclash:audio-control", { detail: { action, value } }));
}

const ICON_BTN =
  "flex h-6 w-6 shrink-0 items-center justify-center text-black/45 transition-colors disabled:cursor-not-allowed disabled:opacity-30";
const SLIDER = "h-1 w-24 cursor-pointer";

/**
 * Host voice + background music controls on one clean, borderless row — minimal by
 * design so it never competes with the show. Ducking (HostRoom + AudioDirector)
 * keeps the two from fighting.
 */
export default function AudioConsole({
  hostVolume,
  hostMuted,
  speaking,
  onHostVolume,
  onToggleHostMute,
  onStopSpeech,
  onSpeakIntro,
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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
      {/* Host voice */}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={[
            "h-1.5 w-1.5 shrink-0 rounded-full",
            speaking ? "animate-pulse bg-aqua" : "bg-black/25",
          ].join(" ")}
        />
        <button
          type="button"
          onClick={onToggleHostMute}
          aria-pressed={hostMuted}
          aria-label={hostMuted ? "Unmute host voice" : "Mute host voice"}
          className={[ICON_BTN, hostMuted ? "text-brand" : "hover:text-ink"].join(" ")}
        >
          <Icon name={hostMuted ? "volumeX" : "volume2"} size={15} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={hostMuted ? 0 : hostVolume}
          onChange={(event) => onHostVolume(Number(event.target.value))}
          aria-label="Host voice volume"
          className={`${SLIDER} accent-[#C2563B]`}
        />
        <button
          type="button"
          onClick={onSpeakIntro}
          disabled={speaking}
          className="inline-flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-black/55 transition-colors hover:text-brand disabled:opacity-40"
        >
          <Icon name="play" size={11} />
          {speaking ? "Speaking…" : "Intro"}
        </button>
        {speaking ? (
          <button
            type="button"
            onClick={onStopSpeech}
            aria-label="Stop the host talking"
            className={[ICON_BTN, "hover:text-brand"].join(" ")}
          >
            <Icon name="stop" size={12} />
          </button>
        ) : null}
      </div>

      {/* Music */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => music("toggle")}
          aria-label={musicEnabled ? "Pause music" : "Play music"}
          className={[ICON_BTN, "hover:text-aqua"].join(" ")}
        >
          <Icon name={musicEnabled ? "pause" : "play"} size={15} />
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
          className={`${SLIDER} accent-[#2E7D6B]`}
        />
      </div>
    </div>
  );
}
