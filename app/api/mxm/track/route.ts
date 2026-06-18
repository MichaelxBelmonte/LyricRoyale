import { NextRequest, NextResponse } from "next/server";
import { getTrack } from "@/lib/server/musixmatch";
import type { ErrorResponse, TrackResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resolve a TrackSummary from a trackId — used when opening a challenge link,
// which carries only the reference, not track metadata.
export async function GET(req: NextRequest) {
  const trackId = Number(req.nextUrl.searchParams.get("trackId"));

  if (!Number.isInteger(trackId) || trackId <= 0) {
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid trackId.", code: "invalid_track_id" },
      { status: 400 },
    );
  }

  try {
    const track = await getTrack(trackId);
    return NextResponse.json<TrackResponse>({ track });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown track error";
    console.error("[mxm.track]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not load this track.", code: "track_failed" },
      { status: 502 },
    );
  }
}
