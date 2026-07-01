#!/usr/bin/env node

import('./reference-cli.js').catch((error) => {
  console.error('Failed to load CLI:', error);
  process.exit(1);
});
