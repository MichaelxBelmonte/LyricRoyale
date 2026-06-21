"use client";

import { useEffect } from "react";
import type { TrackingLinks } from "@/lib/types";

/**
 * Fires the Musixmatch tracking pixel + script for the active round. Renders
 * nothing. Required by the Musixmatch API terms whenever lyric content is shown
 * (host screen AND player phones). `roundKey` re-fires the trackers per round.
 */
export function MusixmatchTracking({ roundKey, tracking }: { roundKey?: string; tracking?: TrackingLinks }) {
  useEffect(() => {
    if (!roundKey || !tracking?.pixel) return;
    const pixel = new Image();
    pixel.referrerPolicy = "no-referrer";
    pixel.src = tracking.pixel;
  }, [roundKey, tracking?.pixel]);

  useEffect(() => {
    if (!roundKey || !tracking?.script) return;
    const script = document.createElement("script");
    script.src = tracking.script;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    document.body.appendChild(script);
    return () => script.remove();
  }, [roundKey, tracking?.script]);

  return null;
}

/**
 * Musixmatch attribution: fires the trackers AND renders the required copyright
 * line. Use this anywhere lyric-derived text reaches the screen. Renders nothing
 * when there is no copyright string to show.
 */
export function MusixmatchCredit({
  roundKey,
  copyright,
  tracking,
  className,
}: {
  roundKey?: string;
  copyright?: string;
  tracking?: TrackingLinks;
  className?: string;
}) {
  if (!copyright) return null;
  return (
    <>
      <MusixmatchTracking roundKey={roundKey} tracking={tracking} />
      <p className={className ?? "mt-6 text-xs leading-5 text-black/45"}>{copyright}</p>
    </>
  );
}
