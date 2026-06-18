import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type Variant = "chrome" | "magenta" | "outlineDark" | "outlineLight";

// Colours set inline so they never depend on Tailwind JIT regeneration.
const VARIANT_STYLE: Record<Variant, CSSProperties> = {
  chrome: { backgroundImage: "linear-gradient(to bottom,#eef2f6,#c7ccd4 55%,#9aa1ac)", color: "#0b0b0b" },
  magenta: { backgroundColor: "#ff007f", color: "#ffffff" },
  outlineDark: {},
  outlineLight: {},
};

const VARIANT_CLASS: Record<Variant, string> = {
  chrome:
    "border-2 border-black/25 shadow-[0_5px_0_rgba(0,0,0,0.35),0_16px_26px_-12px_rgba(0,0,0,0.55)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
  magenta:
    "shadow-[0_5px_0_rgba(0,0,0,0.28),0_16px_26px_-12px_rgba(255,0,127,0.6)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.28)]",
  outlineDark: "border-2 border-black/25 text-black/80 hover:border-black hover:bg-black/[0.06]",
  outlineLight: "border border-white/20 text-neutral-200 hover:border-white/50 hover:text-white",
};

const BASE =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-condensed text-base uppercase tracking-[0.06em] transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: Variant;
  full?: boolean;
  className?: string;
}

/**
 * The one Soundclash button. Chrome = primary (the cassette key), magenta = accent
 * (used sparingly), outline = quiet. No rainbow gradient — that's reserved for the
 * wordmark only.
 */
export default function Button({
  children,
  href,
  onClick,
  type = "button",
  disabled,
  variant = "chrome",
  full,
  className = "",
}: ButtonProps) {
  const cls = `${BASE} ${VARIANT_CLASS[variant]} ${full ? "w-full" : ""} ${className}`;
  const style = VARIANT_STYLE[variant];

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style}>
      {children}
    </button>
  );
}
