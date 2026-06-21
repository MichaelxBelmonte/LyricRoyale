import Link from "next/link";
import HomeWaveform from "@/components/audio/HomeWaveform";
import BrandIntro from "@/components/brand/BrandIntro";
import Icon from "@/components/ui/Icon";

export default function Home() {
  return (
    <>
      <BrandIntro />
      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] sm:pl-8 sm:pr-8">
        {/*
          Mobile: one centered column in reading order — brand, mascot, tagline +
          actions, then the ambient theme player at the bottom.
          Desktop (lg): a 2×2 grid — text on the left, mascot/waveform on the right —
          with each pair meeting at the vertical centre line.
        */}
        <section className="flex flex-col items-center gap-6 text-center lg:grid lg:grid-cols-[1fr_22rem] lg:grid-rows-[auto_auto] lg:gap-x-12 lg:gap-y-3 lg:text-left">
          {/* Brand */}
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="hidden font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#2E7D6B] lg:block">
              Music party game
            </p>
            <h1 className="lg:mt-4">
              <span className="sr-only">Soundclash</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/wordmark.png"
                alt="Soundclash"
                className="mx-auto h-14 w-auto max-w-full sm:h-20 lg:mx-0 lg:h-24"
              />
            </h1>
          </div>

          {/* Mascot — the hero on mobile */}
          <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mascot.png"
              alt="BEATBOT, the Soundclash host"
              className="mx-auto h-40 w-auto object-contain drop-shadow-[0_22px_28px_rgba(0,0,0,0.38)] sm:h-48 lg:h-72"
            />
          </div>

          {/* Tagline + actions */}
          <div className="flex w-full max-w-sm flex-col items-center gap-5 sm:max-w-md lg:col-start-1 lg:row-start-2 lg:max-w-none lg:items-start lg:self-start lg:gap-6">
            <p className="font-condensed text-xl uppercase tracking-[0.04em] text-ink sm:text-2xl lg:max-w-xl lg:text-4xl">
              Same track. Different challenge.
            </p>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/host/new"
                className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#C2563B] px-7 font-condensed text-xl uppercase tracking-[0.06em] text-white shadow-[0_5px_0_rgba(126,54,35,0.85),0_16px_26px_-12px_rgba(194,86,59,0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 sm:w-auto"
              >
                Start clash
                <Icon name="play" size={18} className="text-white" />
              </Link>
              <Link
                href="/join"
                className="inline-flex h-14 w-full items-center justify-center rounded-xl border-2 border-black/20 px-7 font-condensed text-xl uppercase tracking-[0.06em] text-ink transition-colors hover:border-[#2E7D6B] hover:text-[#2E7D6B] sm:w-auto"
              >
                Join
              </Link>
            </div>

            <Link
              href="/solo"
              className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-black/40 transition-colors hover:text-[#2E7D6B]"
            >
              Solo lab
            </Link>
          </div>

          {/* Ambient theme player */}
          <div className="w-full max-w-xs lg:col-start-2 lg:row-start-2 lg:max-w-none lg:self-start">
            <HomeWaveform />
          </div>
        </section>

        <footer className="mt-10 hidden font-mono text-[0.58rem] uppercase tracking-[0.24em] text-black/30 lg:block">
          Soundclash · Musixmatch Musicathon 2026
        </footer>
      </main>
    </>
  );
}
