#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(root, "public", "audio");
const elevenEndpoint = "https://api.elevenlabs.io/v1/music?output_format=auto";
const lalalBase = "https://www.lalal.ai/api/v1";

const fullFile = "soundclash-signal-full.mp3";
const vocalFile = "soundclash-signal-vocals.mp3";
const backingFile = "soundclash-signal-backing.mp3";

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

async function readBody(response) {
  return Buffer.from(await response.arrayBuffer());
}

async function composeSignature() {
  const response = await fetch(elevenEndpoint, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model_id: modelId,
      music_length_ms: 30000,
      force_instrumental: false,
      prompt:
        "Original 30 second signature theme for Soundclash, a Jackbox-style lyric battle game hosted by BEATBOT, a cassette robot. Modern Y2K electro-funk with chrome synths, tape-stop hits, tight drums, warm cassette hiss, and a memorable call-and-response vocal hook. The only vocal words allowed are: 'Soundclash', 'press play', 'pick a fight', 'Beatbot says go'. Make the words short, punchy, game-ready, and easy to isolate. No copyrighted melody references.",
    }),
  });
  const body = await readBody(response);
  if (!response.ok) throw new Error(`ElevenLabs Music HTTP ${response.status}: ${body.toString("utf8").slice(0, 240)}`);
  if (!String(response.headers.get("content-type") ?? "").includes("audio")) {
    throw new Error(`Unexpected ElevenLabs response: ${body.toString("utf8").slice(0, 240)}`);
  }
  writeFileSync(join(outputDir, fullFile), body);
  console.log(`Wrote public/audio/${fullFile} (${Math.round(body.length / 1024)} KB)`);
  return body;
}

async function uploadToLalal(audio) {
  const response = await fetch(`${lalalBase}/upload/`, {
    method: "POST",
    headers: {
      "X-License-Key": process.env.LALAL_API_KEY,
      "Content-Disposition": `attachment; filename="${fullFile}"`,
      "Content-Type": "audio/mpeg",
    },
    body: audio,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.id) throw new Error(`LALAL upload HTTP ${response.status}`);
  console.log(`Uploaded to LALAL source ${json.id}`);
  return json.id;
}

async function splitVocals(sourceId) {
  const response = await fetch(`${lalalBase}/split/stem_separator/`, {
    method: "POST",
    headers: {
      "X-License-Key": process.env.LALAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_id: sourceId,
      presets: {
        stem: "vocals",
        extraction_level: "deep_extraction",
        splitter: "auto",
      },
    }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.task_id) throw new Error(`LALAL split HTTP ${response.status}`);
  console.log(`Started LALAL split task ${json.task_id}`);
  return json.task_id;
}

async function checkTask(taskId) {
  const response = await fetch(`${lalalBase}/check/`, {
    method: "POST",
    headers: {
      "X-License-Key": process.env.LALAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task_ids: [taskId] }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.result) throw new Error(`LALAL check HTTP ${response.status}`);
  return json.result[taskId];
}

async function waitForSplit(taskId) {
  for (let attempt = 1; attempt <= 90; attempt++) {
    const result = await checkTask(taskId);
    const progress = result?.progress == null ? "" : ` ${result.progress}%`;
    console.log(`LALAL ${result?.status ?? "queued"}${progress}`);
    if (result?.status === "success") return result.result?.tracks ?? [];
    if (["error", "cancelled", "server_error"].includes(result?.status)) {
      throw new Error(`LALAL split failed with status ${result.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  throw new Error("LALAL split timed out");
}

async function downloadTrack(url, file) {
  const response = await fetch(url);
  const body = await readBody(response);
  if (!response.ok || body.length === 0) throw new Error(`Could not download ${file}`);
  writeFileSync(join(outputDir, file), body);
  console.log(`Wrote public/audio/${file} (${Math.round(body.length / 1024)} KB)`);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not set.");
if (!process.env.LALAL_API_KEY) throw new Error("LALAL_API_KEY is not set.");

const modelId = process.env.ELEVENLABS_MUSIC_MODEL || "music_v2";

mkdirSync(outputDir, { recursive: true });
const fullMix = await composeSignature();
const sourceId = await uploadToLalal(fullMix);
const taskId = await splitVocals(sourceId);
const tracks = await waitForSplit(taskId);
const vocal = tracks.find((track) => track.type === "stem") ?? tracks[0];
const backing = tracks.find((track) => track.type === "back") ?? tracks[1];

if (!vocal?.url || !backing?.url) {
  throw new Error(`LALAL did not return both vocal and backing URLs.`);
}

await downloadTrack(vocal.url, vocalFile);
await downloadTrack(backing.url, backingFile);
