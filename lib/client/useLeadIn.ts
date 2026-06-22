"use client";

import { useEffect, useState } from "react";

// Pre-round "get ready" window. Given a round's answer-window open time
// (`startedAt`, an absolute server timestamp pushed ROUND_LEAD_IN_MS into the
// future when the round is created), reports how many whole seconds remain
// before answering opens. `active` is true only while we're still in the lead-in
// (now < startedAt); it flips to false the moment the window opens and stays
// there. Ticks on its own 200ms clock so the 3-2-1 stays crisp, independent of
// the ~1s session poll, and stops ticking as soon as the window opens.
export function useLeadIn(startedAt: number): { active: boolean; seconds: number } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t0 = Date.now();
    setNow(t0);
    if (t0 >= startedAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= startedAt) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const remaining = Math.max(0, startedAt - now);
  return { active: remaining > 0, seconds: Math.ceil(remaining / 1000) };
}
