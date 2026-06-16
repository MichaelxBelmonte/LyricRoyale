"use client";

import LanguageToggle from "@/components/LanguageToggle";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import type { Locale, SingerTeam } from "@/lib/types";

interface TopBarProps {
  locale: Locale;
  languageLabels: { toggle: string; english: string; italian: string };
  onLocaleChange: (locale: Locale) => void;
  team?: SingerTeam | null;
  onBack?: () => void;
  backLabel?: string;
}

export default function TopBar({
  locale,
  languageLabels,
  onLocaleChange,
  team,
  onBack,
  backLabel,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-850 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          ) : null}
          <span className="truncate font-display text-base font-bold uppercase tracking-[0.18em] text-white">
            Lyric<span className="text-brand">Royale</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {team ? (
            <span className="hidden items-center gap-2 rounded-md border border-neutral-800 bg-neutral-925 py-1 pl-1 pr-2.5 text-xs font-medium text-neutral-200 sm:inline-flex">
              <Avatar name={team.playerName} size="sm" />
              <span className="max-w-[10rem] truncate">{team.playerName}</span>
            </span>
          ) : null}
          <LanguageToggle locale={locale} labels={languageLabels} onChange={onLocaleChange} />
        </div>
      </div>
    </header>
  );
}
