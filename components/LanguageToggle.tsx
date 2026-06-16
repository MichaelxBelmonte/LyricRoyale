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
  return (
    <div className="inline-flex items-center gap-2 text-sm text-neutral-400">
      <span>{labels.toggle}</span>
      <div className="grid grid-cols-2 rounded-md border border-neutral-800 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => onChange("en")}
          className={[
            "rounded px-3 py-1 transition",
            locale === "en" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white",
          ].join(" ")}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => onChange("it")}
          className={[
            "rounded px-3 py-1 transition",
            locale === "it" ? "bg-red-600 text-white" : "text-neutral-400 hover:text-white",
          ].join(" ")}
        >
          IT
        </button>
      </div>
    </div>
  );
}
