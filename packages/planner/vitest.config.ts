import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@ai-commander/planner': path.resolve(__dirname, './src'),
      '@ai-commander/core': path.resolve(__dirname, '../core/src'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/src'),
      '@ai-commander/engine': path.resolve(__dirname, '../engine/src'),
      '@ai-commander/decision': path.resolve(__dirname, '../decision/src'),
      '@ai-commander/goals': path.resolve(__dirname, '../goals/src'),
    },
  },
});
