import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@ai-commander/core': path.resolve(__dirname, '../core/src'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/src'),
      '@ai-commander/adapter': path.resolve(__dirname, '../adapter/src'),
      '@ai-commander/engine': path.resolve(__dirname, '../engine/src'),
      '@ai-commander/goals': path.resolve(__dirname, '../goals/src'),
      '@ai-commander/planner': path.resolve(__dirname, '../planner/src'),
      '@ai-commander/decision': path.resolve(__dirname, '../decision/src'),
      '@ai-commander/fake-game-adapter': path.resolve(__dirname, '../fake-game-adapter/src'),
    },
  },
});
