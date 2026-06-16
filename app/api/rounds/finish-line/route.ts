import { NextRequest, NextResponse } from "next/server";
import { buildFinishLineRound, computeDrop } from "@/lib/game/finish-line";
import { getRichsyncLines, getTrackLyrics } from "@/lib/server/musixmatch";
import type { ErrorResponse, FinishLineDrop, FinishLineResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { trackId?: unknown; seed?: unknown }
    | null;
  const trackId = Number(body?.trackId);
  const seed = Math.max(0, Number(body?.seed ?? 0));

  if (!Number.isInteger(trackId) || trackId <= 0 || !Number.isFinite(seed)) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid trackId.", code: "invalid_track_id" },
      { status: 400 },
    );
  }

  try {
    const lyrics = await getTrackLyrics(trackId);
    // Only `round` (prompt + refs) goes to the client — the answer stays server-side
    // and is validated via /api/rounds/check.
    const { round, answer, line } = buildFinishLineRound({
      trackId,
      seed,
      lyrics: lyrics.body,
      copyright: lyrics.copyright,
      tracking: lyrics.tracking,
    });

    // Add richsync "Drop" timing when a richsync line matches the chosen line.
    // Never blocks the round: no richsync / no match → static blank.
    let drop: FinishLineDrop | null = null;
    try {
      const richsyncLines = await getRichsyncLines(trackId);
      drop = computeDrop(line, answer, richsyncLines);
    } catch {
      // Track has no richsync — fine, play with a static blank.
    }

    return NextResponse.json<FinishLineResponse>({ round: drop ? { ...round, drop } : round });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown finish-line error";
    console.error("[round.finish-line]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not build a lyric round for this song.", code: "round_failed" },
      { status: 502 },
    );
  }
}
