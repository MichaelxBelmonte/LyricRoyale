import "server-only";

import { DEFAULT_BANTER_PACK, staticBanterPack, type BanterPack } from "@/lib/game/host-banter";

const BASE = "https://api.anthropic.com/v1";
// Highest-quality default; override with a faster/cheaper model (e.g.
// claude-haiku-4-5) via env when room-creation latency matters more.
const DEFAULT_MODEL = "claude-opus-4-8";

// Banter packs are language-only (they hold {placeholder} templates, not
// session data), so a single generation per language is reused across every
// session. The cache is module-global and survives between requests on a warm
// server; a cold start simply regenerates on first use.
const packCache = new Map<string, BanterPack>();

function apiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
}

function model(): string {
  return process.env.ANTHROPIC_BANTER_MODEL?.trim() || DEFAULT_MODEL;
}

// JSON-schema mirror of BanterPack — structured outputs guarantee the shape.
const BANTER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "roasts",
    "intros",
    "welcomeWith",
    "welcomeEmpty",
    "finalWith",
    "finalEmpty",
    "leaderLine",
    "scoresLocked",
    "answerLine",
    "answersIn",
    "roundLabel",
  ],
  properties: {
    roasts: { type: "array", items: { type: "string" } },
    intros: { type: "array", items: { type: "string" } },
    welcomeWith: { type: "string" },
    welcomeEmpty: { type: "string" },
    finalWith: { type: "string" },
    finalEmpty: { type: "string" },
    leaderLine: { type: "string" },
    scoresLocked: { type: "string" },
    answerLine: { type: "string" },
    answersIn: { type: "string" },
    roundLabel: { type: "string" },
  },
} as const;

function buildPrompt(nativeName: string): string {
  return [
    `You localize the spoken lines for BEATBOT, the hype game-show host of a live music party game called Soundclash, into ${nativeName}.`,
    "",
    "Translate the English reference pack below into natural, idiomatic, playful spoken " +
      `${nativeName} — the energy of a charismatic radio/club host, not a literal translation. Keep each line short (it is read aloud by a text-to-speech voice; stay well under 400 characters).`,
    "",
    "STRICT RULES:",
    "- Preserve every {placeholder} token EXACTLY as written ({name}, {guess}, {solution}, {title}, {code}, {players}, {leader}, {index}). Do not translate, rename, reorder the braces, or add/remove placeholders.",
    "- Keep the « » guillemets around quoted lyrics/guesses.",
    "- `roasts` must have exactly 3 entries; `intros` must have exactly 3 entries.",
    "- Return only the localized pack via the structured output — no commentary.",
    "",
    "English reference pack:",
    JSON.stringify(DEFAULT_BANTER_PACK, null, 2),
  ].join("\n");
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length > 0 ? items : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

// Coerce the model's JSON into a complete BanterPack, falling back field-by-field
// to English so a partial/odd response can never produce missing lines.
function toBanterPack(raw: unknown): BanterPack {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    roasts: asStringArray(data.roasts, DEFAULT_BANTER_PACK.roasts),
    intros: asStringArray(data.intros, DEFAULT_BANTER_PACK.intros),
    welcomeWith: asString(data.welcomeWith, DEFAULT_BANTER_PACK.welcomeWith),
    welcomeEmpty: asString(data.welcomeEmpty, DEFAULT_BANTER_PACK.welcomeEmpty),
    finalWith: asString(data.finalWith, DEFAULT_BANTER_PACK.finalWith),
    finalEmpty: asString(data.finalEmpty, DEFAULT_BANTER_PACK.finalEmpty),
    leaderLine: asString(data.leaderLine, DEFAULT_BANTER_PACK.leaderLine),
    scoresLocked: asString(data.scoresLocked, DEFAULT_BANTER_PACK.scoresLocked),
    answerLine: asString(data.answerLine, DEFAULT_BANTER_PACK.answerLine),
    answersIn: asString(data.answersIn, DEFAULT_BANTER_PACK.answersIn),
    roundLabel: asString(data.roundLabel, DEFAULT_BANTER_PACK.roundLabel),
  };
}

async function generateBanterPack(nativeName: string): Promise<BanterPack | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const response = await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        max_tokens: 1500,
        output_config: { format: { type: "json_schema", schema: BANTER_SCHEMA } },
        messages: [{ role: "user", content: buildPrompt(nativeName) }],
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[anthropic.banter]", { status: response.status });
      return null;
    }
    const data = (await response.json()) as {
      stop_reason?: string;
      content?: { type: string; text?: string }[];
    };
    if (data.stop_reason === "refusal") return null;
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) return null;
    return toBanterPack(JSON.parse(text));
  } catch (err) {
    console.error("[anthropic.banter]", { message: err instanceof Error ? err.message : "unknown" });
    return null;
  }
}

/**
 * Resolve the host-narrator banter pack for a language. English/Italian use the
 * built-in static packs (instant, deterministic). Any other supported language
 * is generated once by Claude and cached; if Claude is unavailable, it falls
 * back to the English pack so the show always has lines to speak.
 */
export async function resolveBanterPack(code: string, nativeName: string): Promise<BanterPack> {
  const preset = staticBanterPack(code);
  if (preset) return preset;

  const cached = packCache.get(code);
  if (cached) return cached;

  const generated = await generateBanterPack(nativeName);
  if (generated) {
    packCache.set(code, generated);
    return generated;
  }
  return DEFAULT_BANTER_PACK;
}
