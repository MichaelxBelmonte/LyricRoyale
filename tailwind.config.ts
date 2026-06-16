import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neutral: {
          750: "#3f3f46",
          850: "#242428",
        },
      },
    },
  },
  plugins: [],
};

export default config;
