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
        primary: {
          DEFAULT: "#FF6B00",
          hover: "#E56000",
          light: "#FFF0E5",
        },
        success: {
          DEFAULT: "#16A34A",
          hover: "#15803D",
          light: "#DCFCE7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        baloo: ["var(--font-baloo-2)", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        input: "10px",
      },
    },
  },
  plugins: [],
};
export default config;

