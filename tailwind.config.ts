import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        neutral: {
          750: "#3f3f46",
          850: "#242428",
        },
        brand: {
          DEFAULT: "#ff2e43",
          300: "#ff8a96",
          400: "#ff5d6c",
          500: "#ff2e43",
          600: "#e11d33",
          700: "#b91527",
        },
      },
      boxShadow: {
        glow: "0 18px 50px -18px rgba(255,46,67,0.55)",
        card: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 24px 50px -32px rgba(0,0,0,0.9)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "blank-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.2,0.7,0.2,1) both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.2,0.7,0.2,1) both",
        "blank-pulse": "blank-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
