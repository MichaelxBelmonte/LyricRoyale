/**
 * Route-level loading screen (App Router Suspense fallback). Brand-consistent:
 * the cassette logomark spins inside a neon ring under the wordmark.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-paper">
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-[#C2563B]/25 border-t-[#C2563B] [animation-duration:1.1s]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logomark.png"
          alt=""
          aria-hidden
          className="absolute inset-[0.6rem] h-[3.55rem] w-[3.55rem] rounded-xl shadow-[0_0_24px_-4px_rgba(194,86,59,0.6)]"
        />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wordmark.png" alt="Soundclash" className="h-6 w-auto opacity-90" />
      <p className="animate-pulse font-mono text-[0.6rem] uppercase tracking-[0.32em] text-black/45">
        Loading the clash…
      </p>
    </div>
  );
}
