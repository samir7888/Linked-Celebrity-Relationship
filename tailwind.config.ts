import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2EA",
        ink: "#1B1A22",
        "ink-soft": "#4A4854",
        wine: "#8C1F3B",
        "wine-deep": "#5E1428",
        gold: "#B8944F",
        sage: "#5C6B57",
        line: "#DCD4C4",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
      keyframes: {
        "draw-line": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
