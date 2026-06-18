import { NextResponse } from "next/server";
import { checkTasks } from "@/lib/server/lalal";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ taskId: string }>;
}

export async function GET(_: Request, { params }: Params) {
  const { taskId } = await params;
  if (!taskId.trim()) {
    return NextResponse.json<ErrorResponse>(
      { error: "taskId required.", code: "task_id_required" },
      { status: 400 },
    );
  }

  try {
    const check = await checkTasks([taskId]);
    return NextResponse.json({ taskId, result: check.result[taskId] ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown LALAL check error";
    console.error("[lalal.check]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not check LALAL task.", code: "lalal_check_failed" },
      { status: 502 },
    );
  }
}
