#!/usr/bin/env node

/**
 * AI Commander Public Stream Launcher
 *
 * Starts the public stream with all components:
 * - Arena controller (infinite match rotation)
 * - Broadcast data bridge (real events)
 * - Live metrics HUD (real-time stats)
 * - REST API (7 endpoints)
 * - Status logging
 *
 * Usage:
 *   npm run stream:launch
 *   STREAM_PORT=5000 npm run stream:launch
 *   STREAM_MATCHES=10 npm run stream:launch
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import the stream launcher
const streamPath = join(__dirname, 'packages/zeroad-adapter/dist/stream/stream-launch.js');

try {
  const { streamLaunch } = await import(streamPath);

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   🎬 AI COMMANDER PUBLIC STREAM LAUNCH     ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Launch the stream
  await streamLaunch();
} catch (error) {
  console.error('❌ Failed to launch stream:', error);
  console.error('\nTroubleshooting:');
  console.error('1. Run from project root: cd C:\\Users\\boter\\ai-commander');
  console.error('2. Build first: npm run build');
  console.error('3. Then launch: npm run stream:launch');
  process.exit(1);
}
