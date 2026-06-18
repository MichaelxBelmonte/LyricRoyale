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

export function soundtrackForPath(pathname: string | null): SoundtrackId {
  const path = pathname ?? "/";
  if (path.startsWith("/host/") && path !== "/host/new") return "clash";
  if (path.startsWith("/player/") || path.startsWith("/solo")) return "clash";
  return "signal";
}
