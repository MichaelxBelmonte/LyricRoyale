import { NextRequest, NextResponse } from "next/server";
import { joinSession } from "@/lib/server/session-store";
import type { JoinSessionInput } from "@/lib/session/types";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ code: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as JoinSessionInput;
  try {
    return NextResponse.json(joinSession(code, body));
  } catch {
    return NextResponse.json<ErrorResponse>(
      { error: "Could not join this session.", code: "join_failed" },
      { status: 404 },
    );
  }
}
