import type { FinishLineDrop, FinishLineRound, RichsyncLine, TrackingLinks, TrackSummary } from "@/lib/types";

const LAST_WORD = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)([^\p{L}\p{N}]*)$/u;
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const FALLBACK_WORDS = ["tonight", "forever", "again", "heart", "dance", "dream", "light", "fire"];
const FALLBACK_ARTISTS = [
  "Taylor Swift",
  "Drake",
  "Beyonce",
  "The Weeknd",
  "Ariana Grande",
  "Dua Lipa",
  "Kendrick Lamar",
  "Billie Eilish",
];
const STOP_WORDS = new Set([
  "about",
  "again",
  "ain't",
  "because",
  "been",
  "can't",
  "could",
  "down",
  "from",
  "alla",
  "allo",
  "anche",
  "come",
  "cosa",
  "dalla",
  "dello",
  "dentro",
  "have",
  "into",
  "io",
  "just",
  "know",
  "like",
  "love",
  "make",
  "mai",
  "meno",
  "nella",
  "nelle",
  "never",
  "non",
  "ora",
  "perche",
  "pero",
  "piu",
  "questa",
  "questo",
  "quella",
  "quello",
  "sono",
  "that",
  "there",
  "they",
  "this",
  "tutto",
  "what",
  "when",
  "where",
  "with",
  "would",
  "your",
]);

export function lyricLines(lyrics: string): string[] {
  return lyrics
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 18 && line.length <= 120)
    .filter((line) => !line.includes("*******") && !/commercial use/i.test(line))
    .filter((line) => !line.startsWith("["));
}

function seededIndex(seed: number, size: number, salt = 0): number {
  if (size <= 0) return 0;
  return Math.abs(seed * 37 + salt * 17) % size;
}

function uniqueByNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeAnswer(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shuffled<T>(values: T[], seed: number): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = seededIndex(seed + i, i + 1, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function playableFinishLines(lyrics: string[]): { line: string; answer: string }[] {
  const seen = new Set<string>();
  return lyrics
    .map((line) => {
      const answer = line.match(LAST_WORD)?.[1];
      if (!answer || normalizeAnswer(answer).length < 3) return null;
      return { line, answer };
    })
    .filter((entry): entry is { line: string; answer: string } => entry !== null)
    .filter((entry) => {
      const key = normalizeAnswer(entry.line);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function choiceOptions(answer: string, candidates: string[], seed: number): string[] {
  const cleanAnswer = answer.trim();
  const distractors = shuffled(
    uniqueByNormalized([...candidates, ...FALLBACK_WORDS])
      .filter((value) => normalizeAnswer(value) !== normalizeAnswer(cleanAnswer))
      .filter((value) => normalizeAnswer(value).length >= 3),
    seed,
  ).slice(0, 3);
  return shuffled(uniqueByNormalized([cleanAnswer, ...distractors]).slice(0, 4), seed + 7);
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
}): { round: FinishLineRound; answer: string; line: string; options: string[] } {
  // Build the pool of lines that yield a valid last-word answer, so consecutive
  // seeds map to distinct playable rounds until the pool is exhausted.
  const playable = playableFinishLines(lyricLines(input.lyrics));

  if (playable.length === 0) throw new Error("No playable lyric lines found");

  const seed = Math.max(0, input.seed ?? 0);
  const index = seededIndex(seed, playable.length, input.trackId);
  const { line, answer } = playable[index];
  const options = choiceOptions(answer, playable.map((entry) => entry.answer), seed + input.trackId);

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
    options,
  };
}

export function buildNextLineRound(input: {
  trackId: number;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
}) {
  const lines = uniqueByNormalized(lyricLines(input.lyrics));
  const pairs = lines
    .slice(0, -1)
    .map((line, index) => ({ line, next: lines[index + 1] }))
    .filter((pair) => normalizeAnswer(pair.next).length >= 8);

  if (pairs.length === 0) throw new Error("No playable next-line pairs found");

  const seed = Math.max(0, input.seed ?? 0);
  const pair = pairs[seededIndex(seed, pairs.length, input.trackId)];
  const distractors = shuffled(
    lines.filter((line) => normalizeAnswer(line) !== normalizeAnswer(pair.next)),
    seed + input.trackId,
  ).slice(0, 3);
  const options = shuffled([pair.next, ...distractors], seed + 13);

  return {
    prompt: pair.line,
    answer: pair.next,
    options,
    copyright: input.copyright,
    tracking: input.tracking,
  };
}

export function buildNameSongRound(input: {
  track: TrackSummary;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
  deck: TrackSummary[];
}) {
  const lines = uniqueByNormalized(lyricLines(input.lyrics));
  if (lines.length === 0) throw new Error("No playable lyric lines found");

  const seed = Math.max(0, input.seed ?? 0);
  const prompt = lines[seededIndex(seed, lines.length, input.track.trackId)];
  const decoys = shuffled(
    input.deck
      .filter((track) => track.trackId !== input.track.trackId)
      .map((track) => track.trackName),
    seed + input.track.trackId,
  );
  const options = shuffled(uniqueByNormalized([input.track.trackName, ...decoys]).slice(0, 4), seed + 29);

  return {
    prompt,
    answer: input.track.trackName,
    options,
    copyright: input.copyright,
    tracking: input.tracking,
  };
}

export function buildArtistPickRound(input: {
  track: TrackSummary;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
  deck: TrackSummary[];
}) {
  const lines = uniqueByNormalized(lyricLines(input.lyrics));
  if (lines.length === 0) throw new Error("No playable lyric lines found");

  const seed = Math.max(0, input.seed ?? 0);
  const prompt = lines[seededIndex(seed, lines.length, input.track.trackId)];
  const artists = input.deck.map((track) => track.artistName);
  const options = shuffled(
    uniqueByNormalized([input.track.artistName, ...artists, ...FALLBACK_ARTISTS]).slice(0, 4),
    seed + input.track.trackId + 41,
  );

  return {
    prompt,
    answer: input.track.artistName,
    options,
    copyright: input.copyright,
    tracking: input.tracking,
  };
}

export function buildWordRushRound(input: {
  track: TrackSummary;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
}) {
  const counts = new Map<string, number>();
  for (const raw of input.lyrics.match(WORD) ?? []) {
    const word = raw.toLowerCase().replace(/[’]/g, "'");
    const key = normalizeAnswer(word);
    if (key.length < 4 || STOP_WORDS.has(word) || STOP_WORDS.has(key) || /^\d+$/.test(key)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word);

  if (ranked.length === 0) throw new Error("No playable lyric keywords found");

  const seed = Math.max(0, input.seed ?? 0);
  const answer = ranked[0];
  const decoys = shuffled(ranked.slice(1), seed + input.track.trackId + 53);
  const options = shuffled(uniqueByNormalized([answer, ...decoys, ...FALLBACK_WORDS]).slice(0, 4), seed + 61);

  return {
    prompt: `Which keyword dominates "${input.track.trackName}"?`,
    answer,
    options,
    copyright: input.copyright,
    tracking: input.tracking,
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
