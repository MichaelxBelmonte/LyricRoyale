import type { CSSProperties } from "react";

/** A magnetic-tape strip divider (mood board ephemera). */
export default function TapeDivider({ className = "" }: { className?: string }) {
  const style: CSSProperties = {
    backgroundImage: "repeating-linear-gradient(90deg,#ff007f 0 14px,#0b0b0b 14px 22px)",
  };
  return <div aria-hidden className={`h-1.5 w-full rounded-full opacity-80 ${className}`} style={style} />;
}
