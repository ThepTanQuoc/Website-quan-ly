/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1e3a8a",
          50: "#eef2ff",
          900: "#0b1b4d",
          950: "#060f33",
        },
        brand: { red: "#e11d2a", cyan: "#06b6d4" },
      },
      fontFamily: {
        display: ["Orbitron", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(6,182,212,0.25), 0 8px 30px -8px rgba(30,58,138,0.45)",
        "glow-cyan": "0 0 24px -4px rgba(6,182,212,0.55)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "pulse-ring": { "0%": { boxShadow: "0 0 0 0 rgba(6,182,212,0.45)" }, "100%": { boxShadow: "0 0 0 14px rgba(6,182,212,0)" } },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
