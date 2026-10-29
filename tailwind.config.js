/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: '#eafff0',
          100: '#ccffe0',
          200: '#a6ffc4',
          300: '#66ff9c',
          400: '#22ff66',
          500: '#00e64d',
          600: '#00b33b',
          700: '#00802b',
          800: '#004d1a',
          900: '#003311',
        },
        ink: {
          50: '#f5f7fa',
          100: '#e4e8ee',
          200: '#c6cdd8',
          300: '#9aa3b2',
          400: '#6b7585',
          500: '#4a5466',
          600: '#364152',
          700: '#27303e',
          800: '#1a212c',
          900: '#121821',
          950: '#0a0f16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(0, 230, 77, 0.35)',
        'neon-sm': '0 0 10px rgba(0, 230, 77, 0.25)',
        'neon-lg': '0 0 40px rgba(0, 230, 77, 0.45)',
        card: '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'ticker': 'ticker 40s linear infinite',
      },
    },
  },
  plugins: [],
};
