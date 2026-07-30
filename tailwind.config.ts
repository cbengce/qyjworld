import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#123c2f",
        leaf: "#5f8c68",
        gold: "#c89442",
        paper: "#f8f5ed",
        mist: "#e8f0ec",
        ink: "#10201b"
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 24px 70px rgba(10, 24, 20, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
