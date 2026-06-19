"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Button from "@/components/brand/Button";
import Logo from "@/components/brand/Logo";
import Sticker from "@/components/brand/Sticker";
import AudioConsole from "@/components/session/AudioConsole";
import JoinQr from "@/components/session/JoinQr";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { CURATED_ARTISTS } from "@/lib/game/artists";
import { buildRoastLine, finalLine, roundIntroLine, welcomeLine } from "@/lib/game/host-banter";
import { COMING_SOON_GAMES, MINI_GAME_CATALOG } from "@/lib/session/mini-games";
import type { HostVoicePreset, MiniGameId, PublicSessionState } from "@/lib/session/types";
import type { ErrorResponse, FinishLineDrop, SearchResponse, TrackSummary, TrackingLinks } from "@/lib/types";

const AUTOPILOT_ROUNDS = 6;
const AUTO_SEED_QUERY = "queen";

const SETUP_STEPS = [
  { id: "games" as const, label: "Mini-games" },
  { id: "artists" as const, label: "Artists" },
  { id: "lobby" as const, label: "Lobby" },
];
type SetupStep = (typeof SETUP_STEPS)[number]["id"];

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
  const [setupStep, setSetupStep] = useState<SetupStep>("games");
  const [deck, setDeck] = useState<TrackSummary[]>([]);
  const [hostVolume, setHostVolume] = useState(1);
  const [hostMuted, setHostMuted] = useState(false);
  const spokenEvents = useRef(new Set<string>());
  const speakingRef = useRef(false);
  const speechQueue = useRef<{ text: string; preset?: HostVoicePreset }[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const speechGenRef = useRef(0);
  const hostVolumeRef = useRef(1);
  const hostMutedRef = useRef(false);

  useEffect(() => {
    hostVolumeRef.current = hostVolume;
    hostMutedRef.current = hostMuted;
    if (currentAudioRef.current) currentAudioRef.current.volume = hostMuted ? 0 : hostVolume;
  }, [hostVolume, hostMuted]);

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

  async function searchFor(value: string) {
    const cleaned = value.trim();
    if (!cleaned || loadingSearch) return;
    setQuery(cleaned);
    setLoadingSearch(true);
    setError(null);
    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(cleaned)}`);
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

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await searchFor(query);
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
      void speakHost(roundIntroLine(payload.session.currentRound?.title ?? "Lyric game", 0, payload.session.locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start show");
    } finally {
      setLoadingTrackId(null);
    }
  }

  function toggleDeck(track: TrackSummary) {
    setDeck((prev) =>
      prev.some((item) => item.trackId === track.trackId)
        ? prev.filter((item) => item.trackId !== track.trackId)
        : prev.length >= 8
          ? prev
          : [...prev, track],
    );
  }

  async function autoFillDeck() {
    if (loadingSearch) return;
    setQuery(AUTO_SEED_QUERY);
    setLoadingSearch(true);
    setError(null);
    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(AUTO_SEED_QUERY)}`);
      const payload = (await response.json()) as Partial<SearchResponse & ErrorResponse>;
      if (!response.ok) throw new Error(payload.error ?? "Search failed");
      const found = payload.results ?? [];
      setResults(found);
      setSearched(true);
      setDeck(found.slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not auto-fill the setlist.");
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

  async function configureGames(next: MiniGameId[]) {
    if (next.length === 0) return;
    try {
      const response = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "configure", miniGames: next }),
      });
      const payload = (await response.json()) as { session?: PublicSessionState };
      if (payload.session) setSession(payload.session);
    } catch {
      // Polling will resync the selection if this fails.
    }
  }

  async function startNextAutoRound() {
    const active = session?.currentRound;
    if (!active || !session) return;
    // Rotate through the seeded deck so each round uses a different track — this
    // varies the lyrics and makes the "which song?" rounds meaningful.
    const pool = session.trackPool;
    const next = pool.length ? pool[active.index % pool.length] : null;
    const track = next ?? {
      trackId: active.trackId,
      trackName: active.trackName,
      artistName: active.artistName,
      hasRichsync: active.hasRichsync,
    };
    const response = await fetch(`/api/sessions/${code}/round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auto: true,
        trackId: track.trackId,
        trackName: track.trackName,
        artistName: track.artistName,
        hasRichsync: track.hasRichsync,
      }),
    });
    const payload = (await response.json()) as { session?: PublicSessionState };
    if (payload.session) {
      setSession(payload.session);
      void speakHost(
        roundIntroLine(
          payload.session.currentRound?.title ?? "Lyric game",
          payload.session.currentRound?.index ?? 0,
          payload.session.locale,
        ),
      );
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
      void speakHost(finalLine(session.players[0]?.name, session.locale));
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
    const it = session.locale === "it";
    const leader = session.players[0]?.name;
    const leaderLine = leader ? (it ? `${leader} comanda la classifica.` : `${leader} leads the board.`) : it ? "Punteggi bloccati." : "Scores are locked.";
    const roast = buildRoastLine(active, session.locale);
    if (roast) {
      void speakHost(`${roast} ${leaderLine}`, "judge");
    } else {
      const answerLine = active.solution
        ? it
          ? `Risposta: ${active.solution}.`
          : `Answer: ${active.solution}.`
        : it
          ? "Risposte arrivate."
          : "Answers are in.";
      void speakHost(`Round ${active.index}. ${answerLine} ${leaderLine}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.currentRound?.index, session?.currentRound?.solution, session?.status, speaking]);

  function copyJoin() {
    void navigator.clipboard?.writeText(joinUrl).then(() => setCopied(true)).catch(() => {});
  }

  // Host voice is queued, never overlapped: each line plays in turn, ducking the
  // music while it speaks and un-ducking once the queue drains. Stop clears it all.
  function finishSpeech() {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    currentUrlRef.current = null;
    currentAudioRef.current = null;
    speakingRef.current = false;
    setSpeaking(false);
    void playNextSpeech();
  }

  async function playNextSpeech() {
    if (speakingRef.current || !session) return;
    const next = speechQueue.current.shift();
    if (!next) {
      window.dispatchEvent(new CustomEvent("soundclash:duck", { detail: { active: false } }));
      return;
    }
    const gen = speechGenRef.current;
    speakingRef.current = true;
    setSpeaking(true);
    setSpeechError(null);
    window.dispatchEvent(new CustomEvent("soundclash:duck", { detail: { active: true } }));
    try {
      const response = await fetch("/api/host/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: next.preset ?? session.voice.preset,
          voiceId: next.preset ? undefined : session.voice.voiceId,
          languageCode: session.locale,
          text: next.text,
        }),
      });
      if (!response.ok) throw new Error("Speech failed");
      const blob = await response.blob();
      if (gen !== speechGenRef.current) return; // stopped while loading
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = hostMutedRef.current ? 0 : hostVolumeRef.current;
      currentAudioRef.current = audio;
      currentUrlRef.current = url;
      audio.onended = () => finishSpeech();
      audio.onerror = () => finishSpeech();
      await audio.play();
    } catch (err) {
      if (gen !== speechGenRef.current) return;
      setSpeechError(err instanceof Error ? err.message : "Could not play host voice.");
      finishSpeech();
    }
  }

  function speakHost(text: string, presetOverride?: HostVoicePreset) {
    const clean = text.trim();
    if (!clean) return;
    speechQueue.current.push({ text: clean, preset: presetOverride });
    if (speechQueue.current.length > 3) speechQueue.current.splice(0, speechQueue.current.length - 3);
    if (!speakingRef.current) void playNextSpeech();
  }

  function stopSpeaking() {
    speechGenRef.current += 1;
    speechQueue.current = [];
    const audio = currentAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    finishSpeech();
  }

  function speakIntro() {
    if (!session) return;
    speakHost(welcomeLine(session.code, session.players.length, session.locale));
  }

  const playerCount = session?.players.length ?? 0;

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-850 pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">Host screen</p>
          <h1 className="mt-2">
            <Logo href="/" className="h-9 sm:h-12" withMark markClassName="h-9 w-9 sm:h-11 sm:w-11" />
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-neutral-800 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-neutral-400">
            Voice · {session?.voice.label ?? "Hype Host"}
          </span>
          <span className="rounded-full border border-neutral-800 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-neutral-400">
            {session?.locale === "it" ? "Italiano" : "English"}
          </span>
          <span className="rounded-full border border-aqua/30 bg-aqua/5 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-aqua-300">
            Room {code}
          </span>
          <button
            type="button"
            onClick={() => void speakIntro()}
            disabled={!session || speaking}
            className="rounded-full border border-neutral-800 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-neutral-300 transition-colors hover:border-brand hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {speaking ? "Speaking…" : "Speak intro"}
          </button>
        </div>
      </header>
      {speechError ? <p className="mt-3 text-xs text-brand-300">{speechError}</p> : null}

      <div className="mt-4">
        <AudioConsole
          hostVolume={hostVolume}
          hostMuted={hostMuted}
          speaking={speaking}
          onHostVolume={setHostVolume}
          onToggleHostMute={() => setHostMuted((value) => !value)}
          onStopSpeech={stopSpeaking}
        />
      </div>

      {session?.status === "playing" || session?.status === "results" ? (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <aside>
            <section className="rounded-2xl border border-neutral-850 bg-neutral-925 p-4">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">Scoreboard</p>
              <div className="mt-3 grid gap-2">
                {session.players.length ? (
                  session.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 rounded-md border border-neutral-850 bg-neutral-950 px-2 py-2"
                    >
                      <Avatar name={player.name} emoji={player.avatar} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-white">{player.name}</span>
                      <span className="font-mono text-xs tabular-nums text-neutral-400">{player.score}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">No players yet.</p>
                )}
              </div>
            </section>
          </aside>
          <section className="rounded-2xl border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
            <HostRound
              session={session}
              onReveal={() => void patchSession("reveal")}
              onNext={() => void startNextAutoRound()}
              onLobby={() => void patchSession("lobby")}
            />
          </section>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {SETUP_STEPS.map((step, index) => {
              const currentIndex = SETUP_STEPS.findIndex((s) => s.id === setupStep);
              const isCurrent = step.id === setupStep;
              const done = index < currentIndex;
              const reachable = index <= currentIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && setSetupStep(step.id)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                    isCurrent
                      ? "border-brand bg-brand/10 text-brand-300"
                      : done
                        ? "border-aqua/40 text-aqua-300 hover:border-aqua"
                        : "cursor-not-allowed border-neutral-850 text-neutral-600",
                  ].join(" ")}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-current font-mono text-[0.6rem]">
                    {done ? "✓" : index + 1}
                  </span>
                  <span className="font-condensed text-xs uppercase tracking-[0.08em]">{step.label}</span>
                </button>
              );
            })}
          </div>

          {setupStep === "games" && session ? (
            <section className="mt-5 rounded-2xl border border-neutral-850 bg-neutral-925 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Sticker tone="aqua" rotate={-4}>
                  Step 1
                </Sticker>
                <div className="min-w-0">
                  <p className="font-condensed text-xl uppercase leading-tight tracking-[0.02em] text-white">
                    Choose mini-games
                  </p>
                  <p className="text-xs text-neutral-500">Tap to include rounds — pick one for a single-game show.</p>
                </div>
                <span className="ml-auto rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-brand-300">
                  {session.miniGames.length} on
                </span>
              </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MINI_GAME_CATALOG.map((game) => {
                    const selected = session.miniGames.includes(game.id);
                    const isLast = selected && session.miniGames.length === 1;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        disabled={isLast}
                        onClick={() =>
                          void configureGames(
                            selected
                              ? session.miniGames.filter((id) => id !== game.id)
                              : [...session.miniGames, game.id],
                          )
                        }
                        aria-pressed={selected}
                        className={[
                          "rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
                          selected
                            ? "border-brand bg-brand/10"
                            : "border-neutral-850 bg-neutral-950 hover:border-neutral-700",
                        ].join(" ")}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={[
                              "font-condensed text-sm uppercase tracking-[0.03em]",
                              selected ? "text-brand-300" : "text-white",
                            ].join(" ")}
                          >
                            {game.name}
                          </span>
                          <span
                            aria-hidden
                            className={[
                              "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border text-[10px] leading-none",
                              selected ? "border-brand bg-brand text-white" : "border-neutral-700 text-transparent",
                            ].join(" ")}
                          >
                            ✓
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-neutral-500">{game.blurb}</span>
                      </button>
                    );
                  })}
                  {COMING_SOON_GAMES.map((game) => (
                    <div
                      key={game.id}
                      aria-disabled
                      className="rounded-lg border border-dashed border-neutral-850 bg-neutral-950/50 px-3 py-2.5 opacity-60"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-condensed text-sm uppercase tracking-[0.03em] text-neutral-400">
                          {game.name}
                        </span>
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.15em] text-neutral-500">
                          Soon
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-neutral-600">{game.blurb}</span>
                    </div>
                  ))}
                </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setSetupStep("artists")}>Next · Artists →</Button>
              </div>
            </section>
          ) : null}

          {setupStep === "artists" ? (
            <section className="mt-5 rounded-2xl border border-neutral-850 bg-neutral-925 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Sticker tone="magenta" rotate={-4}>
                  Step 2
                </Sticker>
                <div className="min-w-0">
                  <p className="font-condensed text-xl uppercase leading-tight tracking-[0.02em] text-white">
                    Build the setlist
                  </p>
                  <p className="text-xs text-neutral-500">
                    Tap an artist or search a song, then add tracks. BEATBOT draws from these each round.
                  </p>
                </div>
                <span className="ml-auto rounded-full border border-aqua/40 bg-aqua/10 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-aqua-300">
                  {deck.length}/8 tracks
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CURATED_ARTISTS.slice(0, 10).map((artist) => {
                  const active = query.trim().toLowerCase() === artist.name.toLowerCase();
                  return (
                    <button
                      key={artist.name}
                      type="button"
                      onClick={() => void searchFor(artist.name)}
                      disabled={loadingSearch}
                      className={[
                        "rounded-full border px-3 py-1.5 font-condensed text-sm uppercase tracking-[0.03em] transition-colors disabled:opacity-50",
                        active
                          ? "border-brand bg-brand/10 text-brand-300"
                          : "border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white",
                      ].join(" ")}
                    >
                      {artist.name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <SearchForm
                  query={query}
                  loading={loadingSearch}
                  labels={searchLabels}
                  onQueryChange={setQuery}
                  onSubmit={search}
                />
              </div>

              {error ? <p className="mt-3 text-sm text-brand-300">{error}</p> : null}

              {deck.length ? (
                <div className="mt-4 rounded-xl border border-neutral-850 bg-neutral-950 p-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-500">Your setlist</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {deck.map((track) => (
                      <button
                        key={track.trackId}
                        type="button"
                        onClick={() => toggleDeck(track)}
                        className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 py-1 pl-3 pr-2 text-sm text-white transition-colors hover:border-brand"
                      >
                        <span className="max-w-[10rem] truncate">{track.trackName}</span>
                        <span className="text-brand-300">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <TrackResults
                  results={results}
                  searched={searched}
                  loadingTrackId={loadingTrackId}
                  labels={resultLabels}
                  onPlay={toggleDeck}
                  variant="select"
                  selectedIds={deck.map((track) => track.trackId)}
                />
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-neutral-850" />
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-neutral-600">or</span>
                <span className="h-px flex-1 bg-neutral-850" />
              </div>
              <button
                type="button"
                onClick={() => void autoFillDeck()}
                disabled={loadingSearch}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-tangerine/40 bg-tangerine/10 font-condensed text-sm uppercase tracking-[0.06em] text-tangerine-300 transition-colors hover:bg-tangerine/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="shuffle" size={16} />
                {loadingSearch ? "Loading…" : "Surprise me — auto-fill the setlist"}
              </button>

              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="outlineLight" onClick={() => setSetupStep("games")}>
                  ← Back
                </Button>
                <Button onClick={() => setSetupStep("lobby")} disabled={deck.length === 0}>
                  Next · Lobby →
                </Button>
              </div>
            </section>
          ) : null}

          {setupStep === "lobby" ? (
            <div className="mt-5 space-y-5">
              <section className="grid grid-cols-1 gap-5 rounded-2xl border border-aqua/20 bg-neutral-925 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
                <JoinQr url={joinUrl} size={150} className="shrink-0 justify-self-center sm:justify-self-start" />
                <div className="min-w-0">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-aqua-300">
                    Scan to join — or enter the code
                  </p>
                  <p className="led mt-1 text-6xl font-bold leading-none tracking-[0.12em] sm:text-7xl">{code}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={copyJoin}
                      className="inline-flex h-10 items-center rounded-lg border border-white/15 px-4 font-mono text-xs uppercase tracking-[0.14em] text-neutral-300 transition-colors hover:border-aqua hover:text-aqua-300"
                    >
                      {copied ? "Link copied ✓" : "Copy join link"}
                    </button>
                    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-neutral-400">
                      <span className="h-2 w-2 rounded-full bg-aqua animate-pulse" aria-hidden />
                      {playerCount} {playerCount === 1 ? "player" : "players"} in
                    </span>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
                <section className="rounded-2xl border border-neutral-850 bg-neutral-925 p-5 sm:p-6">
                  <Sticker tone="aqua" rotate={-4}>
                    Step 3
                  </Sticker>
                  <p className="mt-3 font-condensed text-2xl uppercase leading-tight tracking-[0.02em] text-white">
                    Ready when you are
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {session?.miniGames.length ?? 0} mini-game{(session?.miniGames.length ?? 0) === 1 ? "" : "s"} · {deck.length}{" "}
                    track{deck.length === 1 ? "" : "s"} · {playerCount} player{playerCount === 1 ? "" : "s"} in
                  </p>
                  <div className="mt-5 space-y-2">
                    <Button
                      variant="magenta"
                      full
                      onClick={() => {
                        if (deck[0]) void start(deck[0], deck);
                      }}
                      disabled={deck.length === 0 || loadingTrackId !== null}
                    >
                      {loadingTrackId !== null ? "Starting…" : "Start show ▶"}
                    </Button>
                    <Button variant="outlineLight" full onClick={() => setSetupStep("artists")}>
                      ← Edit setlist
                    </Button>
                  </div>
                  {playerCount === 0 ? (
                    <p className="mt-3 text-center text-xs text-neutral-600">
                      You can start solo, but it&rsquo;s more fun once phones join.
                    </p>
                  ) : null}
                </section>

                <aside>
                  <section className="rounded-2xl border border-neutral-850 bg-neutral-925 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">In the room</p>
                      <span className="font-mono text-xs tabular-nums text-aqua-300">{playerCount}</span>
                    </div>
                    {playerCount ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {session?.players.map((player) => (
                          <span
                            key={player.id}
                            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 py-1 pl-1 pr-3"
                          >
                            <Avatar name={player.name} emoji={player.avatar} size="sm" />
                            <span className="max-w-[8rem] truncate text-sm text-white">{player.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-neutral-800 p-5 text-center">
                        <p className="text-sm text-neutral-300">Waiting for players…</p>
                        <p className="mt-1 text-xs text-neutral-600">
                          Scan the QR or enter <span className="font-mono text-neutral-400">{code}</span>
                        </p>
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            </div>
          ) : null}
        </div>
      )}
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
        <div className={active.miniGame === "mondegreen" ? "mt-6 grid gap-2" : "mt-6 grid gap-2 sm:grid-cols-2"}>
          {active.options.map((option, index) => (
            <div
              key={option}
              className={[
                "rounded-md border border-neutral-850 bg-neutral-950 px-4 py-3 text-neutral-300",
                active.miniGame === "mondegreen" ? "text-lg sm:text-2xl" : "text-sm",
              ].join(" ")}
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
