import "server-only";

import type { TrackingLinks, TrackSummary } from "@/lib/types";

const BASE = "https://api.musixmatch.com/ws/1.1";

interface MusixmatchEnvelope<TBody> {
  message?: {
    header?: {
      status_code?: number;
    };
    body?: TBody;
  };
}

interface RawTrack {
  track_id?: number | string;
  track_name?: string;
  artist_name?: string;
  has_lyrics?: number;
  has_richsync?: number;
}

interface SearchBody {
  track_list?: Array<{
    track?: RawTrack;
  }>;
}

interface RawLyrics {
  lyrics_body?: string;
  lyrics_copyright?: string;
  pixel_tracking_url?: string;
  script_tracking_url?: string;
}

interface LyricsBody {
  lyrics?: RawLyrics;
}

export interface LyricsPayload {
  body: string;
  copyright: string;
  tracking: TrackingLinks;
}

class MusixmatchProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MusixmatchProviderError";
  }
}

function apiKey(): string {
  const key = process.env.MXM_KEY;
  if (!key) throw new MusixmatchProviderError("MXM_KEY is not set in the environment");
  return key;
}

async function callMusixmatch<TBody>(
  method: string,
  params: Record<string, string | number>,
): Promise<TBody> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }
  searchParams.set("apikey", apiKey());

  const response = await fetch(`${BASE}/${method}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new MusixmatchProviderError(`Musixmatch HTTP ${response.status}`);
  }

  const json = (await response.json()) as MusixmatchEnvelope<TBody>;
  const statusCode = json.message?.header?.status_code;
  if (statusCode !== 200 || !json.message?.body) {
    throw new MusixmatchProviderError(
      `Musixmatch status_code ${statusCode ?? "unknown"} for ${method}`,
    );
  }

  return json.message.body;
}

function toTrackSummary(rawTrack: RawTrack | undefined): TrackSummary | null {
  if (!rawTrack) return null;

  const trackId =
    typeof rawTrack.track_id === "number" ? rawTrack.track_id : Number(rawTrack.track_id);
  const trackName = rawTrack.track_name?.trim();
  const artistName = rawTrack.artist_name?.trim();

  if (!Number.isFinite(trackId) || !trackName || !artistName) {
    return null;
  }

  return {
    trackId,
    trackName,
    artistName,
    hasLyrics: rawTrack.has_lyrics === 1,
    hasRichsync: rawTrack.has_richsync === 1,
  };
}

export async function searchTracks(query: string, limit = 8): Promise<TrackSummary[]> {
  // q_track_artist matches title+artist (not lyrics) and rating sort surfaces the
  // well-known version first — far better relevance for a song picker than a bare `q`.
  const body = await callMusixmatch<SearchBody>("track.search", {
    q_track_artist: query,
    page_size: limit,
    s_track_rating: "desc",
    f_has_lyrics: 1,
  });

  return (body.track_list ?? [])
    .map((item) => toTrackSummary(item.track))
    .filter((track): track is TrackSummary => track !== null);
}

export async function getTrackLyrics(trackId: number): Promise<LyricsPayload> {
  const body = await callMusixmatch<LyricsBody>("track.lyrics.get", { track_id: trackId });
  const lyrics = body.lyrics;
  const lyricsBody = lyrics?.lyrics_body?.trim();

  if (!lyrics || !lyricsBody) {
    throw new MusixmatchProviderError(`No lyrics body for track ${trackId}`);
  }

  return {
    body: lyricsBody,
    copyright: lyrics.lyrics_copyright?.trim() ?? "Lyrics provided by Musixmatch",
    tracking: {
      pixel: lyrics.pixel_tracking_url ?? null,
      script: lyrics.script_tracking_url ?? null,
    },
  };
}
