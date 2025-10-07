/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        psr: {
          primary: "#1E2A38",   // navy industrial
          accent: "#F9A825",    // yellow accent
          sky: "#E6F6FF",       // soft sky background (right panel)
          surface: "#FFFFFF",
          muted: "#B7C0CC",
        },
      },
      borderRadius: {
        xl: "0.75rem"
      }
    },
  },
  plugins: [],
};
