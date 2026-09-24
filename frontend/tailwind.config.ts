import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        finz: {
          bg: "#071015",
          "bg-sec": "#0C171D",
          card: "#111D24",
          "card-elevated": "#16242B",
          border: "#24343A",
          primary: "#F4EFE5",
          secondary: "#A8AAA3",
          muted: "#6F7C80",
          gold: "#C89B5D",
          "gold-light": "#E5C58E",
          "gold-highlight": "#F0D6A3",
          jade: "#55C99A",
          emerald: "#18785D",
          amber: "#E3A83B",
          coral: "#E66A63",
          teal: "#5BA8A0",
          lavender: "#A78BCE",
        },
      },
    },
  },
  plugins: [],
};
export default config;
