"use client";

import { useMemo, useState, type FormEvent } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import FinishLineGame from "@/components/rounds/FinishLineGame";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import { copy, defaultLocale } from "@/lib/i18n";
import type {
  ErrorResponse,
  FinishLineResponse,
  FinishLineRound,
  Locale,
  SearchResponse,
  TrackSummary,
} from "@/lib/types";

export default function SearchExperience() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null);
  const [round, setRound] = useState<FinishLineRound | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);

  const text = copy[locale];
  const languageLabels = useMemo(
    () => ({
      toggle: text.languageToggle,
      english: copy.en.languageName,
      italian: copy.it.languageName,
    }),
    [text.languageToggle],
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = (await response.json()) as Partial<SearchResponse & ErrorResponse>;

      if (!response.ok) {
        throw new Error(payload.error ?? text.errorFallback);
      }

      setResults(payload.results ?? []);
      setSearched(true);
      setRound(null);
      setSelectedTrack(null);
      setRoundError(null);
    } catch (err) {
      setResults([]);
      setSearched(true);
      setError(err instanceof Error ? err.message : text.errorFallback);
    } finally {
      setLoading(false);
    }
  }

  async function startRound(track: TrackSummary) {
    setSelectedTrack(track);
    setRound(null);
    setRoundError(null);
    setLoadingTrackId(track.trackId);

    try {
      const response = await fetch("/api/rounds/finish-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.trackId }),
      });
      const payload = (await response.json()) as Partial<FinishLineResponse & ErrorResponse>;

      if (!response.ok || !payload.round) {
        throw new Error(payload.error ?? text.roundError);
      }

      setRound(payload.round);
    } catch (err) {
      setRoundError(err instanceof Error ? err.message : text.roundError);
    } finally {
      setLoadingTrackId(null);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-6 border-b border-neutral-850 pb-8">
          <div className="flex justify-end">
            <LanguageToggle locale={locale} labels={languageLabels} onChange={setLocale} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-300">
              {text.heroEyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">{text.heroTitle}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-300">{text.heroBody}</p>
          </div>
        </header>

        <section className="space-y-5" aria-label={text.searchLabel}>
          <SearchForm
            query={query}
            loading={loading}
            labels={text}
            onQueryChange={setQuery}
            onSubmit={handleSearch}
          />

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <TrackResults
            results={results}
            searched={searched}
            loadingTrackId={loadingTrackId}
            labels={text}
            onPlay={startRound}
          />

          {roundError ? <p className="text-sm text-red-300">{roundError}</p> : null}

          {round && selectedTrack ? (
            <FinishLineGame
              round={round}
              track={selectedTrack}
              labels={text}
              onReset={() => {
                setRound(null);
                setSelectedTrack(null);
                setRoundError(null);
              }}
            />
          ) : null}

          <p className="border-t border-neutral-850 pt-4 text-xs leading-5 text-neutral-500">
            {text.complianceNote}
          </p>
        </section>
      </div>
    </main>
  );
}
