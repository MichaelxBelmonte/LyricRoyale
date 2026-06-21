import type { DecoySimilarity } from "@/lib/game/difficulty";
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

// Fold several integers into one stable 32-bit seed (FNV-1a-ish). Used to mix the
// per-session contentSeed with the round index + trackId so the same track at the
// same round number yields a DIFFERENT puzzle in two different shows.
export function mix(...parts: number[]): number {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    h ^= Math.trunc(part) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Levenshtein distance (small strings) — ranks "near-miss" distractors at higher
// difficulty so the wrong options sit close to the real answer.
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Drop items whose key is already used; if that empties the pool, keep the
// original (never starve a round just to avoid a repeat).
function dropExcluded<T>(items: T[], keyOf: (item: T) => string, exclude?: ReadonlySet<string>): T[] {
  if (!exclude || exclude.size === 0) return items;
  const kept = items.filter((item) => !exclude.has(keyOf(item)));
  return kept.length > 0 ? kept : items;
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

function choiceOptions(
  answer: string,
  candidates: string[],
  seed: number,
  count = 4,
  similarity: DecoySimilarity = "mixed",
): string[] {
  const cleanAnswer = answer.trim();
  const pool = uniqueByNormalized([...candidates, ...FALLBACK_WORDS])
    .filter((value) => normalizeAnswer(value) !== normalizeAnswer(cleanAnswer))
    .filter((value) => normalizeAnswer(value).length >= 3);
  // "near" = harder: distractors closest to the answer (small edit distance).
  const ranked =
    similarity === "near"
      ? [...pool].sort(
          (a, b) =>
            editDistance(normalizeAnswer(a), normalizeAnswer(cleanAnswer)) -
            editDistance(normalizeAnswer(b), normalizeAnswer(cleanAnswer)),
        )
      : shuffled(pool, seed);
  const distractors = ranked.slice(0, Math.max(1, count - 1));
  return shuffled(uniqueByNormalized([cleanAnswer, ...distractors]).slice(0, count), seed + 7);
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
  optionCount?: number;
  decoySimilarity?: DecoySimilarity;
  excludeKeys?: ReadonlySet<string>;
}): { round: FinishLineRound; answer: string; line: string; options: string[] } {
  // Build the pool of lines that yield a valid last-word answer, so consecutive
  // seeds map to distinct playable rounds until the pool is exhausted.
  const playableAll = playableFinishLines(lyricLines(input.lyrics));

  if (playableAll.length === 0) throw new Error("No playable lyric lines found");

  // Anti-repetition: prefer lines not used recently this session.
  const playable = dropExcluded(playableAll, (entry) => normalizeAnswer(entry.line), input.excludeKeys);
  const seed = Math.max(0, input.seed ?? 0);
  const index = seededIndex(seed, playable.length, input.trackId);
  const { line, answer } = playable[index];
  const options = choiceOptions(
    answer,
    playableAll.map((entry) => entry.answer),
    seed + input.trackId,
    input.optionCount ?? 4,
    input.decoySimilarity ?? "mixed",
  );

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
  optionCount?: number;
  decoySimilarity?: DecoySimilarity;
  excludeKeys?: ReadonlySet<string>;
}) {
  const lines = uniqueByNormalized(lyricLines(input.lyrics));
  const allPairs = lines
    .slice(0, -1)
    .map((line, index) => ({ line, next: lines[index + 1] }))
    .filter((pair) => normalizeAnswer(pair.next).length >= 8);

  if (allPairs.length === 0) throw new Error("No playable next-line pairs found");

  // Anti-repetition keys on the prompt line (matches what the caller stores).
  const pairs = dropExcluded(allPairs, (pair) => normalizeAnswer(pair.line), input.excludeKeys);
  const seed = Math.max(0, input.seed ?? 0);
  const pair = pairs[seededIndex(seed, pairs.length, input.trackId)];
  const optionCount = input.optionCount ?? 4;
  const others = lines.filter((line) => normalizeAnswer(line) !== normalizeAnswer(pair.next));
  // "near" = harder: distractors are lines that sit close to the answer in the song.
  let pool: string[];
  if (input.decoySimilarity === "near") {
    const answerIdx = lines.findIndex((line) => normalizeAnswer(line) === normalizeAnswer(pair.next));
    pool = [...others].sort(
      (a, b) => Math.abs(lines.indexOf(a) - answerIdx) - Math.abs(lines.indexOf(b) - answerIdx),
    );
  } else {
    pool = shuffled(others, seed + input.trackId);
  }
  const distractors = pool.slice(0, Math.max(1, optionCount - 1));
  const options = shuffled(uniqueByNormalized([pair.next, ...distractors]).slice(0, optionCount), seed + 13);

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

function pickDistinct(pool: string[], avoid: string[], seed: number): string | null {
  const avoidSet = new Set(avoid.map(normalizeAnswer));
  const candidates = uniqueByNormalized(pool).filter(
    (word) => !avoidSet.has(normalizeAnswer(word)) && normalizeAnswer(word).length >= 2,
  );
  if (candidates.length === 0) return null;
  return candidates[seededIndex(seed, candidates.length)];
}

// Replace the last word of a line with another real word from the song. Returns
// null when no swap is possible or the result is not distinct after normalizing.
function swapLastWord(line: string, pool: string[], seed: number): string | null {
  const match = line.match(LAST_WORD);
  if (!match) return null;
  const replacement = pickDistinct(pool, [match[1]], seed);
  if (!replacement) return null;
  const candidate = line.replace(LAST_WORD, `${replacement}$2`);
  return normalizeAnswer(candidate) === normalizeAnswer(line) ? null : candidate;
}

// Replace one interior word (never the first/last) with another real word.
function swapInnerWord(line: string, pool: string[], seed: number): string | null {
  const words = line.split(/\s+/);
  if (words.length < 3) return null;
  const innerIndexes: number[] = [];
  for (let i = 1; i < words.length - 1; i++) {
    if ((words[i].match(WORD) ?? []).length) innerIndexes.push(i);
  }
  if (innerIndexes.length === 0) return null;
  const target = innerIndexes[seededIndex(seed, innerIndexes.length)];
  const replacement = pickDistinct(pool, [words[target]], seed + 3);
  if (!replacement) return null;
  const token = words[target].match(/^([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u);
  words[target] = token ? `${replacement}${token[2]}` : replacement;
  const candidate = words.join(" ");
  return normalizeAnswer(candidate) === normalizeAnswer(line) ? null : candidate;
}

// Swap two adjacent words. Changes the normalized character order, so the result
// is distinct unless the two words are identical.
function swapAdjacent(line: string, seed: number): string | null {
  const words = line.split(/\s+/);
  if (words.length < 2) return null;
  const i = seededIndex(seed, words.length - 1);
  [words[i], words[i + 1]] = [words[i + 1], words[i]];
  const candidate = words.join(" ");
  return normalizeAnswer(candidate) === normalizeAnswer(line) ? null : candidate;
}

// Count distinctive content words (>=5 chars, not stop-words) — higher means a
// more recognizable line, good for "which song is this from?".
function contentScore(line: string): number {
  let score = 0;
  for (const raw of line.match(WORD) ?? []) {
    const key = normalizeAnswer(raw);
    if (key.length >= 5 && !STOP_WORDS.has(raw.toLowerCase()) && !STOP_WORDS.has(key)) score += 1;
  }
  return score;
}

export function buildMondegreenRound(input: {
  trackId: number;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
  excludeKeys?: ReadonlySet<string>;
}) {
  const allLines = uniqueByNormalized(lyricLines(input.lyrics)).filter(
    (line) => (line.match(WORD) ?? []).length >= 4,
  );
  if (allLines.length === 0) throw new Error("No playable mondegreen lines found");

  // Anti-repetition on the real line (matches the key the caller stores).
  const lines = dropExcluded(allLines, (line) => normalizeAnswer(line), input.excludeKeys);
  const seed = Math.max(0, input.seed ?? 0);
  const real = lines[seededIndex(seed, lines.length, input.trackId)];
  const wordPool = allLines.flatMap((line) => line.match(WORD) ?? []);
  const lastWords = allLines
    .map((line) => line.match(LAST_WORD)?.[1])
    .filter((word): word is string => Boolean(word));

  const decoys = [
    swapLastWord(real, lastWords, seed + input.trackId),
    swapInnerWord(real, wordPool, seed + input.trackId + 5),
    swapAdjacent(real, seed + input.trackId + 9),
  ].filter((decoy): decoy is string => Boolean(decoy));

  const options = uniqueByNormalized([real, ...decoys]);
  if (options.length < 4) throw new Error("Could not build 3 distinct mondegreen decoys");

  return {
    prompt: "Which line is the real lyric?",
    answer: real,
    options: shuffled(options.slice(0, 4), seed + 7),
    copyright: input.copyright,
    tracking: input.tracking,
  };
}

export function buildSongMashRound(input: {
  track: TrackSummary;
  seed?: number;
  lyrics: string;
  copyright: string;
  tracking: TrackingLinks;
  deck: TrackSummary[];
}) {
  const names = uniqueByNormalized(input.deck.map((track) => track.trackName));
  if (names.length < 4) throw new Error("Need at least 4 tracks in the deck for song mash");

  const lines = uniqueByNormalized(lyricLines(input.lyrics));
  if (lines.length === 0) throw new Error("No playable lyric lines found");

  const seed = Math.max(0, input.seed ?? 0);
  // Pick from the most distinctive lines so the lyric is recognizable.
  const ranked = [...lines].sort((a, b) => contentScore(b) - contentScore(a));
  const prompt = ranked[seededIndex(seed, Math.min(5, ranked.length), input.track.trackId)];

  const decoys = shuffled(
    names.filter((name) => normalizeAnswer(name) !== normalizeAnswer(input.track.trackName)),
    seed + input.track.trackId,
  ).slice(0, 3);
  const options = shuffled(uniqueByNormalized([input.track.trackName, ...decoys]).slice(0, 4), seed + 29);
  if (options.length < 4) throw new Error("Not enough distinct track names for song mash");

  return {
    prompt,
    answer: input.track.trackName,
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
