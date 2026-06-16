import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/server/musixmatch";
import type { ErrorResponse, SearchResponse } from "@/lib/types";

// Server-side proxy: the browser calls /api/mxm/search; MXM_KEY never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json<ErrorResponse>(
      { error: "Missing query param 'q'.", code: "missing_query" },
      { status: 400 },
    );
  }

  try {
    const results = await searchTracks(q);
    return NextResponse.json<SearchResponse>({ query: q, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Musixmatch search error";
    console.error("[mxm.search]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Search failed. Please try again.", code: "provider_error" },
      { status: 502 },
    );
  }
}
