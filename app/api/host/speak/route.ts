import { NextRequest, NextResponse } from "next/server";
import { isSupportedLanguage } from "@/lib/game/languages";
import { createSpeech } from "@/lib/server/elevenlabs";
import type { HostVoicePreset } from "@/lib/session/types";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        text?: unknown;
        preset?: unknown;
        voiceId?: unknown;
        languageCode?: unknown;
      }
    | null;
  const text = typeof body?.text === "string" ? body.text : "";
  const preset = typeof body?.preset === "string" ? (body.preset as HostVoicePreset) : "hype";
  const voiceId = typeof body?.voiceId === "string" ? body.voiceId : undefined;
  const languageCode = isSupportedLanguage(body?.languageCode) ? body.languageCode : undefined;

  try {
    const audio = await createSpeech({ text, preset, voiceId, languageCode });
    return new NextResponse(audio.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown ElevenLabs error";
    console.error("[host.speak]", { message });
    return NextResponse.json<ErrorResponse>(
      { error: "Could not generate host speech.", code: "speech_failed" },
      { status: 502 },
    );
  }
}
