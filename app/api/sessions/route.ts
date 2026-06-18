import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/server/session-store";
import type { CreateSessionInput } from "@/lib/session/types";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateSessionInput;
    return NextResponse.json({ session: createSession(body) });
  } catch {
    return NextResponse.json<ErrorResponse>(
      { error: "Could not create a session.", code: "session_create_failed" },
      { status: 500 },
    );
  }
}
