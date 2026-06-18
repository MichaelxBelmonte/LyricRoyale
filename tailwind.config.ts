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
        ink: "#0b0b0b",
        cream: "#fff1d6",
        chrome: { DEFAULT: "#aab0ba", light: "#d8dee6", dark: "#838b97" },
        yellow: { DEFAULT: "#ffd400", 400: "#ffdd33" },
        brand: {
          DEFAULT: "#ff007f",
          300: "#ff8cc0",
          400: "#ff3d9a",
          500: "#ff007f",
          600: "#d80069",
          700: "#a8004f",
        },
        tangerine: {
          DEFAULT: "#ff6402",
          300: "#ffb37a",
          400: "#ff8330",
          500: "#ff6402",
          600: "#e25500",
        },
        aqua: {
          DEFAULT: "#00e5d2",
          300: "#7df2e8",
          400: "#2ceadb",
          500: "#00e5d2",
          600: "#00b8a8",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.5)",
        // Neon magenta glow for the Y2K register.
        glow: "0 0 0 1px rgba(255,46,136,0.25), 0 12px 40px -10px rgba(255,46,136,0.55)",
        "glow-aqua": "0 0 0 1px rgba(25,195,201,0.25), 0 12px 40px -10px rgba(25,195,201,0.5)",
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
