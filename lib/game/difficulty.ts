// Variable / level-up difficulty engine. One tier value (1..5) resolves to a
// bundle of content knobs that every builder + the scoring timer read. Tier 3 is
// deliberately identical to the legacy defaults (4 options, 15s) so wiring this in
// changes nothing until a session actually ramps the tier.
//
// This is CONTENT hardness + progression, NOT score combos (those stay deferred).

export type DifficultyTier = 1 | 2 | 3 | 4 | 5;
export type DecoySimilarity = "far" | "mixed" | "near";
/** Host-chosen starting band: 1 = chill, 2 = standard, 3 = brutal. */
export type DifficultyFloor = 1 | 2 | 3;

export interface RoundDifficultyConfig {
  tier: DifficultyTier;
  /** Number of answer options (correct + distractors). */
  optionCount: number;
  /** Answering window in ms (drives endsAt AND the speed-score denominator). */
  timeLimitMs: number;
  /** How close distractors sit to the real answer. */
  decoySimilarity: DecoySimilarity;
  /** Reserved for finish_line multi-blank (Phase 0 keeps 1). */
  maxBlanks: number;
}

const TABLE: Record<DifficultyTier, Omit<RoundDifficultyConfig, "tier">> = {
  1: { optionCount: 3, timeLimitMs: 18_000, decoySimilarity: "far", maxBlanks: 1 },
  2: { optionCount: 4, timeLimitMs: 15_000, decoySimilarity: "far", maxBlanks: 1 },
  3: { optionCount: 4, timeLimitMs: 13_000, decoySimilarity: "mixed", maxBlanks: 1 },
  4: { optionCount: 5, timeLimitMs: 10_000, decoySimilarity: "near", maxBlanks: 2 },
  5: { optionCount: 6, timeLimitMs: 8_000, decoySimilarity: "near", maxBlanks: 3 },
};

export const DIFFICULTY_FLOOR_LABELS: Record<DifficultyFloor, string> = {
  1: "Chill",
  2: "Standard",
  3: "Brutal",
};

export function clampTier(value: number): DifficultyTier {
  return Math.min(5, Math.max(1, Math.round(value))) as DifficultyTier;
}

export function clampFloor(value: unknown): DifficultyFloor {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? (n as DifficultyFloor) : 2;
}

export function resolveDifficulty(tier: DifficultyTier): RoundDifficultyConfig {
  return { tier, ...TABLE[tier] };
}

export function roundTimeLimitMs(tier: DifficultyTier): number {
  return TABLE[tier].timeLimitMs;
}

// Per-match curve: ramp from the host's floor band toward the hard end across the
// match (warm-up early, hardest on the finale). roundNumber is 1-based.
export function tierForRound(roundNumber: number, totalRounds: number, floor: DifficultyFloor): DifficultyTier {
  const total = Math.max(1, totalRounds);
  const progress = total <= 1 ? 1 : Math.min(1, Math.max(0, (roundNumber - 1) / (total - 1)));
  const bands: Record<DifficultyFloor, [number, number]> = { 1: [1, 3], 2: [2, 4], 3: [3, 5] };
  const [lo, hi] = bands[floor];
  return clampTier(lo + (hi - lo) * progress);
}
