import { NextRequest, NextResponse } from "next/server";
import { splitStem, uploadSource, type LalalStem } from "@/lib/server/lalal";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LAB_UPLOAD_BYTES = 60 * 1024 * 1024;
const STEMS: LalalStem[] = [
  "vocals",
  "drum",
  "bass",
  "piano",
  "electric_guitar",
  "acoustic_guitar",
  "synthesizer",
  "strings",
  "wind",
];

function parseStem(value: FormDataEntryValue | null): LalalStem {
  return typeof value === "string" && STEMS.includes(value as LalalStem)
    ? (value as LalalStem)
    : "vocals";
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const stem = parseStem(form.get("stem"));

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: "Audio file required.", code: "file_required" },
        { status: 400 },
      );
    }

    if (file.size > MAX_LAB_UPLOAD_BYTES) {
      return NextResponse.json<ErrorResponse>(
        { error: "File is too large for the local lab.", code: "file_too_large" },
        { status: 413 },
      );
    }

    const upload = await uploadSource(file);
    const task = await splitStem(upload.id, stem);
    return NextResponse.json({ upload, task, stem });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown LALAL error";
    console.error("[lalal.stems]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not start LALAL stem separation.", code: "lalal_split_failed" },
      { status: 502 },
    );
  }
}
