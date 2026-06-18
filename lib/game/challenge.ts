// Async "Ghost Duel" challenge link. Encodes ONLY references + the challenger's
// per-round timing/score — never lyric text, never the answer — so a shared link
// is compliance-safe (the recipient regenerates the rounds live from the trackId).

export interface ChallengeRoundResult {
  hit: boolean;
  elapsedMs: number;
  points: number;
}

export interface Challenge {
  v: 1;
  trackId: number;
  name: string;
  rounds: ChallengeRoundResult[];
  total: number;
}

// Compact wire form to keep the URL short: r = [hit(0|1), elapsedMs, points][].
interface Wire {
  v: 1;
  t: number;
  n: string;
  s: number;
  r: Array<[number, number, number]>;
}

function toBase64(json: string): string {
  const b64 =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  return typeof window !== "undefined"
    ? decodeURIComponent(escape(window.atob(b64)))
    : Buffer.from(b64, "base64").toString("utf8");
}

export function encodeChallenge(challenge: Challenge): string {
  const wire: Wire = {
    v: 1,
    t: challenge.trackId,
    n: challenge.name.slice(0, 40),
    s: Math.round(challenge.total),
    r: challenge.rounds.map((round) => [
      round.hit ? 1 : 0,
      Math.round(round.elapsedMs),
      Math.round(round.points),
    ]),
  };
  return toBase64(JSON.stringify(wire));
}

export function decodeChallenge(token: string): Challenge | null {
  try {
    const wire = JSON.parse(fromBase64(token)) as Wire;
    if (wire.v !== 1 || typeof wire.t !== "number" || !Array.isArray(wire.r)) return null;
    return {
      v: 1,
      trackId: wire.t,
      name: typeof wire.n === "string" && wire.n.trim() ? wire.n : "Rival",
      total: Number(wire.s) || 0,
      rounds: wire.r.map(([hit, elapsedMs, points]) => ({
        hit: hit === 1,
        elapsedMs: Number(elapsedMs) || 0,
        points: Number(points) || 0,
      })),
    };
  } catch {
    return null;
  }
}

export interface LineVerdict {
  you: ChallengeRoundResult;
  them: ChallengeRoundResult;
  outcome: "win" | "loss" | "tie";
}

export interface HeadToHead {
  lines: LineVerdict[];
  myTotal: number;
  theirTotal: number;
  margin: number;
  won: boolean;
}

const EMPTY: ChallengeRoundResult = { hit: false, elapsedMs: 0, points: 0 };

export function headToHead(
  mine: ChallengeRoundResult[],
  theirs: ChallengeRoundResult[],
): HeadToHead {
  const count = Math.max(mine.length, theirs.length);
  const lines: LineVerdict[] = [];
  for (let i = 0; i < count; i++) {
    const you = mine[i] ?? EMPTY;
    const them = theirs[i] ?? EMPTY;
    const outcome = you.points > them.points ? "win" : you.points < them.points ? "loss" : "tie";
    lines.push({ you, them, outcome });
  }
  const myTotal = mine.reduce((sum, round) => sum + round.points, 0);
  const theirTotal = theirs.reduce((sum, round) => sum + round.points, 0);
  return { lines, myTotal, theirTotal, margin: Math.abs(myTotal - theirTotal), won: myTotal >= theirTotal };
}
