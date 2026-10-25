import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Проект публикуется как https://kirilltolich.github.io/vkal/,
// поэтому все URL ассетов должны начинаться с /vkal/.
export default defineConfig({
  base: '/vkal/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
