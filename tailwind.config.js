/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#154e30',
          light: '#1d6840',
          50: '#edf4f0',
        },
        accent: {
          DEFAULT: '#c97c1a',
          light: '#fdf3e7',
        },
        danger: '#dc2626',
        success: '#16a34a',
        ground: '#f5f5f3',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['1.0625rem', { lineHeight: '1.5' }],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
