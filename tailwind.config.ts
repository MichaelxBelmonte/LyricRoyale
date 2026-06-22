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
        // Warm light surfaces for the editorial theme. `paper` is the app canvas
        // (cream), `raised` lifts cards/panels above it, `sunken` is for recessed
        // secondary fills. Defined as real tokens (not arbitrary values) so the
        // Tailwind JIT emits them reliably.
        paper: {
          DEFAULT: "#F4ECD8",
          raised: "#FBF6EA",
          sunken: "#EADFC4",
          line: "#E3D5B6",
        },
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
        // Winners screen: cassette plinths rise from the floor (origin-bottom).
        "podium-rise": {
          "0%": { opacity: "0", transform: "translateY(18px) scaleY(0.7)" },
          "100%": { opacity: "1", transform: "translateY(0) scaleY(1)" },
        },
        // Tape-burst strips settle into their seeded resting rotation (--tape-rot).
        "tape-fall": {
          "0%": { opacity: "0", transform: "translateY(-26px) rotate(0deg) scaleY(0.4)" },
          "55%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(var(--tape-rot, 0deg)) scaleY(1)" },
        },
        // Lock-in pop for live answer chips on the host screen.
        "lock-pop": {
          "0%": { opacity: "0.4", transform: "scale(0.6)" },
          "60%": { opacity: "1", transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0.7,0.2,1) both",
        "pop-in": "pop-in 0.28s cubic-bezier(0.2,0.7,0.2,1) both",
        "blank-pulse": "blank-pulse 1.8s ease-in-out infinite",
        "slam-in": "slam-in 0.32s cubic-bezier(0.2,0.8,0.2,1) both",
        "flash-out": "flash-out 0.4s ease-out both",
        shimmer: "shimmer 6s linear infinite",
        "podium-rise": "podium-rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both",
        "tape-fall": "tape-fall 0.7s cubic-bezier(0.2,0.7,0.2,1) both",
        "lock-pop": "lock-pop 0.32s cubic-bezier(0.2,0.8,0.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
