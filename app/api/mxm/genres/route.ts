import { NextResponse } from "next/server";
import { getGenres } from "@/lib/server/musixmatch";
import type { ErrorResponse, GenresResponse } from "@/lib/types";

// Server-side proxy: the browser calls /api/mxm/genres; MXM_KEY never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const genres = await getGenres();
    return NextResponse.json<GenresResponse>({ genres });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Musixmatch genres error";
    console.error("[mxm.genres]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not load genres.", code: "provider_error" },
      { status: 502 },
    );
  }
}
