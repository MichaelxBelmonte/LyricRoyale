"use client";

import type { FormEvent } from "react";
import Icon from "@/components/ui/Icon";

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
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="song-search">
        {labels.searchLabel}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
          <Icon name="search" size={16} />
        </span>
        <input
          id="song-search"
          value={query}
          autoComplete="off"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-12 w-full rounded-md border border-neutral-800 bg-neutral-950 pl-9 pr-3 text-base text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-brand"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-md bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
      >
        {loading ? labels.searchingButton : labels.searchButton}
      </button>
    </form>
  );
}
