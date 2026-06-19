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

/**
 * Host audio mixer: the AI voice and the background music on one strip, each with
 * its own volume. Voice has a stop; music has play/pause. The voice always ducks
 * the music while it talks (handled in HostRoom + AudioDirector), so they never
 * fight — these sliders just set the resting balance.
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
    <div className="grid gap-3 rounded-xl border border-neutral-850 bg-neutral-950 p-3 sm:grid-cols-2">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-500">
            Host voice {speaking ? <span className="text-aqua-300">· speaking</span> : null}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleHostMute}
              aria-pressed={hostMuted}
              title={hostMuted ? "Unmute host voice" : "Mute host voice"}
              className={[
                "grid h-7 w-7 place-items-center rounded-md border transition-colors",
                hostMuted
                  ? "border-brand bg-brand/10 text-brand-300"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white",
              ].join(" ")}
            >
              <Icon name={hostMuted ? "volumeX" : "volume2"} size={14} />
            </button>
            <button
              type="button"
              onClick={onStopSpeech}
              disabled={!speaking}
              title="Stop the host talking"
              className="grid h-7 w-7 place-items-center rounded-md border border-neutral-800 text-neutral-400 transition-colors hover:border-brand hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="stop" size={13} />
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={hostMuted ? 0 : hostVolume}
          onChange={(event) => onHostVolume(Number(event.target.value))}
          aria-label="Host voice volume"
          className="mt-2 h-1.5 w-full cursor-pointer accent-[#ff007f]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-500">Music</span>
          <button
            type="button"
            onClick={() => music("toggle")}
            title={musicEnabled ? "Pause music" : "Play music"}
            className="grid h-7 w-7 place-items-center rounded-md border border-neutral-800 text-neutral-400 transition-colors hover:border-aqua hover:text-aqua-300"
          >
            <Icon name={musicEnabled ? "pause" : "play"} size={14} />
          </button>
        </div>
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
          className="mt-2 h-1.5 w-full cursor-pointer accent-[#00e5d2]"
        />
      </div>
    </div>
  );
}
