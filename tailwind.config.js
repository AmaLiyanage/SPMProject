/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app.tsx", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pink: {
          50:  "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899", // main
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
        primary: "#ec4899",   // Pink 500
        secondary: "#f472b6", // Pink 400
      },
    },
  },
  plugins: [],
}
