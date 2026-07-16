/**
 * Direct test runner for aggregator tests using vitest's test registry
 */

import { describe, it, expect } from 'vitest';

// Import the test file to trigger test registration
import('./src/results-aggregator.test.js').then(() => {
  console.log('Tests loaded');
}).catch(err => {
  console.error('Failed to load tests:', err);
  process.exit(1);
});
