/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "ca-2xs": ["0.6875rem", "1rem"],
        "ca-xs": ["0.75rem", "1.1rem"],
        "ca-sm": ["0.875rem", "1.35rem"],
      },
    },
  },
  plugins: [],
};
