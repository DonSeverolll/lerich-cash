import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './types/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 0 0 1px rgba(212,175,55,0.08), 0 18px 48px rgba(0,0,0,0.65)',
        gold: '0 10px 30px -10px rgba(212,175,55,0.45)',
      },
      colors: {
        border: '#241f14',
        input: '#0d0b07',
        ring: '#d4af37',
        background: '#050505',
        foreground: '#f6f1e4',
        gold: {
          50: '#fdf9ec',
          100: '#faf0cf',
          200: '#f2e0a0',
          300: '#e9cb6d',
          400: '#dcb648',
          500: '#d4af37',
          600: '#b8912a',
          700: '#936e23',
          800: '#795924',
          900: '#674b24',
        },
        onyx: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#1a1814',
          900: '#12100c',
          950: '#050505',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
