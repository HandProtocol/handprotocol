import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15130f",
        moss: "#475437",
        soil: "#5f4637",
        clay: "#b6633a",
        rosewood: "#8f3d45",
        cream: "#f7efe2",
        linen: "#fbf7ee",
        gold: "#d9a441",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        cinematic: "0 30px 100px rgba(25, 19, 13, 0.28)",
        soft: "0 18px 60px rgba(75, 60, 42, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
