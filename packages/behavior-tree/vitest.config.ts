import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@ai-commander/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@ai-commander/domain': path.resolve(__dirname, '../domain/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
