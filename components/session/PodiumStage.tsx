"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
import { MusixmatchTracking } from "@/components/session/MusixmatchTracking";
import { useCountUp } from "@/lib/client/useCountUp";
import { copy, ordinal } from "@/lib/i18n";
import type { PublicSessionState, SessionPlayer } from "@/lib/session/types";

// Per-rank visual tokens — a warm-editorial cassette podium, not a generic chart.
const RANK = {
  1: { h: "h-36 sm:h-44", plinth: "bg-gradient-to-b from-tangerine/35 to-tangerine/10 border-tangerine/45", num: "text-tangerine-600" },
  2: { h: "h-24 sm:h-28", plinth: "bg-gradient-to-b from-aqua/30 to-aqua/8 border-aqua/40", num: "text-aqua-600" },
  3: { h: "h-20 sm:h-24", plinth: "bg-gradient-to-b from-brand/30 to-brand/8 border-brand/40", num: "text-brand" },
} as const;

export default function PodiumStage({
  session,
  onRestart,
  onLobby,
}: {
  session: PublicSessionState;
  onRestart: () => void;
  onLobby: () => void;
}) {
  const t = copy[session.locale];
  const players = session.players;
  const champion = players[0];
  const podium = players.slice(0, 3);
  const alsoRan = players.slice(3);
  const round = session.currentRound;

  // Solo / duo shows have no real podium — spotlight the winner instead of leaving
  // empty plinths. >=3 players gets the full three-cassette podium.
  const soloMode = players.length <= 2;

  return (
    <section className="relative mt-5 overflow-hidden">
      <TapeBurst code={session.code} />
      <div className="relative">
        <div className="flex items-center justify-center gap-3">
          <Sticker tone="yellow" rotate={-4}>
            {t.championLabel}
          </Sticker>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-black/45">{t.finalStandings}</p>
        </div>

        {champion ? (
          <h2 className="holo mt-3 text-center font-condensed text-4xl uppercase leading-none tracking-tight sm:text-6xl">
            {champion.name}
          </h2>
        ) : null}

        {soloMode ? (
          <SoloCard session={session} />
        ) : (
          <div className="mt-8 flex items-end justify-center gap-3 sm:gap-6">
            {podium[1] ? <PodiumColumn player={podium[1]} rank={2} delayMs={120} /> : null}
            {podium[0] ? <PodiumColumn player={podium[0]} rank={1} delayMs={0} champion /> : null}
            {podium[2] ? <PodiumColumn player={podium[2]} rank={3} delayMs={220} /> : null}
          </div>
        )}

        {alsoRan.length ? (
          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {alsoRan.map((player, index) => (
              <span
                key={player.id}
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] py-1 pl-1 pr-3"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-black/[0.06] font-mono text-[0.6rem] tabular-nums text-black/55">
                  {index + 4}
                </span>
                <Avatar name={player.name} emoji={player.avatar} size="sm" />
                <span className="max-w-[8rem] truncate text-sm text-ink">{player.name}</span>
                <span className="font-mono text-xs tabular-nums text-black/45">{player.score}</span>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-2">
          <Button variant="magenta" full onClick={onRestart}>
            {t.runItBack} ↻
          </Button>
          <button
            type="button"
            onClick={onLobby}
            className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ink"
          >
            {t.backToLobbyLabel}
          </button>
        </div>

        {/* Compliance: if the last round rendered lyrics, keep the Musixmatch
            attribution + tracking pixel alive on the screen that replaces it. */}
        {round?.copyright ? (
          <>
            <MusixmatchTracking roundKey={`${session.code}:${round.index}:${round.trackId}`} tracking={round.tracking} />
            <p className="mx-auto mt-6 max-w-2xl text-center text-[0.62rem] leading-4 text-black/40">{round.copyright}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}

function PodiumColumn({
  player,
  rank,
  delayMs,
  champion = false,
}: {
  player: SessionPlayer;
  rank: 1 | 2 | 3;
  delayMs: number;
  champion?: boolean;
}) {
  const score = useCountUp(player.score);
  const tokens = RANK[rank];
  const delay: CSSProperties = { animationDelay: `${delayMs}ms` };

  return (
    <div className="flex w-28 flex-col items-center sm:w-36">
      <div className={champion ? "animate-slam-in text-center" : "animate-pop-in text-center"} style={delay}>
        {champion ? <div className="text-2xl leading-none sm:text-3xl">👑</div> : null}
        <div className="mt-1 flex justify-center">
          <Avatar name={player.name} emoji={player.avatar} size={champion ? "lg" : "md"} active={champion} />
        </div>
        <p className="mt-2 max-w-full truncate font-condensed text-sm uppercase tracking-[0.03em] text-ink sm:text-base">
          {player.name}
        </p>
        <p className={["led tabular-nums", champion ? "text-3xl sm:text-4xl" : "text-2xl"].join(" ")}>{score}</p>
      </div>
      <div
        className={["mt-3 grid w-full origin-bottom animate-podium-rise place-items-center rounded-t-xl border-2 border-b-0", tokens.h, tokens.plinth].join(" ")}
        style={delay}
      >
        <span className={["font-condensed text-4xl leading-none sm:text-5xl", tokens.num].join(" ")}>{rank}</span>
      </div>
    </div>
  );
}

// 1-2 players: a single spotlight J-card instead of a lopsided podium.
function SoloCard({ session }: { session: PublicSessionState }) {
  const t = copy[session.locale];
  const [first, second] = session.players;
  const score = useCountUp(first?.score ?? 0);
  return (
    <div className="mx-auto mt-7 max-w-md animate-slam-in">
      <JCard spine="SIDE A · WINNER" contentClassName="p-6 text-center">
        <div className="flex justify-center">
          <Sticker tone="yellow" rotate={-3}>
            {session.players.length <= 1 ? t.soloRunLabel : t.championLabel}
          </Sticker>
        </div>
        {first ? (
          <>
            <div className="mt-4 flex justify-center text-3xl">👑</div>
            <div className="mt-1 flex justify-center">
              <Avatar name={first.name} emoji={first.avatar} size="lg" active />
            </div>
            <p className="mt-2 font-condensed text-3xl uppercase tracking-tight text-[#15120E]">{first.name}</p>
            <p className="led mt-1 text-5xl tabular-nums">{score}</p>
          </>
        ) : null}
        {second ? (
          <div className="mt-5 flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2">
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-black/40">2</span>
              <Avatar name={second.name} emoji={second.avatar} size="sm" />
              <span className="truncate text-sm text-ink">{second.name}</span>
            </span>
            <span className="font-mono text-sm tabular-nums text-black/55">{second.score}</span>
          </div>
        ) : null}
      </JCard>
    </div>
  );
}

// Deterministic FNV-1a hash so the tape-burst layout is stable across the host's
// 1.2s poll re-renders (Math.random would re-roll every tick).
function hashCode(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAPE_COLORS = ["#C2563B", "#2E7D6B", "#D99A3C", "#ffd400", "#15120E"];

// A cassette tape-burst: thin unspooled ribbon strips + paper chips scattering over
// the podium, in the strict brand palette — reads as a mixtape award show, never a
// generic confetti popper. Fired once on mount; seeded from the room code so it's
// deterministic. Under reduced-motion the strips simply rest in their final spots.
function TapeBurst({ code }: { code: string }) {
  const strips = useMemo(() => {
    const rand = mulberry32(hashCode(code) || 1);
    return Array.from({ length: 12 }, (_, i) => {
      const ribbon = i % 2 === 0;
      return {
        left: 4 + rand() * 92,
        top: -2 + rand() * 20,
        rot: Math.round((rand() * 2 - 1) * 42),
        delay: Math.round(rand() * 380),
        color: TAPE_COLORS[Math.floor(rand() * TAPE_COLORS.length)],
        width: ribbon ? 3 : 9,
        height: ribbon ? 26 + Math.round(rand() * 22) : 6,
        radius: ribbon ? 2 : 1,
      };
    });
  }, [code]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {strips.map((s, i) => (
        <span
          key={i}
          className="absolute animate-tape-fall"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: `${s.width}px`,
              height: `${s.height}px`,
              backgroundColor: s.color,
              borderRadius: `${s.radius}px`,
              animationDelay: `${s.delay}ms`,
              "--tape-rot": `${s.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
