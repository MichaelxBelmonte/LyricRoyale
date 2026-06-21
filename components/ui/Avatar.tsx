// Player identity mark — a chosen emoji avatar, falling back to monogram initials
// when none is set. Used on the host roster, scoreboard, and player controller.

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  emoji?: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const TEXT: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "text-[0.7rem]",
  md: "text-sm",
  lg: "text-base",
};

const EMOJI_TEXT: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

export default function Avatar({ name, emoji, size = "md", active = false }: AvatarProps) {
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-md border font-mono font-medium tabular-nums leading-none",
        SIZES[size],
        emoji ? EMOJI_TEXT[size] : TEXT[size],
        active
          ? "border-brand/60 bg-brand/10 text-brand"
          : "border-black/10 bg-paper-sunken text-black/70",
      ].join(" ")}
      aria-hidden="true"
    >
      {emoji ?? initials(name)}
    </span>
  );
}
