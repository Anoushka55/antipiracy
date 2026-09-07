/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        schand: {
          red: "#c83328",
          "red-dark": "#a82a22",
          "red-light": "#fdf2f1",
          black: "#111111",
          white: "#ffffff",
        },
        navy: "#c83328",
        "navy-deep": "#111111",
        "navy-darker": "#0D1428",
        accent: "#c83328",
        "accent-light": "#d94a3f",
        success: "#00A36C",
        amber: "#D4A017",
        danger: "#DC2626",
        "success-light": "#F0FDF4",
        "amber-light": "#FFFBEB",
        "danger-light": "#FEF2F2",
        "grey-bg": "#F4F6F9",
        "grey-border": "#E2E8F0",
        "text-primary": "#111111",
        "text-secondary": "#6B7280",
        "text-muted": "#9CA3AF",
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
