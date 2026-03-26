/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#FF2E95',
          cyan: '#00D1D1',
          yellow: '#FFD700',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
