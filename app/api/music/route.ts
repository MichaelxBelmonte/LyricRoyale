import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getBed, getCachedSigla, isMusicGenerationAvailable, prewarmSigla } from "@/lib/server/music-bed";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bundled victory theme: the deterministic fallback for the "sigla finale" when a
// bespoke generated outro isn't cached yet (or music generation isn't configured).
// Read once and held in-process so the winners screen never waits on disk.
let mixtapeBytes: Buffer | null = null;
async function getMixtapeFallback(): Promise<Buffer> {
  if (mixtapeBytes) return mixtapeBytes;
  mixtapeBytes = await readFile(path.join(process.cwd(), "public", "audio", "soundclash-mixtape.mp3"));
  return mixtapeBytes;
}

function audio(bytes: Uint8Array, cache: string): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": cache },
  });
}

// Streams a generated instrumental bed for the audio mini-games. Generation is
// cached in-process, so repeat requests (TV + late joiners) are instant.
//
// Special case `?sigla=1` (the winners-screen victory theme): serve the bespoke
// generated outro the moment it's cached; until then stream the bundled mixtape
// asset so the most emotional beat NEVER stalls or errors. Prewarming at match
// start means the generated sigla is almost always ready by game-over.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  if (params.get("sigla")) {
    const ready = getCachedSigla();
    // No-store on the fallback so the browser re-requests once the generated sigla
    // lands (otherwise an early cache of the mixtape would mask the real outro).
    if (ready) return audio(ready, "public, max-age=3600");
    prewarmSigla();
    try {
      return audio(await getMixtapeFallback(), "no-store");
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: "Victory theme unavailable.", code: "sigla_unavailable" },
        { status: 502 },
      );
    }
  }

  if (!isMusicGenerationAvailable()) {
    return NextResponse.json<ErrorResponse>(
      { error: "Music generation is not configured.", code: "music_unavailable" },
      { status: 503 },
    );
  }
  try {
    const bytes = await getBed(params);
    return audio(bytes, "public, max-age=3600");
  } catch (err) {
    const code = err instanceof Error ? err.message : "music_failed";
    console.error("[music]", { code });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not generate the beat.", code: "music_failed" },
      { status: code === "invalid_bed_spec" ? 400 : 502 },
    );
  }
}
