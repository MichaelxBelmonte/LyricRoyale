"use client";

import Icon, { type IconName } from "@/components/ui/Icon";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: IconName;
}

interface BottomNavProps {
  items: BottomNavItem[];
  active: string;
  onSelect: (key: string) => void;
}

/**
 * Mobile tab bar pinned to the bottom. Hidden on desktop (lg+), where the lobby
 * shows the team and song panels side by side instead.
 */
export default function BottomNav({ items, active, onSelect }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-paper-raised/90 backdrop-blur lg:hidden">
      <div
        className="mx-auto grid w-full max-w-md px-2 pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-col items-center gap-1 py-2.5 text-[0.6rem] font-medium uppercase tracking-[0.12em] transition-colors",
                isActive ? "text-brand" : "text-black/45 hover:text-black/70",
              ].join(" ")}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
