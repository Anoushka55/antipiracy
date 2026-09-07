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
        navy: "#00338D",
        "navy-deep": "#1A1F36",
        "navy-darker": "#0D1428",
        accent: "#0077C8",
        "accent-light": "#1A8FE3",
        success: "#00A36C",
        amber: "#D4A017",
        danger: "#DC2626",
        "success-light": "#F0FDF4",
        "amber-light": "#FFFBEB",
        "danger-light": "#FEF2F2",
        "grey-bg": "#F4F6F9",
        "grey-border": "#E2E8F0",
        "text-primary": "#1A1F36",
        "text-secondary": "#6B7280",
        "text-muted": "#9CA3AF",
        schand: "#8B1E3F",
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
