import type { SessionRound } from "@/lib/session/types";
import type { Locale } from "@/lib/types";

// Localized roast templates. BEATBOT reads one of these at reveal, calling out a
// player who locked in a wrong answer. Pure and deterministic on round.index.
const ROAST_TEMPLATES: Record<Locale, ((name: string, guess: string, solution: string) => string)[]> = {
  it: [
    (name, guess, solution) => `${name} era convintissimo: «${guess}». Eh no. Era «${solution}».`,
    (name, guess, solution) => `Applausi per ${name}, che ha sparato «${guess}». La risposta era «${solution}».`,
    (name, guess, solution) => `${name}, «${guess}»? Coraggioso. Sbagliato, ma coraggioso. Era «${solution}».`,
  ],
  en: [
    (name, guess, solution) => `${name} locked in «${guess}». Bold. Wrong. It was «${solution}».`,
    (name, guess, solution) => `Big applause for ${name}, who went with «${guess}». The answer was «${solution}».`,
    (name, guess, solution) => `${name}, «${guess}»? Brave choice. The line was «${solution}».`,
  ],
};

const MAX_LEN = 400; // ElevenLabs truncates at 420 chars; stay under with room for the leader line.

/**
 * Build a roast line for the reveal: picks one wrong answer deterministically and
 * mocks the player by name. Returns null when there is no solution or no wrong
 * answer to roast — the caller then falls back to the neutral announcement.
 */
export function buildRoastLine(
  round: Pick<SessionRound, "index" | "solution" | "answers">,
  locale: Locale,
): string | null {
  const solution = round.solution?.trim();
  if (!solution) return null;

  const wrong = round.answers.filter((answer) => !answer.correct && answer.guess.trim());
  if (wrong.length === 0) return null;

  const pick = wrong[Math.abs(round.index * 37 + 11) % wrong.length];
  const templates = ROAST_TEMPLATES[locale] ?? ROAST_TEMPLATES.en;
  const template = templates[Math.abs(round.index * 13) % templates.length];
  const line = template(pick.playerName, pick.guess.trim(), solution);
  return line.length > MAX_LEN ? `${line.slice(0, MAX_LEN - 1)}…` : line;
}

// Playful, varied round intros so BEATBOT doesn't sound like a robot reading a list.
const ROUND_INTROS: Record<Locale, ((title: string) => string)[]> = {
  it: [
    (t) => `Si cambia: ${t}! Telefoni pronti.`,
    (t) => `Nuovo round, ${t}. Fatemi vedere chi comanda.`,
    (t) => `${t}! Occhi sullo schermo, dita veloci.`,
  ],
  en: [
    (t) => `Switching it up: ${t}! Phones ready.`,
    (t) => `New round, ${t}. Show me who runs this room.`,
    (t) => `${t}! Eyes on the screen, quick fingers.`,
  ],
};

export function roundIntroLine(title: string, index: number, locale: Locale): string {
  const list = ROUND_INTROS[locale] ?? ROUND_INTROS.en;
  return list[Math.abs(index) % list.length](title);
}

export function welcomeLine(code: string, players: number, locale: Locale): string {
  if (locale === "it") {
    return players > 0
      ? `Benvenuti a Soundclash! Stanza ${code}, ${players} in gara. Si gioca!`
      : `Benvenuti a Soundclash! Stanza ${code}. Tirate fuori i telefoni, si parte.`;
  }
  return players > 0
    ? `Welcome to Soundclash! Room ${code}, ${players} in the game. Let's go!`
    : `Welcome to Soundclash! Room ${code}. Grab your phones and let's play.`;
}

export function finalLine(leader: string | undefined, locale: Locale): string {
  if (locale === "it") {
    return leader
      ? `È finita! Punteggi bloccati. ${leader} sale sul trono. Che set!`
      : `È finita! Punteggi bloccati. Incoroniamo il vincitore!`;
  }
  return leader
    ? `That's a wrap! Scores locked. ${leader} takes the crown. What a set!`
    : `That's a wrap! Scores are locked. Crown the winner!`;
}
