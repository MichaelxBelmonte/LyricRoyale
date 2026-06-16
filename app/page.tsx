import SearchBox from "@/components/SearchBox";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-widest text-red-400">
          Powered by live Musixmatch lyrics
        </p>
        <h1 className="mt-2 text-4xl font-bold">🎤 Lyric Royale</h1>
        <p className="mt-2 text-neutral-400">
          Search a song to start. Lyrics are fetched live and never stored.
        </p>
      </header>
      <SearchBox />
    </main>
  );
}
