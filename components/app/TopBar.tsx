"use client";

import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/brand/Logo";
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
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper-raised/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-black/10 text-black/55 transition-colors hover:border-black/15 hover:text-ink sm:h-9 sm:w-9"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          ) : null}
          <Logo href="/" className="h-5 sm:h-6" withMark markClassName="h-7 w-7" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {team ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-paper-sunken py-1 pl-1 pr-1.5 text-xs font-medium text-ink sm:pr-2.5">
              <Avatar name={team.playerName} size="sm" />
              <span className="hidden max-w-[10rem] truncate sm:inline">{team.playerName}</span>
            </span>
          ) : null}
          <LanguageToggle locale={locale} labels={languageLabels} onChange={onLocaleChange} />
        </div>
      </div>
    </header>
  );
}
