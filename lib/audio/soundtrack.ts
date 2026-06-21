export type SoundtrackId = "signal" | "clash";

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
];

// One soundtrack everywhere: the "Soundclash Signal" theme (the one you start from
// the home "Play theme"). The room/round no longer swaps to a different track, so the
// music stays continuous across navigation. `pathname` is kept for signature stability.
export function soundtrackForPath(_pathname: string | null): SoundtrackId {
  return "signal";
}
