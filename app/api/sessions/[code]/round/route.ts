import { NextRequest, NextResponse } from "next/server";
import { startRound, submitAnswer } from "@/lib/server/session-store";
import type { StartRoundInput, SubmitAnswerInput } from "@/lib/session/types";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ code: string }>;
}

function toError(error: unknown) {
  const code = error instanceof Error ? error.message : "round_failed";
  const status = code === "session_not_found" ? 404 : 400;
  return NextResponse.json<ErrorResponse>(
    { error: "Could not update this round.", code },
    { status },
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as StartRoundInput;
  try {
    return NextResponse.json({ session: await startRound(code, body) });
  } catch (err) {
    return toError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as SubmitAnswerInput;
  try {
    return NextResponse.json(await submitAnswer(code, body));
  } catch (err) {
    return toError(err);
  }
}
