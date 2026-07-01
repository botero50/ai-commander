import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ai-commander/core': path.resolve(__dirname, '../packages/core/dist/index.js'),
      '@ai-commander/domain': path.resolve(__dirname, '../packages/domain/dist/index.js'),
      '@ai-commander/ecs': path.resolve(__dirname, '../packages/ecs/dist/index.js'),
      '@ai-commander/engine': path.resolve(__dirname, '../packages/engine/dist/index.js'),
      '@ai-commander/goals': path.resolve(__dirname, '../packages/goals/dist/index.js'),
      '@ai-commander/planner': path.resolve(__dirname, '../packages/planner/dist/index.js'),
      '@ai-commander/decision': path.resolve(__dirname, '../packages/decision/dist/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
