"use client";

import { useEffect, useState } from "react";
import type { ErrorResponse, RichsyncPreview, RichsyncResponse } from "@/lib/types";

interface LiveLyricPreviewProps {
  trackId: number;
  enabled: boolean;
  labels: {
    richsyncTitle: string;
    richsyncLoading: string;
    richsyncUnavailable: string;
  };
}

export default function LiveLyricPreview({ trackId, enabled, labels }: LiveLyricPreviewProps) {
  const [preview, setPreview] = useState<RichsyncPreview | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(enabled ? null : labels.richsyncUnavailable);

  useEffect(() => {
    if (!enabled) {
      setPreview(null);
      setError(labels.richsyncUnavailable);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPreview(null);
      try {
        const response = await fetch(`/api/mxm/richsync?trackId=${trackId}`);
        const payload = (await response.json()) as Partial<RichsyncResponse & ErrorResponse>;
        if (!response.ok || !payload.preview) throw new Error(payload.error);
        if (!cancelled) setPreview(payload.preview);
      } catch {
        if (!cancelled) setError(labels.richsyncUnavailable);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, labels.richsyncUnavailable, trackId]);

  useEffect(() => {
    if (!preview) return;
    const startedAt = Date.now();
    const duration = Math.max(1.5, preview.line.end - preview.line.start);

    const timer = window.setInterval(() => {
      const elapsed = ((Date.now() - startedAt) / 1000) % duration;
      const nextIndex = preview.line.tokens.findLastIndex((token) => token.offset <= elapsed);
      setActiveIndex(Math.max(0, nextIndex));
    }, 120);

    return () => window.clearInterval(timer);
  }, [preview]);

  useEffect(() => {
    if (!preview?.tracking.script) return;
    const script = document.createElement("script");
    script.src = preview.tracking.script;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [preview?.tracking.script]);

  return (
    <section className="rounded-lg border border-neutral-850 bg-neutral-950/70 p-4 sm:p-5">
      {preview?.tracking.pixel ? (
        <img alt="" className="hidden" referrerPolicy="no-referrer" src={preview.tracking.pixel} />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
          {labels.richsyncTitle}
        </p>
        </div>
      </div>

      {loading ? <p className="mt-3 text-sm text-neutral-500">{labels.richsyncLoading}</p> : null}
      {error ? <p className="mt-3 text-sm text-neutral-500">{error}</p> : null}

      {preview ? (
        <>
          <p className="mt-4 text-xl font-semibold leading-9 text-white sm:text-2xl">
            {preview.line.tokens.map((token, index) => (
              <span
                key={`${token.offset}-${index}`}
                className={[
                  "transition-colors duration-150",
                  index === activeIndex
                    ? "text-brand-300"
                    : index < activeIndex
                      ? "text-white"
                      : "text-neutral-600",
                ].join(" ")}
              >
                {token.text}
              </span>
            ))}
          </p>
          <p className="mt-4 text-xs leading-5 text-neutral-600">{preview.copyright}</p>
        </>
      ) : null}
    </section>
  );
}
