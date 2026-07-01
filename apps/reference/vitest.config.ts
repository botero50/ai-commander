import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@ai-commander/core': path.resolve(__dirname, '../../packages/core/src'),
      '@ai-commander/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@ai-commander/adapter': path.resolve(__dirname, '../../packages/adapter/src'),
      '@ai-commander/engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@ai-commander/goals': path.resolve(__dirname, '../../packages/goals/src'),
      '@ai-commander/planner': path.resolve(__dirname, '../../packages/planner/src'),
      '@ai-commander/decision': path.resolve(__dirname, '../../packages/decision/src'),
      '@ai-commander/agent-runtime': path.resolve(__dirname, '../../packages/agent-runtime/src'),
      '@ai-commander/fake-game-adapter': path.resolve(__dirname, '../../packages/fake-game-adapter/src'),
      '@ai-commander/behavior-tree': path.resolve(__dirname, '../../packages/behavior-tree/src'),
    },
  },
});
