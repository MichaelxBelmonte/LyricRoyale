import { NextRequest, NextResponse } from "next/server";
import { getGenreTracks, searchTracksByArtist } from "@/lib/server/musixmatch";
import type { ErrorResponse, TracksResponse } from "@/lib/types";

// Server-side proxy: pull a setlist's worth of tracks by artist name or by genre.
// MXM_KEY never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get("artist")?.trim();
  const genreId = Number(req.nextUrl.searchParams.get("genreId"));
  const hasGenre = Number.isInteger(genreId) && genreId > 0;

  if (!artist && !hasGenre) {
    return NextResponse.json<ErrorResponse>(
      { error: "Provide an 'artist' or 'genreId'.", code: "missing_query" },
      { status: 400 },
    );
  }

  try {
    const results = artist ? await searchTracksByArtist(artist) : await getGenreTracks(genreId);
    return NextResponse.json<TracksResponse>({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Musixmatch tracks error";
    console.error("[mxm.tracks]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not load tracks. Please try again.", code: "provider_error" },
      { status: 502 },
    );
  }
}
