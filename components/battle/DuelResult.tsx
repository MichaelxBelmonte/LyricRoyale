import Button from "@/components/brand/Button";
import JCard from "@/components/brand/JCard";
import Sticker from "@/components/brand/Sticker";
import type { HeadToHead } from "@/lib/game/challenge";

interface DuelResultProps {
  youName: string;
  rivalName: string;
  head: HeadToHead;
  labels: Record<string, string>;
  onRematch: () => void;
  onBack: () => void;
}

export default function DuelResult({
  youName,
  rivalName,
  head,
  labels,
  onRematch,
  onBack,
}: DuelResultProps) {
  const tie = head.myTotal === head.theirTotal;
  const title = tie ? labels.duelTie : head.won ? labels.duelYouWon : labels.duelYouLost;

  return (
    <div className="animate-pop-in">
      <JCard spine="DUEL · HEAD TO HEAD" contentClassName="p-5 sm:p-7">
        <Sticker tone={head.won && !tie ? "aqua" : "magenta"} rotate={-3}>
          {labels.challengeBannerTitle}
        </Sticker>
        <h2 className="mt-4 font-condensed text-4xl uppercase tracking-tight text-[#0b0b0b]">{title}</h2>
        {!tie ? (
          <p className="mt-1 font-mono text-sm tabular-nums text-black/55">
            {labels.duelMarginBy} {head.margin} {labels.pointsLabel}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div
            className={[
              "rounded-lg border px-3 py-2",
              head.won && !tie ? "border-[#0a7d55]/40 bg-[#0a7d55]/5" : "border-black/10 bg-white/60",
            ].join(" ")}
          >
            <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">
              {labels.youLabel} · {youName}
            </p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-[#0b0b0b]">{head.myTotal}</p>
          </div>
          <div
            className={[
              "rounded-lg border px-3 py-2",
              !head.won && !tie ? "border-[#ff007f]/40 bg-[#ff007f]/5" : "border-black/10 bg-white/60",
            ].join(" ")}
          >
            <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-black/45">
              {rivalName}
            </p>
            <p className="mt-1 font-mono text-2xl tabular-nums text-[#0b0b0b]">{head.theirTotal}</p>
          </div>
        </div>

        <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
          {labels.scorecardTitle}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {head.lines.map((line, index) => (
            <span
              key={index}
              title={`${line.you.points} vs ${line.them.points}`}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-md border font-mono text-xs tabular-nums",
                line.outcome === "win"
                  ? "border-[#0a7d55]/40 bg-[#0a7d55]/10 text-[#0a7d55]"
                  : line.outcome === "loss"
                    ? "border-[#ff007f]/40 bg-[#ff007f]/10 text-[#d80069]"
                    : "border-black/15 text-black/40",
              ].join(" ")}
            >
              {index + 1}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={onRematch} full>
            {labels.rematchSong}
          </Button>
          <Button onClick={onBack} variant="outlineDark" full>
            {labels.pickAnotherSong}
          </Button>
        </div>
      </JCard>
    </div>
  );
}
