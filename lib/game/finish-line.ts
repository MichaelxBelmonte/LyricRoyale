import type { FinishLineDrop, FinishLineRound, RichsyncLine, TrackingLinks } from "@/lib/types";

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
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
}): { round: FinishLineRound; answer: string; line: string } {
  // Build the pool of lines that yield a valid (>=3 char) last-word answer, so the
  // seed indexes directly into distinct playable rounds (consecutive seeds never collide
  // until the pool is exhausted) instead of seeding a forward-search that funnels onto
  // the same lines.
  const seen = new Set<string>();
  const playable = lyricLines(input.lyrics)
    .map((line) => {
      const answer = line.match(LAST_WORD)?.[1];
      if (!answer || normalizeAnswer(answer).length < 3) return null;
      return { line, answer };
    })
    .filter((entry): entry is { line: string; answer: string } => entry !== null)
    // Drop repeated lines (choruses) so a multi-round game never replays the same line.
    .filter((entry) => {
      const key = normalizeAnswer(entry.line);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (playable.length === 0) throw new Error("No playable lyric lines found");

  const seed = Math.max(0, input.seed ?? 0);
  const index = (input.trackId + seed) % playable.length;
  const { line, answer } = playable[index];

  return {
    round: {
      trackId: input.trackId,
      seed,
      prompt: line.replace(LAST_WORD, `_____$2`),
      copyright: input.copyright,
      tracking: input.tracking,
    },
    answer,
    line,
  };
}

/**
 * Build "The Drop" timing for a chosen lyric line by matching it to a richsync
 * line and locating the answer word's token. Returns the PREFIX tokens (never the
 * answer) + the offset where the blank lands. Null when no richsync line matches
 * (normalized text equality) or the blank is the very first token — the caller
 * then plays a static blank. Token offsets are relative to the line start.
 */
export function computeDrop(
  line: string,
  answer: string,
  richsyncLines: RichsyncLine[],
): FinishLineDrop | null {
  const normLine = normalizeAnswer(line);
  const match = richsyncLines.find((candidate) => normalizeAnswer(candidate.text) === normLine);
  if (!match) return null;

  const normAnswer = normalizeAnswer(answer);
  let dropIndex = -1;
  for (let i = match.tokens.length - 1; i >= 0; i--) {
    if (normalizeAnswer(match.tokens[i].text) === normAnswer) {
      dropIndex = i;
      break;
    }
  }
  if (dropIndex <= 0) return null; // need at least one prefix token before the blank

  return {
    tokens: match.tokens.slice(0, dropIndex),
    dropOffset: Math.max(0, match.tokens[dropIndex].offset),
    lineDuration: Math.max(0.5, match.end - match.start),
  };
}
