import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ai-commander/planner': path.resolve(__dirname, '../planner/dist/index.js'),
      '@ai-commander/goals': path.resolve(__dirname, '../goals/dist/index.js'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/dist/index.js'),
      '@ai-commander/core': path.resolve(__dirname, '../core/dist/index.js'),
      '@ai-commander/engine': path.resolve(__dirname, '../engine/dist/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
