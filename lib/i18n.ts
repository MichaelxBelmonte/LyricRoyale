import type { Locale } from "@/lib/types";

export const defaultLocale: Locale = "en";
export const supportedLocales: Locale[] = ["en", "it"];

export const copy = {
  en: {
    languageName: "English",
    languageToggle: "Language",
    heroEyebrow: "Powered by live Musixmatch lyrics",
    heroTitle: "Lyric Royale",
    heroBody:
      "Search a song and start a live lyric round. Musixmatch content is fetched in real time and never stored.",
    searchLabel: "Song search",
    searchPlaceholder: "Search a song, artist, or lyric hint",
    searchButton: "Search",
    searchingButton: "Searching",
    emptyState: "Search for a song to begin.",
    noResults: "No matching songs found. Try another query.",
    errorFallback: "Search failed. Please try again.",
    resultsTitle: "Live Musixmatch Results",
    resultMeta: "Available live from Musixmatch",
    richsyncBadge: "richsync",
    lyricsBadge: "lyrics",
    complianceNote:
      "MVP privacy rule: results are displayed transiently only. No lyrics, track metadata, or richsync payloads are persisted.",
  },
  it: {
    languageName: "Italiano",
    languageToggle: "Lingua",
    heroEyebrow: "Basato su testi Musixmatch live",
    heroTitle: "Lyric Royale",
    heroBody:
      "Cerca una canzone e avvia un round sui testi live. I contenuti Musixmatch vengono recuperati in tempo reale e mai salvati.",
    searchLabel: "Ricerca canzone",
    searchPlaceholder: "Cerca una canzone, artista o indizio del testo",
    searchButton: "Cerca",
    searchingButton: "Cerco",
    emptyState: "Cerca una canzone per iniziare.",
    noResults: "Nessun brano trovato. Prova un'altra ricerca.",
    errorFallback: "Ricerca non riuscita. Riprova.",
    resultsTitle: "Risultati Musixmatch Live",
    resultMeta: "Disponibile live da Musixmatch",
    richsyncBadge: "richsync",
    lyricsBadge: "testo",
    complianceNote:
      "Regola privacy MVP: i risultati sono mostrati solo temporaneamente. Testi, metadati e richsync non vengono salvati.",
  },
} satisfies Record<Locale, Record<string, string>>;
