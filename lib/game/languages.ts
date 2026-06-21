// Narrator languages offered at session creation. This is the full set
// supported by ElevenLabs' `eleven_multilingual_v2` model — the host voice
// reads any of these directly from the text, so picking one only changes the
// language of the generated banter (see lib/game/host-banter.ts).
//
// `code` is sent to ElevenLabs as `language_code` and stored on the session as
// `narratorLang`. `nativeName` is what the host sees in the picker.
export interface NarratorLanguage {
  code: string;
  label: string; // English name (for reference / search)
  nativeName: string; // shown in the UI picker
}

export const SUPPORTED_LANGUAGES: NarratorLanguage[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeName: "Português" },
  { code: "pl", label: "Polish", nativeName: "Polski" },
  { code: "nl", label: "Dutch", nativeName: "Nederlands" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "uk", label: "Ukrainian", nativeName: "Українська" },
  { code: "cs", label: "Czech", nativeName: "Čeština" },
  { code: "sk", label: "Slovak", nativeName: "Slovenčina" },
  { code: "hr", label: "Croatian", nativeName: "Hrvatski" },
  { code: "bg", label: "Bulgarian", nativeName: "Български" },
  { code: "ro", label: "Romanian", nativeName: "Română" },
  { code: "el", label: "Greek", nativeName: "Ελληνικά" },
  { code: "fi", label: "Finnish", nativeName: "Suomi" },
  { code: "sv", label: "Swedish", nativeName: "Svenska" },
  { code: "da", label: "Danish", nativeName: "Dansk" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },
  { code: "ar", label: "Arabic", nativeName: "العربية" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "ta", label: "Tamil", nativeName: "தமிழ்" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "zh", label: "Chinese", nativeName: "中文" },
  { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", nativeName: "Bahasa Melayu" },
  { code: "fil", label: "Filipino", nativeName: "Filipino" },
];

export const DEFAULT_LANGUAGE = "en";

const SUPPORTED_CODES = new Set<string>(SUPPORTED_LANGUAGES.map((lang) => lang.code));

export function isSupportedLanguage(code: unknown): code is string {
  return typeof code === "string" && SUPPORTED_CODES.has(code);
}

/** Normalize an arbitrary input to a supported language code, defaulting to English. */
export function normalizeLanguage(code: unknown): string {
  return isSupportedLanguage(code) ? code : DEFAULT_LANGUAGE;
}

export function languageName(code: string): string {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.nativeName ?? code;
}
