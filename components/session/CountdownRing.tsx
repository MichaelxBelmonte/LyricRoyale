"use client";

import { useEffect, useState } from "react";

// A self-ticking circular countdown synced to the round's endsAt, shown on the
// phone while the player still has to answer. Drains aqua → tangerine → terracotta
// as time runs out and pulses in the final seconds. Ticks on its own 200ms clock,
// independent of the 1s session poll, so it stays smooth.
export default function CountdownRing({
  endsAt,
  startedAt,
  size = 56,
}: {
  endsAt: number;
  startedAt: number;
  size?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, []);

  const total = Math.max(1, endsAt - startedAt);
  const remaining = Math.max(0, endsAt - now);
  const ratio = Math.max(0, Math.min(1, remaining / total));
  const seconds = Math.ceil(remaining / 1000);

  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ratio);

  const urgent = remaining <= 3000;
  const warn = remaining <= 6000;
  const color = urgent ? "#C2563B" : warn ? "#D99A3C" : "#2E7D6B";

  return (
    <span
      className={["relative inline-grid shrink-0 place-items-center", urgent ? "animate-blank-pulse" : ""].join(" ")}
      style={{ width: size, height: size }}
      aria-label={`${seconds}s`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.2s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span className={["absolute font-mono text-sm font-semibold tabular-nums", urgent ? "text-brand" : "text-ink"].join(" ")}>
        {seconds}
      </span>
    </span>
  );
}
