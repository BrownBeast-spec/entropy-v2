import json

file_path = '/home/beast/Documents/Personal/entropy-v2/entropy_front/tailwind.config.js'
with open(file_path, 'r') as f:
    text = f.read()

replacement = """  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
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
      fontFamily: {
        sans: ['"Sora"', "sans-serif"],
        display: ['"Sora"', "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
        serif: ['"Crimson Pro"', "serif"],
      },
"""

text = text.replace("""  theme: {
    extend: {
      fontFamily: {
        sans: ['"Sora"', "sans-serif"],
        display: ['"Sora"', "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
        serif: ['"Crimson Pro"', "serif"],
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
      },""", replacement)

with open(file_path, 'w') as f:
    f.write(text)

