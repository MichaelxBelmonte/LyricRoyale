"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/brand/Button";
import HomeLogo from "@/components/brand/HomeLogo";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/game/languages";
import type { PublicSessionState } from "@/lib/session/types";

const FIELD =
  "mt-2 h-12 w-full rounded-lg border border-black/15 bg-white px-3 text-[#15120E] outline-none transition-colors placeholder:text-black/35 focus:border-[#C2563B] focus:shadow-[0_0_0_3px_rgba(194,86,59,0.15)]";

const VOICES: [string, string][] = [
  ["hype", "Hype Host"],
  ["judge", "Deadpan Judge"],
  ["diva", "Diva Host"],
];

export default function CreateSession() {
  const router = useRouter();
  const [hostName, setHostName] = useState("Soundclash Host");
  const [voice, setVoice] = useState("hype");
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          hostName,
          voice: {
            preset: voice,
            label: voice === "judge" ? "Deadpan Judge" : voice === "diva" ? "Diva Host" : "Hype Host",
          },
        }),
      });
      const payload = (await response.json()) as { session?: PublicSessionState; error?: string };
      if (!response.ok || !payload.session) throw new Error(payload.error ?? "Session failed");
      router.push(`/host/${payload.session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the session.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <HomeLogo />
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col justify-center px-4 py-12">
        <JCard spine="HOST · SIDE A" contentClassName="p-6 sm:p-8">
          <Sticker tone="magenta" rotate={-4}>
            Party mode
          </Sticker>
          <h1 className="mt-4 font-condensed text-4xl uppercase tracking-tight text-[#15120E] sm:text-5xl">
            Create the room
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/60">
            Start a shared-screen session, pick the host voice, then let players join from their phones.
          </p>

          <label className="mt-7 block">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              Host name
            </span>
            <input value={hostName} onChange={(e) => setHostName(e.target.value)} className={`${FIELD} text-base`} />
          </label>

          <div className="mt-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              ElevenLabs voice
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {VOICES.map(([value, label]) => {
                const selected = voice === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVoice(value)}
                    aria-pressed={selected}
                    className={[
                      "h-12 rounded-lg border px-3 font-condensed text-sm uppercase tracking-[0.04em] transition-colors",
                      selected
                        ? "border-[#C2563B] bg-[#C2563B]/10 text-[#A2452E]"
                        : "border-black/15 bg-white text-black/70 hover:border-black/40 hover:text-black",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              Host language
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Host language"
              className={`${FIELD} appearance-none text-base`}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-black/50">
              BEATBOT speaks and roasts in this language — any of {SUPPORTED_LANGUAGES.length} worldwide. You&rsquo;ll pick the mini-games next, in the room.
            </p>
          </div>

          {error ? <p className="mt-4 text-sm font-semibold text-[#A2452E]">{error}</p> : null}

          <Button onClick={create} disabled={loading} full className="mt-6">
            {loading ? "Creating…" : "Create session ▶"}
          </Button>
        </JCard>
      </main>
    </>
  );
}
