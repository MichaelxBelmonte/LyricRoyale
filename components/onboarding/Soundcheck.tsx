"use client";

import { useState } from "react";
import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { CURATED_ARTISTS } from "@/lib/game/artists";
import { randomIdentity, type StageIdentity } from "@/lib/game/identity";
import type { SingerTeam } from "@/lib/types";

const MAX_ARTISTS = 4;

const FIELD =
  "w-full rounded-lg border border-black/15 bg-white px-3 text-[#15120E] outline-none transition-colors placeholder:text-black/35 focus:border-[#C2563B] focus:shadow-[0_0_0_3px_rgba(194,86,59,0.15)]";

interface SoundcheckProps {
  initialTeam?: SingerTeam | null;
  labels: Record<string, string>;
  onStart: (team: SingerTeam) => void;
}

export default function Soundcheck({ initialTeam, labels, onStart }: SoundcheckProps) {
  const [identity, setIdentity] = useState<StageIdentity>(() =>
    initialTeam?.playerName ? { stageName: initialTeam.playerName } : randomIdentity(),
  );
  const [artists, setArtists] = useState<string[]>(initialTeam?.artists ?? []);
  const [custom, setCustom] = useState("");

  function toggleArtist(name: string) {
    setArtists((current) => {
      if (current.includes(name)) return current.filter((a) => a !== name);
      if (current.length >= MAX_ARTISTS) return current;
      return [...current, name];
    });
  }

  function addCustom() {
    const value = custom.trim();
    if (!value || artists.length >= MAX_ARTISTS) return;
    if (!artists.some((a) => a.toLowerCase() === value.toLowerCase())) {
      setArtists((current) => [...current, value]);
    }
    setCustom("");
  }

  function buildTeam(identityValue: StageIdentity, artistList: string[]): SingerTeam {
    const name = identityValue.stageName.trim() || "Player";
    return { playerName: name, teamName: `${name} Crew`, artists: artistList };
  }

  function start() {
    if (artists.length === 0) return;
    onStart(buildTeam(identity, artists));
  }

  function surpriseMe() {
    const next = randomIdentity();
    const shuffled = [...CURATED_ARTISTS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((a) => a.name);
    setIdentity(next);
    setArtists(shuffled);
    onStart(buildTeam(next, shuffled));
  }

  const canStart = artists.length > 0;

  return (
    <JCard spine="SOUNDCHECK · SIDE A" contentClassName="p-6 sm:p-8">
      <header>
        <Sticker tone="tangerine" rotate={-4}>
          {labels.soundcheckEyebrow}
        </Sticker>
        <h1 className="mt-4 font-condensed text-3xl uppercase tracking-tight text-[#15120E] sm:text-4xl">
          {labels.soundcheckTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">{labels.soundcheckBody}</p>
      </header>

      {/* Identity */}
      <section className="mt-6 rounded-xl border border-black/12 bg-white/60 p-4">
        <div className="flex items-center gap-4">
          <Avatar name={identity.stageName} size="lg" />
          <div className="min-w-0 flex-1">
            <label className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              {labels.stageNameLabel}
            </label>
            <input
              value={identity.stageName}
              onChange={(event) => setIdentity({ stageName: event.target.value })}
              autoComplete="off"
              className={`${FIELD} mt-1 py-2 font-condensed text-lg`}
            />
          </div>
          <button
            type="button"
            onClick={() => setIdentity(randomIdentity())}
            aria-label={labels.rerollIdentity}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white text-black/55 transition-colors hover:border-[#C2563B] hover:text-[#A2452E]"
          >
            <Icon name="refresh" size={18} />
          </button>
        </div>
      </section>

      {/* Artists */}
      <section className="mt-4 rounded-xl border border-black/12 bg-white/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-condensed text-sm uppercase tracking-[0.16em] text-[#15120E]">
            {labels.pickArtistsTitle}
          </h2>
          <span className="font-mono text-xs tabular-nums text-black/45">
            {artists.length}/{MAX_ARTISTS} · {labels.pickArtistsHint}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CURATED_ARTISTS.map((artist) => {
            const selected = artists.includes(artist.name);
            const full = !selected && artists.length >= MAX_ARTISTS;
            return (
              <button
                key={artist.name}
                type="button"
                onClick={() => toggleArtist(artist.name)}
                disabled={full}
                aria-pressed={selected}
                className={[
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm font-medium transition-colors",
                  selected
                    ? "border-[#C2563B] bg-[#C2563B]/10 text-[#15120E]"
                    : full
                      ? "cursor-not-allowed border-black/10 bg-black/[0.03] text-black/30"
                      : "border-black/15 bg-white text-black/80 hover:border-black/40 hover:text-black",
                ].join(" ")}
              >
                <Avatar name={artist.name} size="sm" active={selected} />
                <span className="min-w-0 flex-1 truncate">{artist.name}</span>
                {selected ? <Icon name="check" size={15} className="text-[#A2452E]" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom();
              }
            }}
            placeholder={labels.addArtistPlaceholder}
            disabled={artists.length >= MAX_ARTISTS}
            autoComplete="off"
            className={`${FIELD} h-11 text-base disabled:opacity-50`}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim() || artists.length >= MAX_ARTISTS}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-black/20 px-4 font-condensed text-sm uppercase tracking-[0.04em] text-black/70 transition-colors hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="plus" size={16} />
            {labels.addArtistLabel}
          </button>
        </div>

        {artists.length > 0 ? (
          <div className="mt-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              {labels.lineupLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {artists.map((artist) => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => toggleArtist(artist)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C2563B]/40 bg-[#C2563B]/10 px-2.5 py-1.5 text-sm font-medium text-[#A2452E] transition-colors hover:border-[#C2563B]"
                >
                  {artist}
                  <Icon name="x" size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={start} disabled={!canStart} className="flex-1">
          {labels.startSession} ▶
        </Button>
        <Button variant="outlineDark" onClick={surpriseMe}>
          <Icon name="shuffle" size={16} />
          {labels.surpriseMe}
        </Button>
      </div>
    </JCard>
  );
}
