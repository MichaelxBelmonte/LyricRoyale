"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { CURATED_ARTISTS } from "@/lib/game/artists";
import { randomIdentity, type StageIdentity } from "@/lib/game/identity";
import type { SingerTeam } from "@/lib/types";

const MAX_ARTISTS = 4;

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
    <div className="flex flex-col gap-5">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">
          {labels.soundcheckEyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
          {labels.soundcheckTitle}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">{labels.soundcheckBody}</p>
      </header>

      {/* Identity */}
      <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <Avatar name={identity.stageName} size="lg" />
          <div className="min-w-0 flex-1">
            <label className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
              {labels.stageNameLabel}
            </label>
            <input
              value={identity.stageName}
              onChange={(event) => setIdentity({ stageName: event.target.value })}
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-display text-lg font-semibold text-white outline-none transition-colors focus:border-brand"
            />
          </div>
          <button
            type="button"
            onClick={() => setIdentity(randomIdentity())}
            aria-label={labels.rerollIdentity}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-neutral-800 text-neutral-400 transition-colors hover:border-brand hover:text-brand-300"
          >
            <Icon name="refresh" size={18} />
          </button>
        </div>
      </section>

      {/* Artists */}
      <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
            {labels.pickArtistsTitle}
          </h2>
          <span className="font-mono text-xs tabular-nums text-neutral-500">
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
                  "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm font-medium transition-colors",
                  selected
                    ? "border-brand bg-brand/10 text-white"
                    : full
                      ? "cursor-not-allowed border-neutral-850 bg-neutral-950/40 text-neutral-600"
                      : "border-neutral-800 bg-neutral-950 text-neutral-200 hover:border-neutral-700 hover:text-white",
                ].join(" ")}
              >
                <Avatar name={artist.name} size="sm" active={selected} />
                <span className="min-w-0 flex-1 truncate">{artist.name}</span>
                {selected ? <Icon name="check" size={15} className="text-brand-300" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
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
            className="h-11 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-brand disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim() || artists.length >= MAX_ARTISTS}
            className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-neutral-800 px-4 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="plus" size={16} />
            {labels.addArtistLabel}
          </button>
        </div>

        {artists.length > 0 ? (
          <div className="mt-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
              {labels.lineupLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {artists.map((artist) => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => toggleArtist(artist)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1.5 text-sm font-medium text-brand-300 transition-colors hover:border-brand hover:text-white"
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
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="h-12 rounded-md bg-brand text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
        >
          {labels.startSession}
        </button>
        <button
          type="button"
          onClick={surpriseMe}
          className="flex h-12 items-center justify-center gap-2 rounded-md border border-neutral-800 px-6 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <Icon name="shuffle" size={16} />
          {labels.surpriseMe}
        </button>
      </div>
    </div>
  );
}
