import type { FinishLineRound, TrackingLinks } from "@/lib/types";

const LAST_WORD = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)([^\p{L}\p{N}]*)$/u;

function lyricLines(lyrics: string): string[] {
  return lyrics
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 18 && line.length <= 120)
    .filter((line) => !line.includes("*******") && !/commercial use/i.test(line))
    .filter((line) => !line.startsWith("["));
}

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

export function buildFinishLineRound(input: {
  trackId: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
}): FinishLineRound {
  const lines = lyricLines(input.lyrics);
  if (lines.length === 0) throw new Error("No playable lyric lines found");

  const start = input.trackId % lines.length;
  for (let offset = 0; offset < lines.length; offset += 1) {
    const line = lines[(start + offset) % lines.length];
    const match = line.match(LAST_WORD);
    const answer = match?.[1];
    if (!answer || normalizeAnswer(answer).length < 3) continue;

    return {
      trackId: input.trackId,
      prompt: line.replace(LAST_WORD, `_____$2`),
      answer,
      copyright: input.copyright,
      tracking: input.tracking,
    };
  }

  throw new Error("No playable answer found");
}
