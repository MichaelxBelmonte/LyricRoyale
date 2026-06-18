interface LedProps {
  value: string;
  label?: string;
  danger?: boolean;
  className?: string;
}

/**
 * LED / 7-seg readout in a recessed black bezel — for timers and scores
 * (mood board, sec. 06). Cyan by default, magenta when `danger`.
 */
export default function Led({ value, label, danger = false, className = "" }: LedProps) {
  return (
    <div
      className={`inline-flex flex-col items-center rounded-lg border border-white/10 bg-black px-3 py-1.5 shadow-[inset_0_0_14px_rgba(0,0,0,0.9)] ${className}`}
    >
      {label ? (
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.25em] text-neutral-600">
          {label}
        </span>
      ) : null}
      <span className={`led text-2xl font-bold ${danger ? "led-danger" : ""}`}>{value}</span>
    </div>
  );
}
