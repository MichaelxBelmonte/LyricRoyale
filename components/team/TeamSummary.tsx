import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import JCard from "@/components/brand/JCard";
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
    <JCard contentClassName="p-5" className="lg:sticky lg:top-20 lg:self-start">
      <div className="flex items-center gap-3">
        <Avatar name={team.playerName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#A2452E]">
            {labels.teamReady}
          </p>
          <h2 className="truncate font-condensed text-lg uppercase tracking-tight text-[#15120E]">
            {team.playerName}
          </h2>
          <p className="truncate text-xs text-black/45">{team.teamName}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={labels.editTeam}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black/15 text-black/50 transition-colors hover:border-[#C2563B] hover:text-[#A2452E]"
        >
          <Icon name="pencil" size={16} />
        </button>
      </div>

      <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-black/45">
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
                "flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-sm font-medium transition-colors",
                isActive
                  ? "border-[#C2563B] bg-[#C2563B]/10 text-[#15120E]"
                  : "border-black/12 bg-white text-black/70 hover:border-black/40 hover:text-black",
              ].join(" ")}
            >
              <Avatar name={artist} size="sm" active={isActive} />
              <span className="block truncate">{artist}</span>
            </button>
          );
        })}
      </div>
    </JCard>
  );
}
