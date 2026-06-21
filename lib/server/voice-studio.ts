import "server-only";

import { composeMusic, createSpeech } from "@/lib/server/elevenlabs";

// Voice Clash track baking: generate an instrumental bed (license-clean, original)
// and render the host's cloned voice speaking/rapping the bars over it. ElevenLabs
// returns the beat and the vocal as SEPARATE mp3s and does no mixing, so the two
// parts are cached here and the TV layers them (vocal over a ducked beat).
//
// Everything is volatile/in-process: a restart drops the cached audio (and the
// round will 404 the part until the host re-bakes). That's acceptable for a party
// session and keeps generated derivatives ephemeral.

// Survive dev HMR / route re-evaluation: a plain module-level Map gets wiped on
// every recompile (while the session lives on globalThis), which 404s a track that
// was baked moments earlier. Pin the cache to globalThis like the session store.
const globalForVoice = globalThis as typeof globalThis & {
  __soundclashVoiceAudio?: Map<string, Uint8Array>;
};
const audioCache: Map<string, Uint8Array> = globalForVoice.__soundclashVoiceAudio ?? new Map();
globalForVoice.__soundclashVoiceAudio = audioCache;

const BEAT_LENGTH_MS = 30_000;

// A few beat vibes the host can pick; the id is stored on the track for display.
export const VOICE_VIBES: { id: string; label: string; prompt: string }[] = [
  { id: "boombap", label: "Boom-Bap", prompt: "dusty 90s boom-bap hip-hop instrumental, head-nod groove, vinyl crackle" },
  { id: "trap", label: "Trap", prompt: "modern trap instrumental, rolling 808s, crisp hi-hats, dark keys" },
  { id: "drill", label: "Drill", prompt: "uk drill instrumental, sliding 808s, menacing bell melody" },
  { id: "funk", label: "Funk", prompt: "upbeat funk instrumental, slap bass, bright horns, party groove" },
  { id: "lofi", label: "Lo-Fi", prompt: "mellow lo-fi hip-hop instrumental, warm keys, relaxed swing" },
  { id: "hyperpop", label: "Hyperpop", prompt: "energetic hyperpop instrumental, glossy synths, punchy drums" },
];

function vibePrompt(vibe: string): string {
  const found = VOICE_VIBES.find((v) => v.id === vibe);
  return `${found?.prompt ?? VOICE_VIBES[0].prompt}, clean instrumental, no vocals`;
}

function cacheKey(code: string, trackId: number, part: "beat" | "vocal"): string {
  return `${code}:${trackId}:${part}`;
}

export interface BakeInput {
  code: string;
  trackId: number;
  voiceId: string;
  vibe: string;
  lyric: string;
  languageCode?: string;
}

export interface BakeResult {
  beatUrl: string;
  vocalUrl: string;
}

// Generate the beat + render the host-voice vocal, cache both, and return the URLs
// the TV will play. Runs in the lobby (multi-second) — never inside a live round.
export async function bakeVoiceTrack(input: BakeInput): Promise<BakeResult> {
  const beatRes = await composeMusic({
    prompt: vibePrompt(input.vibe),
    musicLengthMs: BEAT_LENGTH_MS,
    forceInstrumental: true,
  });
  const beat = new Uint8Array(await beatRes.arrayBuffer());

  const vocalRes = await createSpeech({
    text: input.lyric,
    voiceId: input.voiceId,
    languageCode: input.languageCode,
  });
  const vocal = new Uint8Array(await vocalRes.arrayBuffer());

  audioCache.set(cacheKey(input.code, input.trackId, "beat"), beat);
  audioCache.set(cacheKey(input.code, input.trackId, "vocal"), vocal);

  return {
    beatUrl: `/api/sessions/${input.code}/voice?track=${input.trackId}&part=beat`,
    vocalUrl: `/api/sessions/${input.code}/voice?track=${input.trackId}&part=vocal`,
  };
}

export function getBakedAudio(code: string, trackId: number, part: "beat" | "vocal"): Uint8Array | null {
  return audioCache.get(cacheKey(code, trackId, part)) ?? null;
}

// Drop all cached audio for a session (match end / Voice Studio reset).
export function clearBakedAudio(code: string): void {
  const prefix = `${code}:`;
  for (const key of audioCache.keys()) {
    if (key.startsWith(prefix)) audioCache.delete(key);
  }
}
