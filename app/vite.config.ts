import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works at any path (GitHub Pages project sites included).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
} as never);
