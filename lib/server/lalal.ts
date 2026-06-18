import "server-only";

const BASE = "https://www.lalal.ai/api/v1";

export type LalalStem =
  | "vocals"
  | "drum"
  | "bass"
  | "piano"
  | "electric_guitar"
  | "acoustic_guitar"
  | "synthesizer"
  | "strings"
  | "wind";

export interface LalalUpload {
  id: string;
  name: string;
  size: number;
  duration: number;
  expires: number;
}

export interface LalalTask {
  task_id: string;
  source_id: string;
}

export interface LalalTrack {
  label: string;
  type: "stem" | "back" | string;
  url: string;
}

export interface LalalTaskResult {
  source_id: string;
  status: "progress" | "success" | "error" | "cancelled" | "server_error";
  progress?: number;
  result?: {
    duration?: number;
    tracks?: LalalTrack[];
  };
  error?: unknown;
}

export interface LalalCheck {
  result: Record<string, LalalTaskResult>;
}

class LalalProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LalalProviderError";
  }
}

function apiKey(): string {
  const key = process.env.LALAL_API_KEY;
  if (!key) throw new LalalProviderError("LALAL_API_KEY is not set");
  return key;
}

async function parseJson<T>(response: Response): Promise<T> {
  const json = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !json) {
    throw new LalalProviderError(`LALAL HTTP ${response.status}`);
  }
  return json;
}

function safeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "audio.mp3";
}

export async function uploadSource(file: File): Promise<LalalUpload> {
  const filename = safeFilename(file.name);
  const response = await fetch(`${BASE}/upload/`, {
    method: "POST",
    headers: {
      "X-License-Key": apiKey(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: Buffer.from(await file.arrayBuffer()),
    cache: "no-store",
  });
  return parseJson<LalalUpload>(response);
}

export async function splitStem(sourceId: string, stem: LalalStem): Promise<LalalTask> {
  const response = await fetch(`${BASE}/split/stem_separator/`, {
    method: "POST",
    headers: {
      "X-License-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_id: sourceId,
      presets: {
        stem,
        extraction_level: "deep_extraction",
        splitter: "auto",
      },
    }),
    cache: "no-store",
  });
  return parseJson<LalalTask>(response);
}

export async function checkTasks(taskIds: string[]): Promise<LalalCheck> {
  const response = await fetch(`${BASE}/check/`, {
    method: "POST",
    headers: {
      "X-License-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task_ids: taskIds }),
    cache: "no-store",
  });
  return parseJson<LalalCheck>(response);
}

export async function deleteSource(sourceId: string): Promise<void> {
  await fetch(`${BASE}/delete/`, {
    method: "POST",
    headers: {
      "X-License-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source_id: sourceId }),
    cache: "no-store",
  });
}
