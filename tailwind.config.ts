import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Condensed poster face for mixtape-style headlines (MIX IT. CLASH IT.).
        condensed: ["var(--font-condensed)", "var(--font-sans)", "system-ui", "sans-serif"],
        // Handwritten marker for J-card scribbles.
        marker: ["var(--font-marker)", "ui-sans-serif", "cursive"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        neutral: {
          750: "#3f3f46",
          850: "#242428",
          925: "#111114",
        },
        // Soundclash — exact palette sampled from the brand mood board.
        ink: "#15120E",
        cream: "#F4ECD8",
        chrome: { DEFAULT: "#aab0ba", light: "#d8dee6", dark: "#838b97" },
        yellow: { DEFAULT: "#ffd400", 400: "#ffdd33" },
        brand: {
          DEFAULT: "#C2563B",
          300: "#E0967F",
          400: "#D06A4E",
          500: "#C2563B",
          600: "#A2452E",
          700: "#7E3623",
        },
        tangerine: {
          DEFAULT: "#D99A3C",
          300: "#ECC596",
          400: "#E2A85C",
          500: "#D99A3C",
          600: "#BC7E28",
        },
        aqua: {
          DEFAULT: "#2E7D6B",
          300: "#86BDB0",
          400: "#4DA395",
          500: "#2E7D6B",
          600: "#246253",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.5)",
        // Neon magenta glow for the Y2K register.
        glow: "0 0 0 1px rgba(194,86,59,0.25), 0 12px 40px -10px rgba(194,86,59,0.55)",
        "glow-aqua": "0 0 0 1px rgba(46,125,107,0.25), 0 12px 40px -10px rgba(46,125,107,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "blank-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "slam-in": {
          "0%": { opacity: "0", transform: "scale(1.22)" },
          "60%": { opacity: "1", transform: "scale(0.98)" },
          "100%": { transform: "scale(1)" },
        },
        "flash-out": {
          "0%": { opacity: "1" },
          "40%": { opacity: "0.35" },
          "100%": { opacity: "1" },
        },
        // Moving holographic sheen for the wordmark gradient.
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
        "pop-in": "pop-in 0.28s cubic-bezier(0.2,0.7,0.2,1) both",
        "blank-pulse": "blank-pulse 1.8s ease-in-out infinite",
        "slam-in": "slam-in 0.32s cubic-bezier(0.2,0.8,0.2,1) both",
        "flash-out": "flash-out 0.4s ease-out both",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
