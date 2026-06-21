"use client";

import { useState, type FormEvent } from "react";
import type { SingerTeam } from "@/lib/types";

const slotKeys = ["leadSlot", "rapperSlot", "divaSlot", "wildcardSlot"] as const;

interface TeamBuilderProps {
  initialTeam?: SingerTeam | null;
  labels: Record<string, string>;
  onSubmit: (team: SingerTeam) => void;
}

export default function TeamBuilder({ initialTeam, labels, onSubmit }: TeamBuilderProps) {
  const [playerName, setPlayerName] = useState(initialTeam?.playerName ?? "");
  const [teamName, setTeamName] = useState(initialTeam?.teamName ?? "");
  const [artists, setArtists] = useState(() => {
    const values = initialTeam?.artists ?? [];
    return Array.from({ length: 4 }, (_, index) => values[index] ?? "");
  });
  const hasArtist = artists.some((artist) => artist.trim().length > 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanArtists = artists.map((artist) => artist.trim()).filter(Boolean);
    if (cleanArtists.length === 0) return;
    onSubmit({
      playerName: playerName.trim() || "Player",
      teamName: teamName.trim() || "Lyric Squad",
      artists: cleanArtists,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-black/10 bg-paper-raised p-4 shadow-2xl shadow-black/10 sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#A2452E]">
        {labels.setupEyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">{labels.setupTitle}</h2>
      <p className="mt-2 text-sm leading-6 text-black/55">{labels.setupBody}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field
          label={labels.playerNameLabel}
          value={playerName}
          placeholder={labels.playerNamePlaceholder}
          onChange={setPlayerName}
        />
        <Field
          label={labels.teamNameLabel}
          value={teamName}
          placeholder={labels.teamNamePlaceholder}
          onChange={setTeamName}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {slotKeys.map((key, index) => (
          <Field
            key={key}
            label={labels[key]}
            value={artists[index]}
            placeholder={labels.artistPlaceholder}
            onChange={(value) =>
              setArtists((current) => current.map((artist, i) => (i === index ? value : artist)))
            }
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={!hasArtist}
        className="mt-5 h-12 w-full rounded-lg bg-[#C2563B] px-5 font-semibold text-white transition hover:bg-[#A2452E] disabled:cursor-not-allowed disabled:bg-black/[0.06] disabled:text-black/35"
      >
        {labels.startSession}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-black/45">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-black/15 bg-white px-4 text-ink outline-none transition placeholder:text-black/35 focus:border-[#C2563B] focus:ring-2 focus:ring-[#C2563B]/25"
      />
    </label>
  );
}
