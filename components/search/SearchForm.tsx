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
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="song-search">
        {labels.searchLabel}
      </label>
      <input
        id="song-search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={labels.searchPlaceholder}
        className="h-12 rounded-md border border-neutral-750 bg-neutral-950 px-4 text-base text-white outline-none transition placeholder:text-neutral-500 focus:border-red-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-md bg-red-600 px-5 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? labels.searchingButton : labels.searchButton}
      </button>
    </form>
  );
}
