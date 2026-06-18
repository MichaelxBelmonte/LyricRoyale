#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "public", "audio");
const endpoint = "https://api.elevenlabs.io/v1/music?output_format=auto";

const tracks = [
  {
    file: "soundclash-mixtape.mp3",
    lengthMs: 52000,
    prompt:
      "Instrumental theme loop for Soundclash, a Jackbox-style lyric battle game hosted by a cassette robot. Signature hook built from chrome synth stabs, punchy tape-stop percussion, warm cassette hiss, funky bass, handclap accents, cyber teal arpeggios, and a playful arcade countdown feel. Modern Y2K electro-funk, premium but fun, 118 BPM, seamless intro loop energy. No vocals, no lyrics, no copyrighted melody references.",
  },
  {
    file: "soundclash-clash.mp3",
    lengthMs: 52000,
    prompt:
      "Instrumental gameplay loop for Soundclash round screens. Tense lyric-battle energy with distorted cassette texture, tight club drums, rubbery bass, fast chrome synth pulses, short record scratches, arcade risers, and a memorable two-note show motif that feels like a game-show buzzer without copying any existing melody. 126 BPM, loopable, exciting but not exhausting. No vocals, no lyrics, no copyrighted melody references.",
  },
];

function loadEnvFile(name) {
  const path = join(root, name);
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

async function compose(track) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: track.prompt,
      music_length_ms: track.lengthMs,
      model_id: modelId,
      force_instrumental: true,
    }),
  });

  const body = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`ElevenLabs Music HTTP ${response.status}: ${body.toString("utf8").slice(0, 240)}`);
  }
  if (!String(response.headers.get("content-type") ?? "").includes("audio")) {
    throw new Error(`Unexpected response for ${track.file}: ${body.toString("utf8").slice(0, 240)}`);
  }

  const target = join(outputDir, track.file);
  writeFileSync(target, body);
  console.log(`Wrote public/audio/${track.file} (${Math.round(body.length / 1024)} KB)`);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set in the environment.");
}

const modelId = process.env.ELEVENLABS_MUSIC_MODEL || "music_v2";

mkdirSync(outputDir, { recursive: true });
for (const track of tracks) {
  await compose(track);
}
