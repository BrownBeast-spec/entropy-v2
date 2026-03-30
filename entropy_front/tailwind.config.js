/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "sans-serif"],
        mono: ["DM Mono", "monospace"],
        serif: ["Crimson Pro", "serif"],
      },
      colors: {
        navy: {
          DEFAULT: "#0B1120",
          mid: "#111827",
          light: "#1A2440",
        },
        indigo: {
          DEFAULT: "#3730D8",
          bright: "#4F46E5",
          light: "#6366F1",
        },
        lavender: {
          DEFAULT: "#EEF0FF",
          mid: "#E5E7FF",
        },
      },
    },
  },
  plugins: [],
};
