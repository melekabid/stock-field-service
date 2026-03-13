import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#eef2ff',
        sand: '#f8fafc',
        signal: '#0f766e',
        ember: '#c2410c',
      },
    },
  },
  plugins: [],
} satisfies Config;
