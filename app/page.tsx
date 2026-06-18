import Link from "next/link";
import HomeWaveform from "@/components/audio/HomeWaveform";
import BrandIntro from "@/components/brand/BrandIntro";
import Icon from "@/components/ui/Icon";

export default function Home() {
  return (
    <>
      <BrandIntro />
      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-5 py-8 sm:px-8">
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_24rem]">
          <div className="max-w-2xl">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#00e5d2]">
              Music party game
            </p>
            <h1 className="mt-4">
              <span className="sr-only">Soundclash</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/wordmark.png"
                alt="Soundclash"
                className="h-16 w-auto max-w-full sm:h-24"
              />
            </h1>
            <p className="mt-4 max-w-xl font-condensed text-2xl uppercase tracking-[0.04em] text-[#fff1d6] sm:text-4xl">
              Same track. Different challenge.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/host/new"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-[#fff1d6] px-7 font-condensed text-xl uppercase tracking-[0.06em] text-black shadow-[0_5px_0_rgba(255,0,127,0.55)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 sm:w-auto"
              >
                Start clash
                <Icon name="play" size={18} className="text-[#ff007f]" />
              </Link>
              <Link
                href="/join"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-white/15 px-7 font-condensed text-xl uppercase tracking-[0.06em] text-[#fff1d6] transition-colors hover:border-[#00e5d2] hover:text-[#00e5d2] sm:w-auto"
              >
                Join
              </Link>
            </div>

            <Link
              href="/solo"
              className="mt-5 inline-flex font-mono text-[0.62rem] uppercase tracking-[0.22em] text-white/35 transition-colors hover:text-[#00e5d2]"
            >
              Solo lab
            </Link>
          </div>

          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/mascot.png"
                alt="BEATBOT, the Soundclash host"
                className="h-48 w-auto object-contain drop-shadow-[0_22px_28px_rgba(0,0,0,0.38)] sm:h-64 lg:h-80"
              />
            </div>
            <div className="mt-2">
              <HomeWaveform />
            </div>
          </div>
        </section>

        <footer className="mt-10 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-white/25">
          Soundclash · Musixmatch Musicathon 2026
        </footer>
      </main>
    </>
  );
}
