import { NextRequest, NextResponse } from "next/server";
import { buildFinishLineRound } from "@/lib/game/finish-line";
import { getTrackLyrics } from "@/lib/server/musixmatch";
import type { ErrorResponse, FinishLineResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { trackId?: unknown } | null;
  const trackId = Number(body?.trackId);

  if (!Number.isInteger(trackId) || trackId <= 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid trackId.", code: "invalid_track_id" },
      { status: 400 },
    );
  }

  try {
    const lyrics = await getTrackLyrics(trackId);
    const round = buildFinishLineRound({
      trackId,
      lyrics: lyrics.body,
      copyright: lyrics.copyright,
      tracking: lyrics.tracking,
    });
    return NextResponse.json<FinishLineResponse>({ round });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown finish-line error";
    console.error("[round.finish-line]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not build a lyric round for this song.", code: "round_failed" },
      { status: 502 },
    );
  }
}
