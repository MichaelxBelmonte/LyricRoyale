"use client";

import { useState } from "react";
import type { TrackSummary } from "@/lib/types";

// Host-side prep for Stem Heist: upload a real audio file per deck track, run
// lalal.ai stem separation, and attach the isolated stem to the session. The
// uploaded audio is processed by lalal and not persisted by us. Needs LALAL_API_KEY
// server-side; without it the upload returns 502 and the row shows an error.

type StemState = "idle" | "uploading" | "processing" | "ready" | "error";

// One isolated stem per track — bass is recognizable-but-hard to guess from.
const STEM = "bass";

export default function StemLab({ code, deck }: { code: string; deck: TrackSummary[] }) {
  const [rows, setRows] = useState<Record<number, { state: StemState; msg?: string }>>({});
  const readyCount = Object.values(rows).filter((r) => r.state === "ready").length;

  function set(trackId: number, state: StemState, msg?: string) {
    setRows((prev) => ({ ...prev, [trackId]: { state, msg } }));
  }

  async function poll(taskId: string): Promise<string> {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/lalal/stems/${encodeURIComponent(taskId)}`);
      const payload = (await res.json()) as {
        result?: { status?: string; result?: { tracks?: { type: string; url: string }[] } };
      };
      const result = payload.result;
      if (result?.status === "success") {
        const tracks = result.result?.tracks ?? [];
        const url = tracks.find((t) => t.type === "stem")?.url ?? tracks[0]?.url;
        if (!url) throw new Error("no stem returned");
        return url;
      }
      if (result?.status === "error" || result?.status === "cancelled" || result?.status === "server_error") {
        throw new Error("separation failed");
      }
    }
    throw new Error("timed out");
  }

  async function prepare(track: TrackSummary, file: File) {
    set(track.trackId, "uploading");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("stem", STEM);
      const res = await fetch("/api/lalal/stems", { method: "POST", body: form });
      const payload = (await res.json()) as { task?: { task_id?: string }; error?: string };
      if (!res.ok || !payload.task?.task_id) throw new Error(payload.error ?? "upload failed");
      set(track.trackId, "processing");
      const url = await poll(payload.task.task_id);
      await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_stem",
          stem: { trackId: track.trackId, trackName: track.trackName, stem: STEM, url },
        }),
      });
      set(track.trackId, "ready");
    } catch (err) {
      set(track.trackId, "error", err instanceof Error ? err.message : "failed");
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">
          Stem Lab · Stem Heist
        </p>
        <p className="font-mono text-xs text-black/55">
          {readyCount}/{deck.length} ready{readyCount < 4 ? " · need 4" : ""}
        </p>
      </div>
      <p className="mt-1 text-xs text-black/45">
        Upload audio you own for each track — we isolate the {STEM} via lalal.ai for players to guess.
      </p>
      <ul className="mt-3 grid gap-2">
        {deck.map((track) => {
          const state = rows[track.trackId]?.state ?? "idle";
          return (
            <li
              key={track.trackId}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-ink">
                {track.trackName} <span className="text-black/40">· {track.artistName}</span>
              </span>
              {state === "ready" ? (
                <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-aqua-600">
                  Ready
                </span>
              ) : state === "uploading" || state === "processing" ? (
                <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-black/45">
                  {state}…
                </span>
              ) : (
                <label className="shrink-0 cursor-pointer rounded-md border border-black/15 px-3 py-1.5 font-condensed text-xs uppercase tracking-[0.04em] text-black/70 transition-colors hover:border-brand hover:text-brand">
                  {state === "error" ? "Retry" : "Upload"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void prepare(track, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {Object.values(rows).some((r) => r.state === "error") ? (
        <p className="mt-2 text-xs text-[#A2452E]">
          Some uploads failed — check LALAL_API_KEY and the file format, then retry.
        </p>
      ) : null}
    </div>
  );
}
