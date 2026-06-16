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
          50: "#eef6ff",
          100: "#dbeafe",
          500: "#60a5fa",
          600: "#2563eb",
          900: "#1e3a8a",
          950: "#0f172a",
        },
        trophy: {
          100: "#fef3c7",
          400: "#f59e0b",
          500: "#d97706",
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
        glow: "0 0 0 1px rgba(37, 99, 235, 0.14), 0 24px 80px rgba(15, 23, 42, 0.2)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
