import type { Config } from 'tailwindcss';

/**
 * As cores apontam para variáveis CSS que guardam apenas os canais RGB
 * (`212 175 55`). Isso permite que o Tailwind continue aplicando opacidade
 * (`border-gold-500/20`) e, ao mesmo tempo, que o tema claro redefina a
 * paleta inteira em `globals.css` sem tocar em nenhum componente.
 */
const canal = (nome: string) => `rgb(var(--${nome}) / <alpha-value>)`;

const escala = (prefixo: string, tons: number[]) =>
  Object.fromEntries(tons.map((tom) => [tom, canal(`${prefixo}-${tom}`)]));

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './types/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 0 0 1px rgb(var(--gold-500) / 0.08), 0 18px 48px rgb(var(--sombra) / 0.65)',
        gold: '0 10px 30px -10px rgb(var(--gold-500) / 0.45)',
      },
      colors: {
        border: canal('borda'),
        input: canal('campo'),
        ring: canal('gold-500'),
        background: canal('fundo'),
        foreground: canal('texto'),
        gold: escala('gold', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        onyx: escala('onyx', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        // Tons de estado: sobrescrevem os fixos do Tailwind para acompanharem
        // o tema. Sem isso, `text-rose-300` fica ilegível no modo claro.
        emerald: escala('emerald', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        rose: escala('rose', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        // Aviso em prata, no lugar do âmbar: o amarelo saiu da identidade.
        aviso: escala('aviso', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        // Preenchimento sólido do acento (botão primário, avatares). Separado
        // da escala `gold` porque no tema claro a escala é espelhada.
        acento: { de: canal('acento-de'), para: canal('acento-para') },
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
