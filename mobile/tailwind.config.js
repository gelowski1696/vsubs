/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#edf7f2',
          500: '#1f7a53',
          700: '#14563a'
        }
      }
    }
  },
  plugins: []
};