"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

type SpeechPreset = "hype" | "judge" | "diva";
type Stem = "vocals" | "drum" | "bass" | "piano" | "electric_guitar" | "acoustic_guitar";

interface LalalUploadResponse {
  upload: {
    id: string;
    name: string;
    duration: number;
  };
  task: {
    task_id: string;
    source_id: string;
  };
  stem: Stem;
}

interface LalalTrack {
  label: string;
  type: string;
  url: string;
}

interface LalalStatusResponse {
  taskId: string;
  result: {
    status: "progress" | "success" | "error" | "cancelled" | "server_error";
    progress?: number;
    result?: {
      duration?: number;
      tracks?: LalalTrack[];
    };
  } | null;
}

export default function ProviderLab() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/solo" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white">
        <Icon name="chevronLeft" size={16} />
        Back to solo lab
      </Link>

      <header className="mt-6 border-b border-neutral-850 pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-brand">Provider lab</p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl">
          Voice and stems
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
          Test ElevenLabs host audio and a LALAL.AI stem mini-game without exposing provider keys
          to the browser.
        </p>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ElevenLabsPanel />
        <LalalStemPanel />
      </div>
    </main>
  );
}

function ElevenLabsPanel() {
  const [preset, setPreset] = useState<SpeechPreset>("hype");
  const [languageCode, setLanguageCode] = useState<"en" | "it">("en");
  const [text, setText] = useState("Welcome to Soundclash. Phones ready, voices locked, first round starts now.");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function speak(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/host/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, preset, languageCode }),
      });
      if (!response.ok) throw new Error("Speech generation failed");
      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate speech.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">ElevenLabs host</p>
      <h2 className="mt-2 text-2xl font-bold text-white">Voice check</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Generates a real MP3 through the server proxy. Use this for room intros, reveals and winner
        calls.
      </p>

      <form onSubmit={speak} className="mt-5 space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-white outline-none transition-colors placeholder:text-neutral-600 focus:border-brand"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as SpeechPreset)}
            className="h-11 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-base text-white outline-none focus:border-brand"
          >
            <option value="hype">Hype Host</option>
            <option value="judge">Deadpan Judge</option>
            <option value="diva">Diva Host</option>
          </select>
          <select
            value={languageCode}
            onChange={(event) => setLanguageCode(event.target.value as "en" | "it")}
            className="h-11 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-base text-white outline-none focus:border-brand"
          >
            <option value="en">English</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <button
          disabled={loading || !text.trim()}
          className="h-11 w-full rounded-md bg-brand text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
        >
          {loading ? "Generating" : "Generate voice"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-brand-300">{error}</p> : null}
      {audioUrl ? <audio className="mt-4 w-full" controls src={audioUrl} /> : null}
    </section>
  );
}

function LalalStemPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [stem, setStem] = useState<Stem>("vocals");
  const [job, setJob] = useState<LalalUploadResponse | null>(null);
  const [status, setStatus] = useState<LalalStatusResponse["result"]>(null);
  const [secretIndex, setSecretIndex] = useState<number | null>(null);
  const [guess, setGuess] = useState<"stem" | "back" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracks = useMemo(() => status?.result?.tracks ?? [], [status]);
  const secretTrack = secretIndex == null ? null : tracks[secretIndex] ?? null;

  useEffect(() => {
    if (!job?.task.task_id || status?.status === "success" || status?.status === "error") return;
    const timer = window.setInterval(() => {
      void check(job.task.task_id);
    }, 3500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.task.task_id, status?.status]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setJob(null);
    setStatus(null);
    setSecretIndex(null);
    setGuess(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("stem", stem);
      const response = await fetch("/api/lalal/stems", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as Partial<LalalUploadResponse & { error: string }>;
      if (!response.ok || !payload.task || !payload.upload) throw new Error(payload.error ?? "Split failed");
      const nextJob = payload as LalalUploadResponse;
      setJob(nextJob);
      await check(nextJob.task.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start stem separation.");
    } finally {
      setLoading(false);
    }
  }

  async function check(taskId: string) {
    const response = await fetch(`/api/lalal/stems/${encodeURIComponent(taskId)}`, { cache: "no-store" });
    const payload = (await response.json()) as LalalStatusResponse & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Status check failed");
    setStatus(payload.result);
  }

  function blindRound() {
    if (tracks.length === 0) return;
    setSecretIndex(Math.floor(Math.random() * tracks.length));
    setGuess(null);
  }

  const correctGuess =
    guess && secretTrack ? (secretTrack.type === "stem" ? guess === "stem" : guess === "back") : null;

  return (
    <section className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 sm:p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">LALAL.AI stems</p>
      <h2 className="mt-2 text-2xl font-bold text-white">Stem Guess Lab</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Upload a short audio clip, split a stem, then play a blind round: is the secret audio the
        extracted stem or the backing track?
      </p>

      <form onSubmit={start} className="mt-5 space-y-3">
        <input
          type="file"
          accept="audio/*,video/mp4,video/quicktime"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <select
          value={stem}
          onChange={(event) => setStem(event.target.value as Stem)}
          className="h-11 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 text-base text-white outline-none focus:border-brand"
        >
          <option value="vocals">Vocals</option>
          <option value="drum">Drums</option>
          <option value="bass">Bass</option>
          <option value="piano">Piano</option>
          <option value="electric_guitar">Electric guitar</option>
          <option value="acoustic_guitar">Acoustic guitar</option>
        </select>
        <button
          disabled={!file || loading}
          className="h-11 w-full rounded-md bg-brand text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-neutral-850 disabled:text-neutral-600"
        >
          {loading ? "Uploading" : "Start stem split"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-brand-300">{error}</p> : null}

      {job ? (
        <div className="mt-4 rounded-md border border-neutral-850 bg-neutral-950 p-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
            LALAL task
          </p>
          <p className="mt-1 break-all font-mono text-xs text-neutral-400">{job.task.task_id}</p>
          <p className="mt-2 text-sm text-neutral-400">
            {status?.status === "progress"
              ? `Processing ${status.progress ?? 0}%`
              : status?.status ?? "queued"}
          </p>
        </div>
      ) : null}

      {tracks.length > 0 ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={blindRound}
            className="h-11 w-full rounded-md border border-brand/50 bg-brand/10 text-sm font-semibold uppercase tracking-[0.1em] text-brand-300 transition-colors hover:bg-brand hover:text-white"
          >
            Start blind stem round
          </button>

          {secretTrack ? (
            <div className="rounded-md border border-neutral-850 bg-neutral-950 p-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-neutral-500">
                Secret audio
              </p>
              <audio className="mt-3 w-full" controls src={secretTrack.url} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGuess("stem")}
                  className="h-10 rounded-md border border-neutral-800 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  Extracted stem
                </button>
                <button
                  type="button"
                  onClick={() => setGuess("back")}
                  className="h-10 rounded-md border border-neutral-800 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  Backing track
                </button>
              </div>
              {correctGuess != null ? (
                <p className={correctGuess ? "mt-3 text-sm text-emerald-300" : "mt-3 text-sm text-brand-300"}>
                  {correctGuess ? "Correct." : "Not quite."} It was {secretTrack.type} · {secretTrack.label}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
