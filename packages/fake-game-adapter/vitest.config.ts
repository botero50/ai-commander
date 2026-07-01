import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ai-commander/adapter': path.resolve(__dirname, '../adapter/src/index.ts'),
      '@ai-commander/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/src/index.ts'),
      '@ai-commander/ecs': path.resolve(__dirname, '../ecs/src/index.ts'),
      '@ai-commander/engine': path.resolve(__dirname, '../engine/src/index.ts'),
      '@ai-commander/decision': path.resolve(__dirname, '../decision/src/index.ts'),
      '@ai-commander/goals': path.resolve(__dirname, '../goals/src/index.ts'),
      '@ai-commander/planner': path.resolve(__dirname, '../planner/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
