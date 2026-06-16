/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0f2a43",
        teal: { DEFAULT: "#0e9f8a", light: "#e3f6f2" },
      },
    },
  },
  plugins: [],
};
