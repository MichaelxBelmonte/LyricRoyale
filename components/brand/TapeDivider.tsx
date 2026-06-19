import type { CSSProperties } from "react";

/** A magnetic-tape strip divider (mood board ephemera). */
export default function TapeDivider({ className = "" }: { className?: string }) {
  const style: CSSProperties = {
    backgroundImage: "repeating-linear-gradient(90deg,#C2563B 0 14px,#15120E 14px 22px)",
  };
  return <div aria-hidden className={`h-1.5 w-full rounded-full opacity-80 ${className}`} style={style} />;
}
