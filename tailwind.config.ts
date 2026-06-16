import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // No poster display face — headings are the grotesk with tight tracking + uppercase.
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        neutral: {
          750: "#3f3f46",
          850: "#242428",
          925: "#111114",
        },
        brand: {
          DEFAULT: "#e5354a",
          300: "#f4a6ae",
          400: "#ef4d60",
          500: "#e5354a",
          600: "#c42a3d",
          700: "#a11f30",
        },
      },
      boxShadow: {
        // Minimal, flat — a faint depth cue only, no colored glow.
        card: "0 1px 2px 0 rgba(0,0,0,0.5)",
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
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
        "pop-in": "pop-in 0.28s cubic-bezier(0.2,0.7,0.2,1) both",
        "blank-pulse": "blank-pulse 1.8s ease-in-out infinite",
        "slam-in": "slam-in 0.32s cubic-bezier(0.2,0.8,0.2,1) both",
        "flash-out": "flash-out 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
