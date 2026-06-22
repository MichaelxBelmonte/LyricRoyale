export type SoundtrackId = "signal" | "clash" | "victory";

export interface Soundtrack {
  id: SoundtrackId;
  title: string;
  src: string;
  vibe: string;
}

export interface SignalLayer {
  id: "full" | "vocals" | "backing";
  label: string;
  src: string;
}

export const SIGNAL_LAYERS: SignalLayer[] = [
  { id: "full", label: "Mix", src: "/audio/soundclash-signal-full.mp3" },
  { id: "vocals", label: "Voice", src: "/audio/soundclash-signal-vocals.mp3" },
  { id: "backing", label: "Beat", src: "/audio/soundclash-signal-backing.mp3" },
];

export const SOUNDTRACKS: Soundtrack[] = [
  {
    id: "signal",
    title: "Soundclash Signal",
    src: "/audio/soundclash-signal-full.mp3",
    vibe: "Mix",
  },
  {
    id: "clash",
    title: "Clash Transmission",
    src: "/audio/soundclash-clash.mp3",
    vibe: "Round",
  },
  // The "sigla finale": the host screen swaps to this when the winners screen
  // mounts. Source is a bespoke generated victory outro (ElevenLabs Music, cached)
  // with a deterministic fallback to the bundled mixtape asset — see /api/music.
  {
    id: "victory",
    title: "Victory Mixtape",
    src: "/api/music?sigla=1",
    vibe: "Win",
  },
];

// One soundtrack everywhere: the "Soundclash Signal" theme (the one you start from
// the home "Play theme"). The room/round no longer swaps to a different track, so the
// music stays continuous across navigation. `pathname` is kept for signature stability.
export function soundtrackForPath(_pathname: string | null): SoundtrackId {
  return "signal";
}
