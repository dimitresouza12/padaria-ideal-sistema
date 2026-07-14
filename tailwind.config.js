/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Padaria Premium" — creme, café profundo e trigo/dourado fosco
        plane: '#faf8f5',
        surface: '#ffffff',
        // muted escurecido de #9c8e7d para #786a5a: o tom original tinha
        // contraste de só 3.0:1 sobre plane/surface (abaixo do mínimo AA de
        // 4.5:1 para texto normal) — usado em rótulos pequenos por toda a UI.
        ink: { DEFAULT: '#2e2520', soft: '#6b5d4f', muted: '#786a5a' },
        line: { DEFAULT: '#ece4d8', strong: '#ddd1c0' },
        accent: { DEFAULT: '#8c6239', dark: '#6f4c2a', wash: '#f3ebdb' },
        gold: { DEFAULT: '#c5a059', soft: '#e6d4ac' },
        good: { DEFAULT: '#0f7a2e', tint: '#e7f2e7' },
        bad: { DEFAULT: '#b3261e', strong: '#c23a2c', tint: '#f7e7e2' },
        warn: { DEFAULT: '#8a5a00', tint: '#f6ecd5' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(46,37,32,.05), 0 2px 6px rgba(46,37,32,.05)',
        cardlg: '0 1px 2px rgba(46,37,32,.05), 0 12px 40px rgba(46,37,32,.10)',
      },
    },
  },
  plugins: [],
};
