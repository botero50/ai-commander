import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@ai-commander/contracts': path.resolve(__dirname, '../contracts/src'),
      '@ai-commander/brain': path.resolve(__dirname, '../brain/src'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/src'),
      '@ai-commander/adapter': path.resolve(__dirname, '../adapter/src'),
    },
  },
});
