import { NextRequest, NextResponse } from "next/server";
import { backToLobby, getSession, revealRound, setMiniGames, touchPlayer } from "@/lib/server/session-store";
import type { MiniGameId } from "@/lib/session/types";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ code: string }>;
}

function error(status = 404) {
  return NextResponse.json<ErrorResponse>(
    { error: "Session not found.", code: "session_not_found" },
    { status },
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const playerId = req.nextUrl.searchParams.get("playerId");
  try {
    const session = playerId ? touchPlayer(code, playerId) : getSession(code);
    return NextResponse.json({ session });
  } catch {
    return error();
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; miniGames?: MiniGameId[] };
  try {
    if (body.action === "reveal") return NextResponse.json({ session: revealRound(code) });
    if (body.action === "lobby") return NextResponse.json({ session: backToLobby(code) });
    if (body.action === "configure") return NextResponse.json({ session: setMiniGames(code, body.miniGames ?? []) });
    return NextResponse.json<ErrorResponse>(
      { error: "Invalid session action.", code: "invalid_session_action" },
      { status: 400 },
    );
  } catch {
    return error();
  }
}
