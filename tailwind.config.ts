import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: "#effcf4",
          100: "#d8f7e3",
          500: "#31c56f",
          600: "#1f9d56",
          900: "#0c2f20",
          950: "#061b13",
        },
        trophy: {
          100: "#fff0bf",
          400: "#f5c64f",
          500: "#dba839",
        },
        boot: {
          400: "#f26b4f",
          500: "#dc4f37",
        },
        ink: {
          900: "#111313",
          950: "#070808",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(49, 197, 111, 0.16), 0 24px 80px rgba(0, 0, 0, 0.34)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
