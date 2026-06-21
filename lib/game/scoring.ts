// Pure scoring foundation for the "set" (5-round match): base + speed, then the
// Heat (combo) multiplier, the Drop timing bonus, and the Encore final-round bonus.
// No I/O, no React — safe to unit-test and to call from server or client.

export const ROUND_TIME_LIMIT_MS = 15_000;
export const ROUNDS_PER_SET = 5;
export const ENCORE_MULTIPLIER = 2;
export const MAX_HEAT = 3;
export const DROP_BONUS_MAX = 1.5;

// Generous window (ms) around "the drop" — locking the answer this close to the
// moment the karaoke highlight reaches the blank pays the full Drop bonus. Kept
// loose on purpose so latency (e.g. on Replit) never makes the bonus feel arbitrary.
const DROP_WINDOW_MS = 1_200;

const BASE_POINTS = 700;
const SPEED_POINTS = 300;

/**
 * Heat / combo multiplier driven by the consecutive-correct streak (current
 * answer included): 1 -> x1, 2 -> x1.5, 3 -> x2, 4+ -> x3. One miss resets the
 * streak to 0, so the caller passes streak again from 1 on the next correct.
 */
export function heatMultiplier(streak: number): number {
  if (streak <= 1) return 1;
  if (streak === 2) return 1.5;
  if (streak === 3) return 2;
  return MAX_HEAT;
}

/**
 * Drop timing bonus (1.0–1.5x). `proximityMs` is the absolute distance between
 * when the player locked the answer and "the drop" (the richsync offset of the
 * blanked token, measured from the line's karaoke start). Null when the track has
 * no richsync timing — then the bonus is neutral (1.0) so the line still scores.
 */
export function dropBonus(proximityMs: number | null): number {
  if (proximityMs == null) return 1;
  const closeness = Math.max(0, 1 - Math.abs(proximityMs) / DROP_WINDOW_MS);
  return 1 + (DROP_BONUS_MAX - 1) * closeness;
}

export interface RoundScoreInput {
  isCorrect: boolean;
  elapsedMs: number;
  /** Consecutive-correct streak INCLUDING this round if correct (0 if this round is wrong). */
  streak: number;
  /** True on the final (Encore) round of the set. */
  isEncore?: boolean;
  /** |answerLockTime - dropTime| in ms from the line's karaoke start; null if no richsync. */
  dropProximityMs?: number | null;
  /** Answering window for the speed bonus; defaults to ROUND_TIME_LIMIT_MS. */
  timeLimitMs?: number;
}

export interface RoundScoreBreakdown {
  /** base + speed subtotal, before any multiplier. */
  subtotal: number;
  heat: number;
  drop: number;
  encore: number;
  total: number;
}

/**
 * Score a single round, returning the full breakdown so the UI can animate the
 * count-up chain (subtotal -> x heat -> x drop -> x encore -> total).
 */
export function scoreRound(input: RoundScoreInput): RoundScoreBreakdown {
  const encore = input.isEncore ? ENCORE_MULTIPLIER : 1;
  if (!input.isCorrect) {
    return { subtotal: 0, heat: 1, drop: 1, encore, total: 0 };
  }
  const speedRatio = Math.max(0, 1 - input.elapsedMs / (input.timeLimitMs ?? ROUND_TIME_LIMIT_MS));
  const subtotal = BASE_POINTS + Math.round(SPEED_POINTS * speedRatio);
  const heat = heatMultiplier(input.streak);
  const drop = dropBonus(input.dropProximityMs ?? null);
  const total = Math.round(subtotal * heat * drop * encore);
  return { subtotal, heat, drop, encore, total };
}

/**
 * Backward-compatible single-round scorer (base + speed, no multipliers).
 * Preserved so existing callers keep their exact behavior while the set/heat
 * loop is wired in; equivalent to scoreRound with streak=1 and no drop/encore.
 */
export function scoreFinishLine(isCorrect: boolean, elapsedMs: number, timeLimitMs?: number): number {
  return scoreRound({ isCorrect, elapsedMs, streak: isCorrect ? 1 : 0, timeLimitMs }).total;
}
