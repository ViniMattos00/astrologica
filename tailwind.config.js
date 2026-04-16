/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050714",
        "panel-dark": "#0f1329",
        "panel": "#151a3b",
        accent: "#5dd0ff",
        "accent-soft": "#9ae5ff",
        success: "#54f2c4",
        warning: "#f2a154",
        danger: "#ff6f61",
        "text-secondary": "#9da8cc",
      },
      fontFamily: {
        sans: ["'Rajdhani'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(93, 208, 255, 0.45)",
      },
    },
  },
  plugins: [],
};

