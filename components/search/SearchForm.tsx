"use client";

import type { FormEvent } from "react";

interface SearchFormProps {
  query: string;
  loading: boolean;
  labels: {
    searchLabel: string;
    searchPlaceholder: string;
    searchButton: string;
    searchingButton: string;
  };
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function SearchForm({
  query,
  loading,
  labels,
  onQueryChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="song-search">
        {labels.searchLabel}
      </label>
      <input
        id="song-search"
        value={query}
        autoComplete="off"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={labels.searchPlaceholder}
        className="h-14 rounded-2xl border border-neutral-750 bg-neutral-950/80 px-5 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-brand focus:ring-2 focus:ring-brand/35"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-14 rounded-2xl bg-brand px-7 text-base font-semibold text-white transition hover:bg-brand-400 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
      >
        {loading ? labels.searchingButton : labels.searchButton}
      </button>
    </form>
  );
}
