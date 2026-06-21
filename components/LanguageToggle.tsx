"use client";

import type { Locale } from "@/lib/types";

interface LanguageToggleProps {
  locale: Locale;
  labels: {
    toggle: string;
    english: string;
    italian: string;
  };
  onChange: (locale: Locale) => void;
}

export default function LanguageToggle({ locale, labels, onChange }: LanguageToggleProps) {
  const options: Array<{ value: Locale; short: string; full: string }> = [
    { value: "en", short: "EN", full: labels.english },
    { value: "it", short: "IT", full: labels.italian },
  ];

  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-black/55">
      <span className="hidden uppercase tracking-wider sm:inline">{labels.toggle}</span>
      <div className="grid grid-cols-2 gap-0.5 rounded-md border border-black/10 bg-paper-sunken p-0.5">
        {options.map((option) => {
          const active = locale === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.full}
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={[
                "rounded px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-black/55 hover:text-ink",
              ].join(" ")}
            >
              {option.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
