"use client";

import type { FormEvent } from "react";
import Button from "@/components/brand/Button";
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
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="song-search">
        {labels.searchLabel}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35">
          <Icon name="search" size={16} />
        </span>
        <input
          id="song-search"
          value={query}
          autoComplete="off"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="h-12 w-full rounded-lg border border-black/15 bg-white pl-9 pr-3 text-base text-[#0b0b0b] outline-none transition-colors placeholder:text-black/35 focus:border-[#ff007f] focus:shadow-[0_0_0_3px_rgba(255,0,127,0.15)]"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? labels.searchingButton : labels.searchButton}
      </Button>
    </form>
  );
}
