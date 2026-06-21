"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import BottomNav, { type BottomNavItem } from "@/components/app/BottomNav";
import TopBar from "@/components/app/TopBar";
import DuelResult from "@/components/battle/DuelResult";
import MatchResult from "@/components/battle/MatchResult";
import JCard from "@/components/brand/JCard";
import Soundcheck from "@/components/onboarding/Soundcheck";
import FinishLineGame from "@/components/rounds/FinishLineGame";
import SearchForm from "@/components/search/SearchForm";
import TrackResults from "@/components/search/TrackResults";
import TeamSummary from "@/components/team/TeamSummary";
import {
  decodeChallenge,
  encodeChallenge,
  headToHead,
  type Challenge,
  type ChallengeRoundResult,
} from "@/lib/game/challenge";
import { randomStageName } from "@/lib/game/identity";
import { ROUNDS_PER_SET } from "@/lib/game/scoring";
import { copy, defaultLocale } from "@/lib/i18n";
import type {
  ErrorResponse,
  FinishLineResponse,
  FinishLineRound,
  Locale,
  SearchResponse,
  SingerTeam,
  TrackResponse,
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
  const [roundResults, setRoundResults] = useState<ChallengeRoundResult[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [booting, setBooting] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    setRoundResults([]);
    setCopied(false);
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

  function handleScored(outcome: { points: number; correct: boolean; elapsedMs: number }) {
    setRoundResults((current) => [
      ...current,
      { hit: outcome.correct, elapsedMs: outcome.elapsedMs, points: outcome.points },
    ]);
    setTotalScore((current) => current + outcome.points);
    setCompletedRounds((current) => Math.min(MATCH_ROUNDS, current + 1));
    setCurrentStreak((current) => {
      const nextStreak = outcome.correct ? current + 1 : 0;
      setBestStreak((best) => Math.max(best, nextStreak));
      return nextStreak;
    });
  }

  function backToLobby() {
    resetMatch();
    setSelectedTrack(null);
    setChallenge(null);
    setScreen(team ? "lobby" : "onboarding");
  }

  function editTeam() {
    setScreen("onboarding");
  }

  // Boot a challenge link (?c=...): rebuild the track from its id, auto-assign an
  // identity, and drop straight into the duel against the encoded ghost.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = new URLSearchParams(window.location.search).get("c");
    if (!token) return;
    const decoded = decodeChallenge(token);
    if (!decoded) {
      setBootError(copy[defaultLocale].challengeError);
      return;
    }
    setChallenge(decoded);
    setBooting(true);
    (async () => {
      try {
        const response = await fetch(`/api/mxm/track?trackId=${decoded.trackId}`);
        const payload = (await response.json()) as Partial<TrackResponse & ErrorResponse>;
        if (!response.ok || !payload.track) throw new Error();
        const track = payload.track;
        setTeam({ playerName: randomStageName(), teamName: "Challenger", artists: [track.artistName] });
        setActiveArtist(track.artistName);
        startRound(track);
      } catch {
        setChallenge(null);
        setBootError(copy[defaultLocale].challengeError);
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !selectedTrack || roundResults.length === 0) return "";
    const token = encodeChallenge({
      v: 1,
      trackId: selectedTrack.trackId,
      name: team?.playerName ?? "Player",
      rounds: roundResults,
      total: totalScore,
    });
    return `${window.location.origin}${window.location.pathname}?c=${token}`;
  }, [selectedTrack, roundResults, team, totalScore]);

  function copyShareLink() {
    if (!shareUrl || typeof navigator === "undefined") return;
    void navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true)).catch(() => {});
  }

  const navItems: BottomNavItem[] = [
    { key: "songs", label: text.navSongs, icon: "music" },
    { key: "team", label: text.navTeam, icon: "users" },
    { key: "exit", label: text.navExit, icon: "logout" },
  ];

  function onNavSelect(key: string) {
    if (key === "exit") {
      // Leave the solo session and return to the landing.
      window.location.href = "/";
      return;
    }
    setLobbyTab(key as LobbyTab);
  }

  const showBack = screen === "game" || screen === "result";
  const ghost = challenge ? (challenge.rounds[roundNumber - 1] ?? null) : null;

  return (
    <div className="min-h-[100dvh]">
      <TopBar
        locale={locale}
        languageLabels={languageLabels}
        onLocaleChange={setLocale}
        team={team}
        onBack={showBack ? backToLobby : undefined}
        backLabel={text.backLabel}
      />

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6">
        {booting ? (
          <div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-black/45">
            {text.challengeLoading}…
          </div>
        ) : null}

        {!booting && screen === "onboarding" ? (
          <div className="mx-auto w-full max-w-2xl">
            {bootError ? (
              <p className="mb-4 rounded-md border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
                {bootError}
              </p>
            ) : null}
            <Soundcheck initialTeam={team} labels={text} onStart={startSession} />
          </div>
        ) : null}

        {!booting && screen === "lobby" && team ? (
          <div className="grid grid-cols-1 gap-4 pb-24 lg:grid-cols-[20rem_1fr] lg:pb-0">
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
              <JCard contentClassName="space-y-4 p-4 sm:p-5">
                <div>
                  <p className="font-condensed text-sm uppercase tracking-[0.2em] text-[#15120E]">
                    {text.songLobbyTitle}
                  </p>
                  <p className="mt-1 text-sm text-black/50">
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

                {error ? <p className="text-sm font-semibold text-[#A2452E]">{error}</p> : null}

                <TrackResults
                  results={results}
                  searched={searched}
                  loadingTrackId={loadingTrackId}
                  labels={text}
                  onPlay={startRound}
                />

                <p className="border-t border-black/10 pt-4 text-xs leading-5 text-black/45">
                  {text.complianceNote}
                </p>
              </JCard>
            </div>
          </div>
        ) : null}

        {!booting && screen === "game" && selectedTrack ? (
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
                ghost={ghost}
                onReset={backToLobby}
                onNextRound={nextRound}
                onScored={handleScored}
              />
            ) : roundError ? (
              <div className="rounded-lg border border-brand/30 bg-brand/10 p-6 text-center">
                <p className="text-sm text-brand">{roundError}</p>
                <button
                  type="button"
                  onClick={backToLobby}
                  className="mt-4 rounded-md border border-black/15 px-4 py-2 text-sm text-black/70 transition-colors hover:text-ink"
                >
                  {text.backLabel}
                </button>
              </div>
            ) : (
              <div className="flex min-h-[40vh] items-center justify-center font-mono text-sm text-black/45">
                {text.loadingRound}…
              </div>
            )}
          </div>
        ) : null}

        {!booting && screen === "result" && selectedTrack && team ? (
          <div className="mx-auto w-full max-w-3xl">
            {challenge ? (
              <DuelResult
                youName={team.playerName}
                rivalName={challenge.name}
                head={headToHead(roundResults, challenge.rounds)}
                labels={text}
                onRematch={() => startRound(selectedTrack)}
                onBack={backToLobby}
              />
            ) : (
              <MatchResult
                team={team}
                track={selectedTrack}
                score={totalScore}
                roundsPlayed={completedRounds}
                maxRounds={MATCH_ROUNDS}
                bestStreak={bestStreak}
                shareUrl={shareUrl}
                copied={copied}
                onCopyLink={copyShareLink}
                labels={text}
                onRematch={() => startRound(selectedTrack)}
                onNewSong={backToLobby}
              />
            )}
          </div>
        ) : null}
      </main>

      {!booting && screen === "lobby" ? (
        <BottomNav items={navItems} active={lobbyTab} onSelect={onNavSelect} />
      ) : null}
    </div>
  );
}
