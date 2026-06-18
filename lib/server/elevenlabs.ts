import "server-only";

import type { HostVoicePreset } from "@/lib/session/types";

const BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export interface SpeechInput {
  text: string;
  preset?: HostVoicePreset;
  voiceId?: string;
  languageCode?: "en" | "it";
}

export interface MusicInput {
  prompt: string;
  musicLengthMs?: number;
  modelId?: string;
  forceInstrumental?: boolean;
}

class ElevenLabsProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElevenLabsProviderError";
  }
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsProviderError("ELEVENLABS_API_KEY is not set");
  return key;
}

export function voiceIdForPreset(preset: HostVoicePreset = "hype"): string {
  if (preset === "custom") return process.env.ELEVENLABS_VOICE_CUSTOM ?? DEFAULT_VOICE_ID;
  if (preset === "judge") return process.env.ELEVENLABS_VOICE_JUDGE ?? DEFAULT_VOICE_ID;
  if (preset === "diva") return process.env.ELEVENLABS_VOICE_DIVA ?? DEFAULT_VOICE_ID;
  return process.env.ELEVENLABS_VOICE_HYPE ?? process.env.ELEVENLABS_VOICE_DEFAULT ?? DEFAULT_VOICE_ID;
}

export async function createSpeech(input: SpeechInput): Promise<Response> {
  const text = input.text.trim().slice(0, 420);
  if (!text) throw new ElevenLabsProviderError("Speech text is required");

  const voiceId = input.voiceId?.trim() || voiceIdForPreset(input.preset);
  const response = await fetch(
    `${BASE}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        language_code: input.languageCode ?? undefined,
        voice_settings: {
          stability: input.preset === "diva" ? 0.32 : 0.45,
          similarity_boost: 0.78,
          style: input.preset === "diva" ? 0.35 : 0.15,
          use_speaker_boost: true,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok || !response.body) {
    throw new ElevenLabsProviderError(`ElevenLabs HTTP ${response.status}`);
  }

  return response;
}

export async function composeMusic(input: MusicInput): Promise<Response> {
  const prompt = input.prompt.trim().slice(0, 4100);
  if (!prompt) throw new ElevenLabsProviderError("Music prompt is required");

  const response = await fetch(`${BASE}/music?output_format=auto`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey(),
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: input.musicLengthMs ?? 45000,
      model_id: input.modelId ?? process.env.ELEVENLABS_MUSIC_MODEL ?? "music_v2",
      force_instrumental: input.forceInstrumental ?? true,
    }),
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    throw new ElevenLabsProviderError(`ElevenLabs Music HTTP ${response.status}`);
  }

  return response;
}
