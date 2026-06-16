// Auto-generated stage name for the Soundcheck onboarding — a one-tap identity,
// no keyboard required. The visual mark is a monogram (see Avatar), not an emoji.
// Client-only (uses Math.random).

export const STAGE_ADJECTIVES = [
  "Velvet", "Neon", "Midnight", "Golden", "Electric", "Crimson",
  "Silver", "Wild", "Cosmic", "Lunar", "Royal", "Echo",
];

export const STAGE_NOUNS = [
  "Snare", "Riff", "Verse", "Anthem", "Diva", "Phantom",
  "Maverick", "Siren", "Vandal", "Comet", "Bishop", "Pulse",
];

export interface StageIdentity {
  stageName: string;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomStageName(): string {
  return `${pick(STAGE_ADJECTIVES)} ${pick(STAGE_NOUNS)}`;
}

export function randomIdentity(): StageIdentity {
  return { stageName: randomStageName() };
}
