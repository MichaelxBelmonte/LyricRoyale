import "server-only";

import type { HostVoicePreset } from "@/lib/session/types";

const BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

// Distinct public ElevenLabs library voices per preset, so the host actually
// changes voice when you pick a personality — even with no ELEVENLABS_VOICE_* env
// set. Override any of them via env to use a custom voice from your library.
const PRESET_VOICE_IDS: Record<HostVoicePreset, string> = {
  hype: "pNInz6obpgDQGcFmaJgB", // Adam — punchy, energetic announcer
  judge: "onwK4e9ZLuTAKqWW03F9", // Daniel — calm, deadpan authority
  diva: "XB0fDUnXU5powFXDhCwa", // Charlotte — warm, dramatic
  custom: DEFAULT_VOICE_ID,
};

function envVoice(preset: HostVoicePreset): string | undefined {
  if (preset === "hype") return process.env.ELEVENLABS_VOICE_HYPE;
  if (preset === "judge") return process.env.ELEVENLABS_VOICE_JUDGE;
  if (preset === "diva") return process.env.ELEVENLABS_VOICE_DIVA;
  return process.env.ELEVENLABS_VOICE_CUSTOM;
}

// More natural, less robotic delivery: lower stability = more expressive/varied,
// style adds personality. Judge stays steadier (deadpan); hype/diva loosen up.
function voiceSettings(preset: HostVoicePreset = "hype") {
  if (preset === "judge") {
    return { stability: 0.55, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true };
  }
  if (preset === "diva") {
    return { stability: 0.3, similarity_boost: 0.82, style: 0.6, use_speaker_boost: true };
  }
  return { stability: 0.4, similarity_boost: 0.82, style: 0.45, use_speaker_boost: true };
}

export interface SpeechInput {
  text: string;
  preset?: HostVoicePreset;
  voiceId?: string;
  // Any language code supported by eleven_multilingual_v2 (see lib/game/languages.ts).
  languageCode?: string;
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
  return (
    envVoice(preset)?.trim() ||
    PRESET_VOICE_IDS[preset] ||
    process.env.ELEVENLABS_VOICE_DEFAULT?.trim() ||
    DEFAULT_VOICE_ID
  );
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
        voice_settings: voiceSettings(input.preset),
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
