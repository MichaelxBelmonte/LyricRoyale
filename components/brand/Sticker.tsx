import type { CSSProperties, ReactNode } from "react";

type Tone = "magenta" | "tangerine" | "aqua" | "yellow" | "cream";

const TONES: Record<Tone, string> = {
  magenta: "bg-[#ff007f] text-white",
  tangerine: "bg-[#ff6402] text-white",
  aqua: "bg-[#00e5d2] text-black",
  yellow: "bg-[#ffd400] text-black",
  cream: "bg-[#fff1d6] text-black",
};

interface StickerProps {
  children: ReactNode;
  className?: string;
  rotate?: number;
  tone?: Tone;
}

/**
 * A die-cut sticker: thick white border, hard offset shadow and a small rotation,
 * so it reads as something physically slapped onto the page (mood board, sec. 08).
 */
export default function Sticker({
  children,
  className = "",
  rotate = -3,
  tone = "magenta",
}: StickerProps) {
  const style: CSSProperties = { transform: `rotate(${rotate}deg)` };
  return (
    <span
      style={style}
      className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border-[3px] border-white px-3 py-1 font-condensed text-xs uppercase tracking-[0.12em] shadow-[0_3px_0_rgba(0,0,0,0.35),0_10px_18px_-8px_rgba(0,0,0,0.6)] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
