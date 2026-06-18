"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { SOUNDTRACKS, soundtrackForPath, type SoundtrackId } from "@/lib/audio/soundtrack";

const STORE_KEY = "soundclash-audio";
const BASE_VOLUME = 0.42;
const DUCK_VOLUME = 0.14;
const BARS = 32;

type StoredAudio = { stopped?: boolean };
type AudioControl = "play" | "pause" | "toggle" | "next" | "seek" | "track";

function loadStoredAudio(): StoredAudio {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as StoredAudio;
  } catch {
    return {};
  }
}

function saveStopped(stopped: boolean) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify({ stopped }));
}

export default function AudioDirector() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const playAudioRef = useRef<((userIntent?: boolean) => Promise<void>) | null>(null);
  const stoppedRef = useRef(false);
  const enabledRef = useRef(false);
  const [enabled, setEnabledState] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ducked, setDucked] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const preferredIndex = useMemo(() => {
    const preferred = soundtrackForPath(pathname);
    return Math.max(0, SOUNDTRACKS.findIndex((track) => track.id === preferred));
  }, [pathname]);
  const track = SOUNDTRACKS[trackIndex] ?? SOUNDTRACKS[0];

  const setEnabled = useCallback((value: boolean) => {
    enabledRef.current = value;
    setEnabledState(value);
  }, []);

  const dispatchState = useCallback(() => {
    const audio = audioRef.current;
    window.dispatchEvent(
      new CustomEvent("soundclash:audio-state", {
        detail: {
          enabled: enabledRef.current,
          blocked,
          track,
          trackIndex,
          currentTime: audio?.currentTime ?? 0,
          duration: Number.isFinite(audio?.duration) ? audio?.duration : 0,
        },
      }),
    );
  }, [blocked, track, trackIndex]);

  const stopVisualizer = useCallback(() => {
    if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const startVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || rafRef.current != null) return;
    const buffer = frameRef.current ?? new Uint8Array(analyser.frequencyBinCount);
    frameRef.current = buffer;

    const tick = () => {
      analyser.getByteFrequencyData(buffer);
      const step = Math.max(1, Math.floor(buffer.length / BARS));
      const levels = Array.from({ length: BARS }, (_, index) => {
        let sum = 0;
        for (let offset = 0; offset < step; offset++) sum += buffer[index * step + offset] ?? 0;
        return Math.max(0.04, Math.min(1, sum / step / 255));
      });
      window.dispatchEvent(new CustomEvent("soundclash:audio-frame", { detail: { levels } }));
      dispatchState();
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [dispatchState]);

  const ensureAnalyser = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioContextRef.current) {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === "suspended") await audioContextRef.current.resume();
  }, []);

  const playAudio = useCallback(
    async (userIntent = false) => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        await ensureAnalyser();
        audio.volume = ducked ? DUCK_VOLUME : BASE_VOLUME;
        await audio.play();
        stoppedRef.current = false;
        if (userIntent) saveStopped(false);
        setEnabled(true);
        setBlocked(false);
        startVisualizer();
      } catch {
        setEnabled(false);
        setBlocked(true);
      } finally {
        dispatchState();
      }
    },
    [dispatchState, ducked, ensureAnalyser, setEnabled, startVisualizer],
  );

  const pauseAudio = useCallback(
    (userIntent = false) => {
      audioRef.current?.pause();
      if (userIntent) {
        stoppedRef.current = true;
        saveStopped(true);
      }
      setEnabled(false);
      stopVisualizer();
      dispatchState();
    },
    [dispatchState, setEnabled, stopVisualizer],
  );

  useEffect(() => {
    playAudioRef.current = playAudio;
  }, [playAudio]);

  const nextTrack = useCallback(() => {
    setTrackIndex((index) => (index + 1) % SOUNDTRACKS.length);
  }, []);

  useEffect(() => {
    const stored = loadStoredAudio();
    stoppedRef.current = Boolean(stored.stopped);
    setTrackIndex(preferredIndex);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    setTrackIndex(preferredIndex);
  }, [preferredIndex, ready]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    audio.src = track.src;
    audio.load();
    audio.volume = ducked ? DUCK_VOLUME : BASE_VOLUME;
    if (enabledRef.current || !stoppedRef.current) void playAudioRef.current?.(false);
    // Track loading must not depend on ducking; volume changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, track.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    audio.volume = ducked ? DUCK_VOLUME : BASE_VOLUME;
  }, [ducked, ready]);

  useEffect(() => {
    if (!ready || enabled || stoppedRef.current) return;
    const retry = () => void playAudio(false);
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [enabled, playAudio, ready]);

  useEffect(() => {
    const onDuck = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setDucked(Boolean(detail?.active));
    };
    const onControl = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: AudioControl; ratio?: number; trackId?: SoundtrackId; play?: boolean }>).detail;
      const action = detail?.action;
      if (action === "play") void playAudio(true);
      if (action === "pause") pauseAudio(true);
      if (action === "toggle") void (enabledRef.current ? pauseAudio(true) : playAudio(true));
      if (action === "next") nextTrack();
      if (action === "track") {
        const trackId = detail.trackId;
        const index = SOUNDTRACKS.findIndex((item) => item.id === trackId);
        if (index >= 0) {
          if (detail.play !== false) {
            stoppedRef.current = false;
            saveStopped(false);
          }
          if (index === trackIndex) {
            if (detail.play !== false) void playAudio(true);
          } else {
            setTrackIndex(index);
          }
        }
      }
      if (action === "seek" && typeof detail.ratio === "number") {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Math.max(0, Math.min(1, detail.ratio));
      }
    };
    window.addEventListener("soundclash:duck", onDuck);
    window.addEventListener("soundclash:audio-control", onControl);
    return () => {
      window.removeEventListener("soundclash:duck", onDuck);
      window.removeEventListener("soundclash:audio-control", onControl);
    };
  }, [nextTrack, pauseAudio, playAudio, trackIndex]);

  useEffect(() => {
    dispatchState();
  }, [dispatchState, enabled, ready]);

  useEffect(() => {
    return () => {
      stopVisualizer();
      void audioContextRef.current?.close();
    };
  }, [stopVisualizer]);

  if (!ready) return null;

  return (
    <>
      <audio ref={audioRef} preload="auto" loop />
      {pathname === "/" ? null : (
        <button
          type="button"
          onClick={() => void (enabled ? pauseAudio(true) : playAudio(true))}
          aria-label={enabled ? "Pause soundtrack" : "Play soundtrack"}
          title={enabled ? "Pause soundtrack" : "Play soundtrack"}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-3 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white shadow-[0_12px_28px_-14px_rgba(0,0,0,0.9)] backdrop-blur transition-transform hover:-translate-y-0.5 hover:border-[#00e5d2]/70 active:translate-y-0 sm:right-5"
        >
          <span className="sr-only">{track.title}</span>
          <Icon name={enabled ? "pause" : "play"} size={18} />
        </button>
      )}
    </>
  );
}
