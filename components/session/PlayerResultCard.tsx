"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
import Avatar from "@/components/ui/Avatar";
import { MusixmatchCredit } from "@/components/session/MusixmatchTracking";
import { useCountUp } from "@/lib/client/useCountUp";
import { copy, ordinal } from "@/lib/i18n";
import type { PublicSessionState } from "@/lib/session/types";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The personal end-of-match card on the phone: where YOU placed, your final score,
// and who you were chasing — so even 5th place gets a clear, brag-worthy payoff
// instead of re-reading the last round's answer list.
export default function PlayerResultCard({
  session,
  playerId,
}: {
  session: PublicSessionState;
  playerId: string;
}) {
  const t = copy[session.locale];
  const players = session.players;
  const total = players.length;
  const myIndex = players.findIndex((p) => p.id === playerId);
  const me = myIndex >= 0 ? players[myIndex] : null;
  const rank = myIndex + 1;
  const score = useCountUp(me?.score ?? 0);
  const [copied, setCopied] = useState(false);

  const isChamp = rank === 1;
  const tone = isChamp ? "yellow" : rank <= Math.ceil(total / 3) ? "aqua" : "tangerine";

  // One celebratory buzz when the card first appears (never on the 1s poll).
  const buzzed = useRef(false);
  useEffect(() => {
    if (buzzed.current || !me) return;
    buzzed.current = true;
    if (!prefersReducedMotion() && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(isChamp ? [0, 60, 50, 120] : [0, 40]);
    }
  }, [me, isChamp]);

  // The two players bracketing me, so the strip shows who I beat / who to chase.
  const neighbors = players.slice(Math.max(0, myIndex - 1), myIndex + 2);

  function brag() {
    if (!me) return;
    const text = t.bragText
      .replace("{place}", ordinal(rank, session.locale))
      .replace("{total}", String(total))
      .replace("{score}", String(me.score))
      .replace("{code}", session.code);
    const url = typeof window !== "undefined" ? `${window.location.origin}/join?code=${session.code}` : undefined;
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      void nav.share({ text, url }).catch(() => {});
      return;
    }
    void nav?.clipboard
      ?.writeText(url ? `${text} ${url}` : text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const round = session.currentRound;

  return (
    <div className="animate-slam-in">
      <JCard spine="MATCH · COMPLETE" contentClassName="p-6 text-center">
        <div className="flex justify-center">
          <Sticker tone={tone} rotate={-3}>
            {t.youFinishedLabel}
          </Sticker>
        </div>

        {isChamp ? <div className="mt-4 text-4xl">👑</div> : null}
        <p
          className={[
            "mt-3 font-condensed uppercase leading-none tracking-tight",
            isChamp ? "holo text-6xl" : "text-6xl text-[#15120E]",
          ].join(" ")}
        >
          {isChamp ? t.championLabel : ordinal(rank, session.locale)}
        </p>
        {!isChamp ? (
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-black/45">
            {t.outOfLabel} {total}
          </p>
        ) : null}

        <div className="mt-5 rounded-xl border border-black/12 bg-white/70 p-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-black/45">{t.finalScoreLine}</p>
          <p className="led mt-1 text-5xl tabular-nums">{score}</p>
        </div>

        {neighbors.length > 1 ? (
          <div className="mt-5 grid gap-1.5">
            {neighbors.map((player) => {
              const place = players.findIndex((p) => p.id === player.id) + 1;
              const mine = player.id === playerId;
              return (
                <div
                  key={player.id}
                  className={[
                    "grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-lg border px-3 py-2",
                    mine ? "border-[#C2563B]/40 bg-[#C2563B]/10" : "border-black/10 bg-white/60",
                  ].join(" ")}
                >
                  <span className="font-mono text-xs tabular-nums text-black/40">{place}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={player.name} emoji={player.avatar} size="sm" />
                    <span className={mine ? "truncate font-semibold text-[#15120E]" : "truncate text-black/70"}>
                      {player.name}
                    </span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-[#15120E]">{player.score}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <Button type="button" variant="magenta" full className="mt-6" onClick={brag}>
          {copied ? t.copiedLabel : t.bragAboutIt}
        </Button>
      </JCard>

      {round?.copyright ? (
        <MusixmatchCredit
          roundKey={`${session.code}:${round.index}:${round.trackId}`}
          copyright={round.copyright}
          tracking={round.tracking}
          className="mt-6 text-center text-[0.62rem] leading-4 text-black/45"
        />
      ) : null}
    </div>
  );
}
