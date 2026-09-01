import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './types/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 0 0 1px rgba(255,255,255,0.04), 0 18px 48px rgba(0,0,0,0.45)',
      },
      colors: {
        border: '#27272a',
        input: '#18181b',
        ring: '#10b981',
        background: '#09090b',
        foreground: '#f4f4f5',
        primary: {
          DEFAULT: '#10b981',
          foreground: '#052e2b',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
