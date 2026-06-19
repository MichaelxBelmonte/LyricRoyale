import type { FinishLineDrop, Locale, TrackingLinks } from "@/lib/types";

export type SessionStatus = "lobby" | "playing" | "results";
export type MiniGameId =
  | "finish_line"
  | "the_drop"
  | "next_line"
  | "artist_pick"
  | "word_rush"
  | "name_song"
  | "mondegreen"
  | "song_mash"
  | "on_beat";
export type HostVoicePreset = "hype" | "judge" | "diva" | "custom";
export type RoundAnswerType = "text" | "choice";

export interface SessionTrackRef {
  trackId: number;
  trackName: string;
  artistName: string;
  hasRichsync?: boolean;
}

export interface HostVoiceConfig {
  preset: HostVoicePreset;
  label: string;
  voiceId?: string;
}

export interface SessionPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
}

export interface SessionAnswer {
  playerId: string;
  playerName: string;
  guess: string;
  correct: boolean;
  points: number;
  elapsedMs: number;
  submittedAt: number;
}

export interface SessionRound {
  index: number;
  miniGame: MiniGameId;
  title: string;
  instruction: string;
  trackId: number;
  trackName: string;
  artistName: string;
  hasRichsync?: boolean;
  seed: number;
  prompt: string;
  answerType: RoundAnswerType;
  options?: string[];
  drop?: FinishLineDrop;
  solution?: string;
  copyright?: string;
  tracking?: TrackingLinks;
  startedAt: number;
  endsAt: number;
  status: "answering" | "revealed";
  answers: SessionAnswer[];
}

export interface PartySession {
  code: string;
  status: SessionStatus;
  locale: Locale;
  hostName: string;
  voice: HostVoiceConfig;
  miniGames: MiniGameId[];
  autopilot: boolean;
  trackPool: SessionTrackRef[];
  players: SessionPlayer[];
  currentRound: SessionRound | null;
  createdAt: number;
  updatedAt: number;
}

export interface PublicSessionState extends PartySession {
  playerCount: number;
}

export interface CreateSessionInput {
  locale?: Locale;
  hostName?: string;
  voice?: Partial<HostVoiceConfig>;
  autopilot?: boolean;
  miniGames?: MiniGameId[];
}

export interface JoinSessionInput {
  name?: string;
  avatar?: string;
}

export interface StartRoundInput {
  miniGame?: MiniGameId;
  auto?: boolean;
  trackId?: number;
  trackName?: string;
  artistName?: string;
  hasRichsync?: boolean;
  deck?: SessionTrackRef[];
}

export interface SubmitAnswerInput {
  playerId?: string;
  guess?: string;
}
