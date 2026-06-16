// Monogram avatar — initials in a mono badge. Replaces emoji for a minimal,
// professional identity mark.

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-[0.7rem]",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export default function Avatar({ name, size = "md", active = false }: AvatarProps) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md border font-mono font-medium tabular-nums",
        SIZES[size],
        active
          ? "border-brand/60 bg-brand/10 text-brand-300"
          : "border-neutral-800 bg-neutral-925 text-neutral-300",
      ].join(" ")}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
