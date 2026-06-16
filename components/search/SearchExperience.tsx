"use client";

import { useMemo, useState, type FormEvent } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import { copy, defaultLocale } from "@/lib/i18n";
import type { ErrorResponse, Locale, SearchResponse, TrackSummary } from "@/lib/types";

export default function SearchExperience() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setResults([]);
      setSearched(true);
      setError(err instanceof Error ? err.message : text.errorFallback);
    } finally {
      setLoading(false);
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

          <TrackResults results={results} searched={searched} labels={text} />

          <p className="border-t border-neutral-850 pt-4 text-xs leading-5 text-neutral-500">
            {text.complianceNote}
          </p>
        </section>
      </div>
    </main>
  );
}
