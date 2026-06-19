"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/brand/Button";
import HomeLogo from "@/components/brand/HomeLogo";
import JCard from "@/components/brand/JCard";
import { PLAYER_AVATARS } from "@/lib/session/avatars";

const FIELD =
  "mt-2 h-12 w-full rounded-lg border border-black/15 bg-white px-3 text-[#0b0b0b] outline-none transition-colors placeholder:text-black/35 focus:border-[#ff007f] focus:shadow-[0_0_0_3px_rgba(255,0,127,0.15)]";

export default function JoinSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(PLAYER_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    if (!cleanCode) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${cleanCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName || undefined, avatar }),
      });
      const payload = (await response.json()) as { player?: { id: string }; error?: string };
      if (!response.ok || !payload.player) throw new Error(payload.error ?? "Join failed");
      window.localStorage.setItem(`soundclash-player-${cleanCode}`, payload.player.id);
      router.push(`/player/${cleanCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join this room.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <HomeLogo />
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-12">
        <JCard spine="PLAYER · SIDE B" contentClassName="p-6 sm:p-7">
          <p className="font-marker text-2xl" style={{ color: "#d80069" }}>
            Controller
          </p>
          <h1 className="mt-1 font-condensed text-3xl uppercase tracking-tight text-[#0b0b0b] sm:text-4xl">
            Join a room
          </h1>

          <label className="mt-6 block">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              Room code
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              placeholder="ABC123"
              className={`${FIELD} h-14 text-center font-mono text-2xl uppercase tracking-[0.2em] placeholder:tracking-[0.2em] sm:tracking-[0.3em] sm:placeholder:tracking-[0.3em]`}
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              Stage name (optional)
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Auto if empty"
              className={`${FIELD} text-base`}
            />
          </label>

          <div className="mt-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
              Pick your avatar
            </span>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {PLAYER_AVATARS.map((emoji) => {
                const selected = avatar === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setAvatar(emoji)}
                    aria-pressed={selected}
                    aria-label={`Avatar ${emoji}`}
                    className={[
                      "flex h-11 items-center justify-center rounded-lg border text-xl transition-colors",
                      selected
                        ? "border-[#ff007f] bg-[#ff007f]/10 shadow-[0_0_0_3px_rgba(255,0,127,0.12)]"
                        : "border-black/15 bg-white hover:border-black/40",
                    ].join(" ")}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-semibold text-[#d80069]">{error}</p> : null}

          <Button onClick={join} disabled={loading || !code.trim()} full className="mt-6">
            {loading ? "Joining…" : "Join session ▶"}
          </Button>
        </JCard>
      </main>
    </>
  );
}
