"use client";

import { useRef, useState } from "react";
import Button from "@/components/brand/Button";
import type { PublicSessionState } from "@/lib/session/types";

// Host-side prep for Voice Clash: with explicit consent, record the host's voice,
// clone it (ElevenLabs IVC), then bake one or more tracks (the cloned voice rapping
// AI-written bars over a generated beat). The clone is deleted at teardown. Needs
// ELEVENLABS_API_KEY server-side. Recording uses the mic (getUserMedia → HTTPS/localhost).

// Mirrors lib/server/voice-studio.ts VOICE_VIBES (kept client-side; that module is server-only).
const VIBES = [
  { id: "boombap", label: "Boom-Bap" },
  { id: "trap", label: "Trap" },
  { id: "drill", label: "Drill" },
  { id: "funk", label: "Funk" },
  { id: "lofi", label: "Lo-Fi" },
  { id: "hyperpop", label: "Hyperpop" },
];

type Stage = "idle" | "recording" | "cloning" | "ready" | "baking" | "error";

export default function VoiceStudio({
  code,
  session,
  onSession,
}: {
  code: string;
  session: PublicSessionState;
  onSession: (next: PublicSessionState) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [vibe, setVibe] = useState(VIBES[0].id);
  const [theme, setTheme] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const cloned = Boolean(session.voiceClone);
  const trackCount = session.voiceTracks?.length ?? 0;
  const verifying = session.voiceClone?.requiresVerification ?? false;

  function stopTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startRecording() {
    if (!consent) return;
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void uploadClone(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setStage("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setStage("error");
      setMsg("Mic access denied — allow the microphone and retry.");
    }
  }

  function stopRecording() {
    stopTimer();
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function uploadClone(blob: Blob) {
    setStage("cloning");
    try {
      const form = new FormData();
      form.append("file", blob, "host-voice.webm");
      form.append("label", session.hostName ? `${session.hostName} voice` : "Host voice");
      const res = await fetch(`/api/sessions/${code}/voice`, { method: "POST", body: form });
      const payload = (await res.json()) as { session?: PublicSessionState; error?: string };
      if (!res.ok || !payload.session) throw new Error(payload.error ?? "clone failed");
      onSession(payload.session);
      setStage("ready");
    } catch (err) {
      setStage("error");
      setMsg(err instanceof Error ? err.message : "Clone failed — check ELEVENLABS_API_KEY.");
    }
  }

  async function bake() {
    setStage("baking");
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${code}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bake", vibe, theme: theme.trim() || "the party tonight" }),
      });
      const payload = (await res.json()) as { session?: PublicSessionState; error?: string };
      if (!res.ok || !payload.session) throw new Error(payload.error ?? "bake failed");
      onSession(payload.session);
      setStage("ready");
    } catch (err) {
      setStage("error");
      setMsg(err instanceof Error ? err.message : "Bake failed.");
    }
  }

  async function teardown() {
    try {
      const res = await fetch(`/api/sessions/${code}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "teardown" }),
      });
      const payload = (await res.json()) as { session?: PublicSessionState };
      if (payload.session) onSession(payload.session);
      setStage("idle");
      setConsent(false);
    } catch {
      // Polling will resync.
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">Voice Studio · Voice Clash</p>
        <p className="font-mono text-xs text-black/55">
          {cloned ? `${trackCount} track${trackCount === 1 ? "" : "s"} baked` : "not cloned"}
          {trackCount < 1 ? " · need 1" : ""}
        </p>
      </div>

      {!cloned ? (
        <>
          <label className="mt-3 flex items-start gap-2.5 text-xs leading-5 text-black/70">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span>
              I consent to cloning <strong>my own</strong> voice for this match. It’s used only to make in-party tracks
              and is <strong>deleted at the end</strong>. Don’t upload anyone else’s voice.
            </span>
          </label>

          <div className="mt-3">
            {stage === "recording" ? (
              <Button type="button" variant="magenta" full onClick={stopRecording}>
                ⏺ Stop &amp; clone ({seconds}s)
              </Button>
            ) : stage === "cloning" ? (
              <Button type="button" variant="magenta" full disabled>
                Cloning your voice…
              </Button>
            ) : (
              <Button type="button" variant="magenta" full disabled={!consent} onClick={startRecording}>
                ⏺ Record ~15s of your voice
              </Button>
            )}
            <p className="mt-2 text-xs text-black/45">
              Speak naturally for 15–20s (count, read a sentence) — clean audio clones best.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {VIBES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVibe(v.id)}
                aria-pressed={vibe === v.id}
                className={[
                  "rounded-full border px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.04em] transition-colors",
                  vibe === v.id ? "border-brand bg-brand/10 text-brand" : "border-black/15 text-black/70 hover:border-brand",
                ].join(" ")}
              >
                {v.label}
              </button>
            ))}
          </div>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Theme (e.g. Friday night, the loud table, pizza)"
            maxLength={120}
            className="mt-3 h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-ink outline-none focus:border-brand"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" variant="magenta" full disabled={stage === "baking"} onClick={bake}>
              {stage === "baking" ? "Cooking the track…" : trackCount ? "Bake another track" : "Bake the first track"}
            </Button>
          </div>

          {trackCount ? (
            <ul className="mt-3 grid gap-2">
              {session.voiceTracks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-condensed text-sm uppercase tracking-[0.03em] text-ink">{t.vibe}</span>
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-aqua-600">ready</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-black/55">{t.lyric}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={teardown}
            className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-brand"
          >
            Delete my voice clone &amp; reset
          </button>
        </>
      )}

      {verifying ? (
        <p className="mt-2 text-xs text-black/45">
          ElevenLabs is verifying the clone — it’s already usable for baking.
        </p>
      ) : null}
      {msg ? <p className="mt-2 text-xs text-[#A2452E]">{msg}</p> : null}
    </div>
  );
}
