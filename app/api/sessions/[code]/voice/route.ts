import { NextRequest, NextResponse } from "next/server";
import { writeBars } from "@/lib/server/anthropic";
import { languageName } from "@/lib/game/languages";
import { cloneInstantVoice, deleteVoice } from "@/lib/server/elevenlabs";
import {
  addVoiceTrack,
  clearVoiceStudio,
  getSession,
  nextVoiceTrackId,
  setVoiceClone,
} from "@/lib/server/session-store";
import { bakeVoiceTrack, clearBakedAudio, getBakedAudio } from "@/lib/server/voice-studio";
import type { ErrorResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ code: string }>;
}

function fail(code: string, status = 400) {
  return NextResponse.json<ErrorResponse>({ error: "Voice studio request failed.", code }, { status });
}

// Serve a cached baked audio part (beat or vocal) for a Voice Clash track.
export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const trackId = Number(req.nextUrl.searchParams.get("track"));
  const part = req.nextUrl.searchParams.get("part");
  if (!Number.isInteger(trackId) || (part !== "beat" && part !== "vocal")) return fail("invalid_voice_part", 400);
  const bytes = getBakedAudio(code, trackId, part);
  if (!bytes) return fail("voice_audio_missing", 404);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

// Clone the host voice (multipart upload), bake a track, or tear the studio down.
export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const contentType = req.headers.get("content-type") ?? "";

  try {
    // ---- Clone: multipart upload of the host's recorded voice sample ----
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const label = String(form.get("label") ?? "Host voice");
      if (!(file instanceof Blob)) return fail("missing_voice_sample", 400);
      const filename = file instanceof File && file.name ? file.name : "sample.webm";
      const clone = await cloneInstantVoice(label, file, filename);
      const session = setVoiceClone(code, {
        voiceId: clone.voiceId,
        label,
        requiresVerification: clone.requiresVerification,
      });
      return NextResponse.json({ session, requiresVerification: clone.requiresVerification });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      vibe?: string;
      theme?: string;
      creatorPlayerId?: string;
    };

    // ---- Teardown: purge the clone + cached audio (privacy) ----
    if (body.action === "teardown") {
      const { session, voiceId } = clearVoiceStudio(code);
      if (voiceId) await deleteVoice(voiceId);
      clearBakedAudio(code);
      return NextResponse.json({ session });
    }

    // ---- Bake: generate a beat + render the host-voice bars over it ----
    if (body.action === "bake") {
      const session = getSession(code);
      const voiceId = session.voiceClone?.voiceId;
      if (!voiceId) return fail("voice_not_cloned", 400);
      const vibe = String(body.vibe || "boombap");
      const theme = String(body.theme || "the party tonight").slice(0, 160);
      const creator = body.creatorPlayerId
        ? session.players.find((p) => p.id === body.creatorPlayerId)
        : undefined;
      const lyric = await writeBars({
        theme,
        vibe,
        players: session.players.map((p) => p.name),
        // Bars in the session's language → host who set Italian gets Italian bars,
        // and the cloned-voice TTS reads them with language_code = narratorLang.
        nativeName: languageName(session.narratorLang),
      });
      const trackId = nextVoiceTrackId(code);
      const { beatUrl, vocalUrl } = await bakeVoiceTrack({
        code,
        trackId,
        voiceId,
        vibe,
        lyric,
        languageCode: session.narratorLang,
      });
      const updated = addVoiceTrack(code, {
        id: trackId,
        vibe,
        lyric,
        beatUrl,
        vocalUrl,
        creatorPlayerId: creator?.id,
        creatorName: creator?.name,
      });
      return NextResponse.json({ session: updated, lyric });
    }

    return fail("invalid_voice_action", 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "voice_failed";
    return fail(message, message === "session_not_found" ? 404 : 502);
  }
}
