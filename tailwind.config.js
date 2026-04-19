/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-container": "var(--color-primary-container)",
        "on-primary": "var(--color-on-primary)",
        secondary: "var(--color-secondary)",
        tertiary: "var(--color-tertiary)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container-high": "var(--color-surface-container-high)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        outline: "var(--color-outline)",
        "outline-variant": "var(--color-outline-variant)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        
        // Backward compatibility mapping for old arcana styles
        "arcana-navy": "#0a0a0a",
        "arcana-blue": "#C5A059",
        "arcana-sky": "#a68545",
        "arcana-slate": "#888888",
        "arcana-surface": "#121212",
        "arcana-border": "#222222",
        "arcana-success": "#10b981",
        "arcana-warning": "#f59e0b",
        "arcana-danger": "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        headline: ["var(--font-headline)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
