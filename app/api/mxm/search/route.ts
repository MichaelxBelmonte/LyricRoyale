import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/server/musixmatch";

// Server-side proxy: the browser calls /api/mxm/search; MXM_KEY never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query param 'q'." }, { status: 400 });
  }
  try {
    const results = await searchTracks(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/mxm/search]", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 502 });
  }
}
