"use client";

import { useMemo, useState, type FormEvent } from "react";
import BottomNav, { type BottomNavItem } from "@/components/app/BottomNav";
import TopBar from "@/components/app/TopBar";
import MatchResult from "@/components/battle/MatchResult";
import Soundcheck from "@/components/onboarding/Soundcheck";
import FinishLineGame from "@/components/rounds/FinishLineGame";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import TeamSummary from "@/components/team/TeamSummary";
import { ROUNDS_PER_SET } from "@/lib/game/scoring";
import { copy, defaultLocale } from "@/lib/i18n";
import type {
  ErrorResponse,
  FinishLineResponse,
  FinishLineRound,
  Locale,
  SearchResponse,
  SingerTeam,
  TrackSummary,
} from "@/lib/types";

const MATCH_ROUNDS = ROUNDS_PER_SET;

type Screen = "onboarding" | "lobby" | "game" | "result";
type LobbyTab = "songs" | "team";

export default function SearchExperience() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [team, setTeam] = useState<SingerTeam | null>(null);
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>("songs");
  const [activeArtist, setActiveArtist] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null);
  const [round, setRound] = useState<FinishLineRound | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const text = copy[locale];
  const languageLabels = useMemo(
    () => ({
      toggle: text.languageToggle,
      english: copy.en.languageName,
      italian: copy.it.languageName,
    }),
    [text.languageToggle],
  );

  function resetMatch() {
    setRound(null);
    setRoundError(null);
    setRoundNumber(1);
    setTotalScore(0);
    setCompletedRounds(0);
    setCurrentStreak(0);
    setBestStreak(0);
  }

  async function searchFor(rawQuery: string) {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery || loading) return;

    setQuery(trimmedQuery);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mxm/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = (await response.json()) as Partial<SearchResponse & ErrorResponse>;
      if (!response.ok) throw new Error(payload.error ?? text.errorFallback);
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchFor(query);
  }

  function startSession(nextTeam: SingerTeam) {
    const firstArtist = nextTeam.artists[0];
    setTeam(nextTeam);
    setActiveArtist(firstArtist);
    setScreen("lobby");
    setLobbyTab("songs");
    resetMatch();
    void searchFor(firstArtist);
  }

  function pickArtist(artist: string) {
    setActiveArtist(artist);
    setLobbyTab("songs");
    void searchFor(artist);
  }

  async function loadRound(track: TrackSummary, seed: number) {
    setSelectedTrack(track);
    setRound(null);
    setRoundError(null);
    setLoadingTrackId(track.trackId);
    setScreen("game");

    try {
      const response = await fetch("/api/rounds/finish-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.trackId, seed }),
      });
      const payload = (await response.json()) as Partial<FinishLineResponse & ErrorResponse>;
      if (!response.ok || !payload.round) throw new Error(payload.error ?? text.roundError);
      setRound(payload.round);
    } catch (err) {
      setRoundError(err instanceof Error ? err.message : text.roundError);
    } finally {
      setLoadingTrackId(null);
    }
  }

  function startRound(track: TrackSummary) {
    resetMatch();
    void loadRound(track, 0);
  }

  function nextRound() {
    if (!selectedTrack) return;
    if (roundNumber >= MATCH_ROUNDS) {
      setRound(null);
      setScreen("result");
      return;
    }
    const nextRoundNumber = roundNumber + 1;
    setRoundNumber(nextRoundNumber);
    void loadRound(selectedTrack, nextRoundNumber - 1);
  }

  function handleScored(points: number) {
    setTotalScore((current) => current + points);
    setCompletedRounds((current) => Math.min(MATCH_ROUNDS, current + 1));
    setCurrentStreak((current) => {
      const nextStreak = points > 0 ? current + 1 : 0;
      setBestStreak((best) => Math.max(best, nextStreak));
      return nextStreak;
    });
  }

  function backToLobby() {
    resetMatch();
    setSelectedTrack(null);
    setScreen("lobby");
  }

  function editTeam() {
    setScreen("onboarding");
  }

  const navItems: BottomNavItem[] = [
    { key: "songs", label: text.navSongs, icon: "music" },
    { key: "team", label: text.navTeam, icon: "users" },
    { key: "exit", label: text.navExit, icon: "logout" },
  ];

  function onNavSelect(key: string) {
    if (key === "exit") {
      editTeam();
      return;
    }
    setLobbyTab(key as LobbyTab);
  }

  const showBack = screen === "game" || screen === "result";

  return (
    <div className="min-h-screen">
      <TopBar
        locale={locale}
        languageLabels={languageLabels}
        onLocaleChange={setLocale}
        team={team}
        onBack={showBack ? backToLobby : undefined}
        backLabel={text.backLabel}
      />

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6">
        {screen === "onboarding" ? (
          <div className="mx-auto w-full max-w-2xl">
            <Soundcheck initialTeam={team} labels={text} onStart={startSession} />
          </div>
        ) : null}

        {screen === "lobby" && team ? (
          <div className="grid gap-4 pb-24 lg:grid-cols-[20rem_1fr] lg:pb-0">
            <div className={lobbyTab === "team" ? "block" : "hidden lg:block"}>
              <TeamSummary
                team={team}
                activeArtist={activeArtist}
                labels={text}
                onArtistSelect={pickArtist}
                onEdit={editTeam}
              />
            </div>

            <div className={lobbyTab === "songs" ? "block" : "hidden lg:block"}>
              <section className="space-y-4 rounded-2xl border border-neutral-850 bg-neutral-900/60 p-4 sm:p-5">
                <div>
                  <p className="font-display text-sm uppercase tracking-[0.2em] text-white">
                    {text.songLobbyTitle}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {activeArtist ? `${text.activeArtistLabel}: ${activeArtist}` : text.songLobbyHint}
                  </p>
                </div>

                <SearchForm
                  query={query}
                  loading={loading}
                  labels={text}
                  onQueryChange={setQuery}
                  onSubmit={handleSearch}
                />

                {error ? <p className="text-sm text-brand-300">{error}</p> : null}

                <TrackResults
                  results={results}
                  searched={searched}
                  loadingTrackId={loadingTrackId}
                  labels={text}
                  onPlay={startRound}
                />

                <p className="border-t border-neutral-850 pt-4 text-xs leading-5 text-neutral-500">
                  {text.complianceNote}
                </p>
              </section>
            </div>
          </div>
        ) : null}

        {screen === "game" && selectedTrack ? (
          <div className="mx-auto w-full max-w-3xl">
            {round ? (
              <FinishLineGame
                round={round}
                track={selectedTrack}
                labels={text}
                roundNumber={roundNumber}
                maxRounds={MATCH_ROUNDS}
                totalScore={totalScore}
                streak={currentStreak}
                onReset={backToLobby}
                onNextRound={nextRound}
                onScored={handleScored}
              />
            ) : roundError ? (
              <div className="rounded-2xl border border-brand/30 bg-brand/10 p-6 text-center">
                <p className="text-sm text-brand-300">{roundError}</p>
                <button
                  type="button"
                  onClick={backToLobby}
                  className="mt-4 rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-200 transition hover:text-white"
                >
                  {text.backLabel}
                </button>
              </div>
            ) : (
              <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
                {text.loadingRound}…
              </div>
            )}
          </div>
        ) : null}

        {screen === "result" && selectedTrack && team ? (
          <div className="mx-auto w-full max-w-3xl">
            <MatchResult
              team={team}
              track={selectedTrack}
              score={totalScore}
              roundsPlayed={completedRounds}
              maxRounds={MATCH_ROUNDS}
              bestStreak={bestStreak}
              labels={text}
              onRematch={() => startRound(selectedTrack)}
              onNewSong={backToLobby}
            />
          </div>
        ) : null}
      </main>

      {screen === "lobby" ? (
        <BottomNav items={navItems} active={lobbyTab} onSelect={onNavSelect} />
      ) : null}
    </div>
  );
}
