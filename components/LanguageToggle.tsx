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
    <div className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400">
      <span className="hidden uppercase tracking-[0.18em] sm:inline">{labels.toggle}</span>
      <div className="grid grid-cols-2 gap-0.5 rounded-full border border-neutral-800 bg-neutral-900/80 p-0.5 backdrop-blur">
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
                "rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                active
                  ? "bg-brand text-white shadow-glow"
                  : "text-neutral-400 hover:text-white",
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
