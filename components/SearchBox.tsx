"use client";

import { useState, type FormEvent } from "react";
import type { TrackSummary } from "@/lib/types";

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mxm/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a song… (e.g. Bohemian Rhapsody)"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-red-600 px-5 py-3 font-medium transition hover:bg-red-500 disabled:opacity-50"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {searched && !error && results.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">No songs found. Try another query.</p>
      )}

      <ul className="mt-6 space-y-2">
        {results.map((t) => (
          <li
            key={t.trackId}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{t.trackName}</p>
              <p className="truncate text-sm text-neutral-400">{t.artistName}</p>
            </div>
            <div className="ml-3 flex shrink-0 gap-1 text-xs">
              {t.hasRichsync && (
                <span className="rounded bg-red-600/20 px-2 py-1 text-red-300">richsync</span>
              )}
              {t.hasLyrics && (
                <span className="rounded bg-neutral-700/50 px-2 py-1 text-neutral-300">lyrics</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
