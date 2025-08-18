/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",  
    "./index.{js,jsx,ts,tsx}",     
    "./components/**/*.{js,jsx,ts,tsx}", 
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        /* ---------- Brand / Primary ---------- */
        brand: {
          purple: "#6A1B9A",   // Primary purple – buttons, icons, progress active
          pink: "#D81B60",     // Accent pink – gradients, highlights
          gold: "#FBC02D",     // Gold – "Get Started" button
          goldLight: "#FFEB3B",// Light gold – logo gradient text
          purpleAccent: "#8E24AA", // Accent purple – icons, emphasis
        },

        /* ---------- Backgrounds ---------- */
        background: {
          lightPink: "#FCEAF1",   // Default screen background
          lightAlt: "#FCEFF8",    // Alternate background
          white: "#FFFFFF",       // Cards, forms, inputs
        },

        /* ---------- Text ---------- */
        text: {
          primary: "#212121",     // Headings
          secondary: "#616161",   // Descriptions
          inverse: "#FFFFFF",     // On dark backgrounds / buttons
        },

        /* ---------- Tags / Chips ---------- */
        tag: {
          pink: "#F8BBD0",        // STEM, empowerment
          peach: "#FFCC80",       // Leadership, career
          lavender: "#E1BEE7",    // Mentorship, technology
          teal: "#80DEEA",        // Diversity, global
        },

        /* ---------- Borders & States ---------- */
        state: {
          border: "#E0E0E0",      // Input outlines, dividers
          progressActive: "#8E24AA",   // Active progress bar
          progressInactive: "#E1BEE7", // Inactive progress bar
          calendarSelected: "#F06292", // Selected date in calendar
        },
      },
    },
  },
  plugins: [],
};
