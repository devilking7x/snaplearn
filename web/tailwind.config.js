/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f0a1e',
        grape: '#2a1b4e',
        plum: '#7c3aed',
        blush: '#ec4899',
      },
    }
  },
  plugins: []
};
