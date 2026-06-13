/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8f4ff',
          100: '#cce5ff',
          200: '#99caff',
          300: '#66afff',
          400: '#3394ff',
          500: '#0a7aff',
          600: '#007AFF',
          700: '#0062cc',
          800: '#004a99',
          900: '#003166',
          950: '#001f40',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)',
        'card-hover':'0 4px 12px 0 rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)',
        'soft':     '0 2px 8px 0 rgba(0,0,0,0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
