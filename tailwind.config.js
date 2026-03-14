/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "arcana-navy": "#0f172a",
        "arcana-blue": "#2563eb",
        "arcana-sky": "#38bdf8",
        "arcana-slate": "#334155",
        "arcana-surface": "#1e293b",
        "arcana-border": "#334155",
        "arcana-success": "#22c55e",
        "arcana-warning": "#f59e0b",
        "arcana-danger": "#ef4444",
      },
    },
  },
  plugins: [],
};
