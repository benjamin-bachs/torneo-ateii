/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#122A20',
        pitchdeep: '#0B1D16',
        chalk: '#F4F2E8',
        lime: '#D7FF3F',
        amber: '#F2A93B',
        line: '#2C4B3B',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
