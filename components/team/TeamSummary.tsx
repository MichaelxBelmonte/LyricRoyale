import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import type { SingerTeam } from "@/lib/types";

interface TeamSummaryProps {
  team: SingerTeam;
  activeArtist: string;
  labels: Record<string, string>;
  onArtistSelect: (artist: string) => void;
  onEdit: () => void;
}

export default function TeamSummary({
  team,
  activeArtist,
  labels,
  onArtistSelect,
  onEdit,
}: TeamSummaryProps) {
  return (
    <aside className="rounded-lg border border-neutral-850 bg-neutral-925 p-4 lg:sticky lg:top-20 lg:self-start">
      <div className="flex items-center gap-3">
        <Avatar name={team.playerName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-brand">
            {labels.teamReady}
          </p>
          <h2 className="truncate font-display text-lg font-semibold text-white">{team.playerName}</h2>
          <p className="truncate text-xs text-neutral-500">{team.teamName}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={labels.editTeam}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
        >
          <Icon name="pencil" size={16} />
        </button>
      </div>

      <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-neutral-500">
        {labels.artistPool}
      </p>
      <div className="mt-2 grid gap-2">
        {team.artists.map((artist) => {
          const isActive = artist === activeArtist;
          return (
            <button
              key={artist}
              type="button"
              onClick={() => onArtistSelect(artist)}
              aria-pressed={isActive}
              className={[
                "flex min-w-0 items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm font-medium transition-colors",
                isActive
                  ? "border-brand bg-brand/10 text-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white",
              ].join(" ")}
            >
              <Avatar name={artist} size="sm" active={isActive} />
              <span className="block truncate">{artist}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
