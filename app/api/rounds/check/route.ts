import { NextRequest, NextResponse } from "next/server";
import { buildFinishLineRound, normalizeAnswer } from "@/lib/game/finish-line";
import { getTrackLyrics } from "@/lib/server/musixmatch";
import type { CheckResponse, ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validates a guess against the answer the SERVER regenerates from the same
// (trackId, seed). The answer is never sent to the client until this resolution,
// so it can't be read out of the round payload ahead of time.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { trackId?: unknown; seed?: unknown; guess?: unknown }
    | null;
  const trackId = Number(body?.trackId);
  const seed = Math.max(0, Number(body?.seed ?? 0));
  const guess = typeof body?.guess === "string" ? body.guess : "";

  if (!Number.isInteger(trackId) || trackId <= 0 || !Number.isFinite(seed)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid trackId.", code: "invalid_track_id" },
      { status: 400 },
    );
  }

  try {
    const lyrics = await getTrackLyrics(trackId);
    const { answer } = buildFinishLineRound({
      trackId,
      seed,
      lyrics: lyrics.body,
      copyright: lyrics.copyright,
      tracking: lyrics.tracking,
    });
    const correct = normalizeAnswer(guess) === normalizeAnswer(answer);
    return NextResponse.json<CheckResponse>({ correct, answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown check error";
    console.error("[round.check]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not verify this round.", code: "check_failed" },
      { status: 502 },
    );
  }
}
