/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          cream: "#EDE7DD",
          beige: "#E8DFD2",
          stone: "#D9D0C0",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Didot", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
