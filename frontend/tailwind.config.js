/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          page: "#f8f8f6",
          rail: "#f6f7f4",
          line: "#dbe1ea",
        },
      },
      boxShadow: {
        "elev-sm": "0 8px 18px rgba(15,23,42,0.12)",
        "elev-md": "0 8px 20px rgba(15,23,42,0.14)",
        "elev-lg": "0 10px 26px rgba(15,23,42,0.14)",
        "elev-xl": "0 20px 45px rgba(15,23,42,0.12)",
      },
    },
  },
  plugins: [],
};
