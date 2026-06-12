/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef3ff',
          100: '#dce6ff',
          200: '#b9cdff',
          300: '#87a9ff',
          400: '#547eff',
          500: '#2d56f5',
          600: '#1a3eeb',
          700: '#172fd8',
          800: '#1828af',
          900: '#192689',
          950: '#111654',
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
