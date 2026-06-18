"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import JoinQr from "@/components/session/JoinQr";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import type { PublicSessionState } from "@/lib/session/types";
import type { ErrorResponse, FinishLineDrop, SearchResponse, TrackSummary, TrackingLinks } from "@/lib/types";

const AUTOPILOT_ROUNDS = 6;
const AUTO_SEED_QUERY = "queen";

const searchLabels = {
  searchLabel: "Song search",
  searchPlaceholder: "Search artist or song",
  searchButton: "Search",
  searchingButton: "Searching",
};

const resultLabels = {
  emptyState: "Search one artist or song. The show will run itself from there.",
  noResults: "No matching tracks found.",
  resultsTitle: "Autopilot seed",
  resultMeta: "Live Musixmatch result",
  playButton: "Start show",
  loadingRound: "Starting",
  richsyncBadge: "richsync",
  lyricsBadge: "lyrics",
};

function MusixmatchTracking({ roundKey, tracking }: { roundKey?: string; tracking?: TrackingLinks }) {
  useEffect(() => {
    if (!roundKey || !tracking?.pixel) return;
    const pixel = new Image();
    pixel.referrerPolicy = "no-referrer";
    pixel.src = tracking.pixel;
  }, [roundKey, tracking?.pixel]);

  useEffect(() => {
    if (!roundKey || !tracking?.script) return;
    const script = document.createElement("script");
    script.src = tracking.script;
    script.async = true;
    script.referrerPolicy = "no-referrer";
    document.body.appendChild(script);
    return () => script.remove();
  }, [roundKey, tracking?.script]);

  return null;
}

export default function HostRoom({ code }: { code: string }) {
  const [session, setSession] = useState<PublicSessionState | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const spokenEvents = useRef(new Set<string>());

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return `/join?code=${code}`;
    return `${window.location.origin}/join?code=${code}`;
  }, [code]);

  const loadSession = useCallback(async () => {
    const response = await fetch(`/api/sessions/${code}`, { cache: "no-store" });
    const payload = (await response.json()) as { session?: PublicSessionState; error?: string };
    if (!response.ok || !payload.session) throw new Error(payload.error ?? "Session not found");
    setSession(payload.session);
  }, [code]);

  useEffect(() => {
    void loadSession().catch((err) => setError(err instanceof Error ? err.message : "Session not found"));
    const timer = window.setInterval(() => {
      void loadSession().catch(() => {});
    }, 1200);
    return () => window.clearInterval(timer);
  }, [loadSession]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value || loadingSearch) return;
    setLoadingSearch(true);
    setError(null);
    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(value)}`);
      const payload = (await response.json()) as Partial<SearchResponse & ErrorResponse>;
      if (!response.ok) throw new Error(payload.error ?? "Search failed");
      setResults(payload.results ?? []);
      setSearched(true);
    } catch (err) {
      setResults([]);
      setSearched(true);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoadingSearch(false);
    }
  }

  async function start(track: TrackSummary, deck = results) {
    setLoadingTrackId(track.trackId);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${code}/round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auto: true,
          trackId: track.trackId,
          trackName: track.trackName,
          artistName: track.artistName,
          hasRichsync: track.hasRichsync,
          deck: deck.map((item) => ({
            trackId: item.trackId,
            trackName: item.trackName,
            artistName: item.artistName,
            hasRichsync: item.hasRichsync,
          })),
        }),
      });
      const payload = (await response.json()) as { session?: PublicSessionState; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "Could not start show");
      setSession(payload.session);
      void speakHost(`First round. ${payload.session.currentRound?.title ?? "Lyric game"}. Phones up.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start show");
    } finally {
      setLoadingTrackId(null);
    }
  }

  async function startAutoSeed() {
    if (loadingSearch || loadingTrackId) return;
    setQuery(AUTO_SEED_QUERY);
    setLoadingSearch(true);
    setError(null);
    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(AUTO_SEED_QUERY)}`);
      const payload = (await response.json()) as Partial<SearchResponse & ErrorResponse>;
      if (!response.ok) throw new Error(payload.error ?? "Search failed");
      const deck = payload.results ?? [];
      setResults(deck);
      setSearched(true);
      const track = deck[0];
      if (!track) throw new Error("No playable seed found.");
      await start(track, deck);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not auto-pick a show.");
    } finally {
      setLoadingSearch(false);
    }
  }

  async function patchSession(actionName: "reveal" | "lobby") {
    const response = await fetch(`/api/sessions/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName }),
    });
    const payload = (await response.json()) as { session?: PublicSessionState };
    if (payload.session) setSession(payload.session);
  }

  async function startNextAutoRound() {
    const active = session?.currentRound;
    if (!active) return;
    const response = await fetch(`/api/sessions/${code}/round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auto: true,
        trackId: active.trackId,
        trackName: active.trackName,
        artistName: active.artistName,
        hasRichsync: active.hasRichsync,
      }),
    });
    const payload = (await response.json()) as { session?: PublicSessionState };
    if (payload.session) {
      setSession(payload.session);
      void speakHost(`Next round. ${payload.session.currentRound?.title ?? "Lyric game"}.`);
    }
  }

  useEffect(() => {
    const active = session?.currentRound;
    if (!active || session.status !== "playing" || active.status !== "answering") return;
    if (session.players.length === 0 || active.answers.length < session.players.length) return;
    const timer = window.setTimeout(() => void patchSession("reveal"), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentRound?.answers.length, session?.currentRound?.status, session?.players.length, session?.status]);

  useEffect(() => {
    const active = session?.currentRound;
    if (!active || session.status !== "playing" || active.status !== "answering") return;
    const delay = Math.max(800, active.endsAt - Date.now() + 500);
    const timer = window.setTimeout(() => void patchSession("reveal"), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentRound?.endsAt, session?.currentRound?.status, session?.status]);

  useEffect(() => {
    const active = session?.currentRound;
    if (!active || session.status !== "results" || active.status !== "revealed") return;
    if (active.index >= AUTOPILOT_ROUNDS) {
      void speakHost("Final scores are locked. Crown the winner.");
      return;
    }
    const timer = window.setTimeout(() => void startNextAutoRound(), 5200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentRound?.index, session?.currentRound?.status, session?.status]);

  useEffect(() => {
    const active = session?.currentRound;
    if (!active || session.status !== "results" || active.status !== "revealed" || speaking) return;
    const key = `reveal:${active.index}:${active.solution ?? ""}`;
    if (spokenEvents.current.has(key)) return;
    spokenEvents.current.add(key);
    const leader = session.players[0]?.name;
    const answerLine = active.solution ? `Answer: ${active.solution}.` : "Answers are in.";
    const leaderLine = leader ? `${leader} leads the board.` : "Scores are locked.";
    void speakHost(`Round ${active.index}. ${answerLine} ${leaderLine}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentRound?.index, session?.currentRound?.solution, session?.status, speaking]);

  function copyJoin() {
    void navigator.clipboard?.writeText(joinUrl).then(() => setCopied(true)).catch(() => {});
  }

  async function speakHost(text: string) {
    if (!session || speaking) return;
    let url: string | null = null;
    setSpeaking(true);
    setSpeechError(null);
    window.dispatchEvent(new CustomEvent("soundclash:duck", { detail: { active: true } }));
    try {
      const response = await fetch("/api/host/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: session.voice.preset,
          voiceId: session.voice.voiceId,
          languageCode: session.locale,
          text,
        }),
      });
      if (!response.ok) throw new Error("Speech failed");
      const blob = await response.blob();
      url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Speech playback failed"));
        void audio.play().catch(reject);
      });
    } catch (err) {
      setSpeechError(err instanceof Error ? err.message : "Could not play host voice.");
    } finally {
      if (url) URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent("soundclash:duck", { detail: { active: false } }));
      setSpeaking(false);
    }
  }

  async function speakIntro() {
    if (!session) return;
    await speakHost(
      `Welcome to Soundclash. Room ${session.code}. ${session.players.length} players are ready. Autopilot is on.`,
    );
  }

  if (error && !session) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <Logo href="/" className="h-8 sm:h-10" withMark markClassName="h-10 w-10" />
        <p className="mt-6 text-sm text-brand-300">{error}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/host/new"
            className="flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-400"
          >
            Create a new room
          </Link>
          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-md border border-neutral-800 px-5 text-sm font-semibold uppercase tracking-[0.1em] text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
          >
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="grid grid-cols-1 gap-4 border-b border-neutral-850 pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">TV host screen</p>
          <h1 className="mt-2">
            <Logo href="/" className="h-9 sm:h-14" withMark markClassName="h-10 w-10 sm:h-12 sm:w-12" />
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Voice: {session?.voice.label ?? "Hype Host"} · Autopilot: {session?.autopilot ? "on" : "off"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void speakIntro()}
              disabled={!session || speaking}
              className="rounded-md border border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-brand hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {speaking ? "Speaking" : "Speak intro"}
            </button>
            {speechError ? <span className="text-xs text-brand-300">{speechError}</span> : null}
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:p-5">
          <JoinQr url={joinUrl} size={128} className="shrink-0" />
          <div className="min-w-0 text-center sm:text-left">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-aqua-300">
              Scan to join · or enter code
            </p>
            <p className="mt-1 font-mono text-5xl font-bold tracking-[0.12em] text-white">{code}</p>
            <button
              type="button"
              onClick={copyJoin}
              className="mt-3 inline-flex h-9 items-center rounded-md border border-white/15 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-300 transition-colors hover:border-aqua hover:text-aqua-300"
            >
              {copied ? "Link copied ✓" : "Copy join link"}
            </button>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-4">
          <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
              Players
            </p>
            <div className="mt-3 grid gap-2">
              {session?.players.length ? (
                session.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 rounded-md border border-neutral-850 bg-neutral-950 px-2 py-2"
                  >
                    <Avatar name={player.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{player.name}</span>
                    <span className="font-mono text-xs tabular-nums text-neutral-500">{player.score}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">Waiting for phones to join.</p>
              )}
            </div>
          </section>

        </aside>

        <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
          {session?.status === "playing" || session?.status === "results" ? (
            <HostRound
              session={session}
              onReveal={() => void patchSession("reveal")}
              onNext={() => void startNextAutoRound()}
              onLobby={() => void patchSession("lobby")}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-white">
                  Pick one seed track
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  After this, the host rotates mini-games and advances the set automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void startAutoSeed()}
                disabled={loadingSearch || loadingTrackId !== null}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
              >
                <Icon name="shuffle" size={16} />
                {loadingSearch || loadingTrackId !== null ? "Directing show" : "Auto-pick show"}
              </button>
              <SearchForm
                query={query}
                loading={loadingSearch}
                labels={searchLabels}
                onQueryChange={setQuery}
                onSubmit={search}
              />
              {error ? <p className="text-sm text-brand-300">{error}</p> : null}
              <TrackResults
                results={results}
                searched={searched}
                loadingTrackId={loadingTrackId}
                labels={resultLabels}
                onPlay={start}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HostRound({
  session,
  onReveal,
  onNext,
  onLobby,
}: {
  session: PublicSessionState;
  onReveal: () => void;
  onNext: () => void;
  onLobby: () => void;
}) {
  const active = session.currentRound;
  const prompt = active?.prompt ?? "Loading mini-game";
  const complete = (active?.index ?? 0) >= AUTOPILOT_ROUNDS && active?.status === "revealed";
  const remainingMs = useRemainingMs(active?.endsAt ?? 0, active?.status === "answering");
  const durationMs = active ? Math.max(1, active.endsAt - active.startedAt) : 1;
  const remainingRatio = Math.max(0, Math.min(1, remainingMs / durationMs));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">
            {active?.title ?? "Guided round"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">{active?.trackName}</h2>
          <p className="text-sm text-neutral-500">{active?.artistName}</p>
          <p className="mt-2 text-sm text-neutral-400">{active?.instruction}</p>
        </div>
        <div className="grid gap-2 rounded-md border border-neutral-850 bg-neutral-950 px-3 py-2 md:min-w-44">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-500">
              Round
            </p>
            <p className="font-mono text-2xl text-white">
              {active?.index ?? 0}/{AUTOPILOT_ROUNDS}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-850">
            <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${remainingRatio * 100}%` }} />
          </div>
          <p className="text-right font-mono text-xs tabular-nums text-neutral-500">
            {active?.status === "answering" ? `${Math.ceil(remainingMs / 1000)}s` : "reveal"}
          </p>
        </div>
      </div>

      <p className="mt-10 text-4xl font-semibold leading-tight text-white sm:text-6xl">
        {active ? <HostPrompt round={active} /> : prompt}
      </p>

      {active?.answerType === "choice" && active.options?.length ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {active.options.map((option, index) => (
            <div
              key={option}
              className="rounded-md border border-neutral-850 bg-neutral-950 px-4 py-3 text-sm text-neutral-300"
            >
              <span className="mr-2 font-mono text-neutral-600">{index + 1}</span>
              {active.status === "revealed" && option === active.solution ? (
                <span className="text-emerald-300">{option}</span>
              ) : (
                option
              )}
            </div>
          ))}
        </div>
      ) : null}

      {active?.copyright ? (
        <>
          <MusixmatchTracking roundKey={`${session.code}:${active.index}:${active.trackId}`} tracking={active.tracking} />
          <p className="mt-8 max-w-2xl text-xs leading-5 text-neutral-500">{active.copyright}</p>
        </>
      ) : null}

      {active?.status === "revealed" ? (
        <div className="mt-6 rounded-md border border-neutral-850 bg-neutral-950 p-4">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
            {complete ? "Final scoreboard" : "Round scoreboard"}
          </p>
          {active.solution ? (
            <p className="mt-2 text-sm text-neutral-400">
              Answer: <span className="text-white">{active.solution}</span>
            </p>
          ) : null}
          <div className="mt-3 grid gap-2">
            {active.answers.map((answer) => (
              <div key={answer.playerId} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                <span className={answer.correct ? "text-emerald-300" : "text-neutral-400"}>
                  {answer.playerName} · {answer.guess}
                </span>
                <span className="font-mono tabular-nums text-white">{answer.points}</span>
              </div>
            ))}
            {active.answers.length === 0 ? (
              <p className="text-sm text-neutral-500">No locks this round.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {active?.status === "answering" ? (
          <button
            type="button"
            onClick={onReveal}
            className="flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
          >
            <Icon name="check" size={16} />
            Reveal now
          </button>
        ) : !complete ? (
          <button
            type="button"
            onClick={onNext}
            className="flex h-11 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
          >
            <Icon name="shuffle" size={16} />
            Next auto round
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLobby}
          className="h-11 rounded-md border border-neutral-800 px-4 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
        >
          Back to lobby
        </button>
      </div>
    </div>
  );
}

function HostPrompt({ round }: { round: NonNullable<PublicSessionState["currentRound"]> }) {
  const hasBlank = round.prompt.includes("_____");
  const [before, after = ""] = round.prompt.split("_____");

  if (!hasBlank) return round.prompt;

  return (
    <>
      {round.drop && round.status === "answering" ? <KaraokeTokens drop={round.drop} /> : before}
      <span className="mx-2 inline-flex min-w-[5rem] justify-center rounded border-b-4 border-brand px-3 font-mono text-brand-300">
        {round.status === "revealed" && round.solution ? round.solution : "_____"}
      </span>
      {after}
    </>
  );
}

function useRemainingMs(endsAt: number, active: boolean): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    if (!active) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()));
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [active, endsAt]);

  return remaining;
}

function dropCycle(drop: FinishLineDrop): number {
  const lastOffset = drop.tokens.length ? drop.tokens[drop.tokens.length - 1].offset : 0;
  return Math.max(drop.lineDuration, drop.dropOffset + 0.6, lastOffset + 0.6);
}

function KaraokeTokens({ drop }: { drop: FinishLineDrop }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const cycle = dropCycle(drop);
    const timer = window.setInterval(() => {
      setElapsed(((Date.now() - startedAt) / 1000) % cycle);
    }, 80);
    return () => window.clearInterval(timer);
  }, [drop]);

  let activeIndex = -1;
  for (let i = 0; i < drop.tokens.length; i++) {
    if (drop.tokens[i].offset <= elapsed) activeIndex = i;
  }

  return (
    <>
      {drop.tokens.map((token, index) => (
        <span
          key={index}
          className={[
            "transition-colors duration-150",
            index === activeIndex ? "text-brand-300" : index < activeIndex ? "text-white" : "text-neutral-600",
          ].join(" ")}
        >
          {token.text.trim()}
          {index < drop.tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
