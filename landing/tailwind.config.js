/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f7a4d',
          dark: '#0b5c3a',
          soft: '#dcefe3',
        },
        whatsapp: '#25D366',
        ground: '#f5f6f2',
        ink: {
          DEFAULT: '#161d18',
          muted: '#5c675e',
          faint: '#869089',
        },
        line: '#e2e5dd',
      },
      fontFamily: {
        sans: [
          'system-ui', '-apple-system', 'Segoe UI', 'Roboto',
          'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
}
