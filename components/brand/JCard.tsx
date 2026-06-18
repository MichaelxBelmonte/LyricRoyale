import type { ReactNode } from "react";

interface JCardProps {
  children: ReactNode;
  /** Classes for the outer cream card (sizing/margins). */
  className?: string;
  /** Classes for the inner content wrapper (padding). */
  contentClassName?: string;
  /** Optional vertical spine label, like a cassette J-card. */
  spine?: string;
}

/**
 * The signature Soundclash surface: a cream tape-label "J-card" with paper grain,
 * a hard edge and an optional printed spine. The mood board's primary container.
 */
export default function JCard({
  children,
  className = "",
  contentClassName = "p-5 sm:p-6",
  spine,
}: JCardProps) {
  return (
    <div
      // Cream + ink set inline: the dev Tailwind JIT was unreliable at emitting the
      // arbitrary bg/text colour, which left the card transparent (invisible text).
      style={{ backgroundColor: "#fff1d6", color: "#0b0b0b" }}
      className={`tx-grain relative overflow-hidden rounded-2xl border-2 border-black/15 shadow-[0_16px_46px_-16px_rgba(255,0,127,0.45)] ${className}`}
    >
      {spine ? (
        <div className="absolute left-0 top-0 flex h-full w-8 items-center justify-center border-r border-black/15 bg-black/[0.04]">
          <span className="font-condensed text-[0.7rem] uppercase tracking-[0.3em] text-black/50 [writing-mode:vertical-rl]">
            {spine}
          </span>
        </div>
      ) : null}
      {/* When a spine is present, force the left padding inline so it always clears the
          32px spine — a `pl-8` class would otherwise lose to the `p-*` in contentClassName
          below the `sm` breakpoint, letting labels slide under the spine. */}
      <div
        className={`relative ${contentClassName}`}
        style={spine ? { paddingLeft: "2.25rem" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
