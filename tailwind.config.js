/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#0A0A0A',
        card: '#111111',
        border: '#222222',
        borderHover: '#333333',
        text: '#FFFFFF',
        textSecondary: '#888888',
        accent: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '6px',
        'btn': '4px',
        'modal': '8px',
      },
      transitionDuration: {
        '150': '150ms',
      },
      transitionTimingFunction: {
        'ease': 'ease',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease',
        'scale-in': 'scaleIn 200ms ease',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
