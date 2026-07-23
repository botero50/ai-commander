#!/usr/bin/env node

/**
 * EPIC 72 Integration Verification
 *
 * Checks all backend and frontend components are correctly integrated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const checks = [];

function checkFile(name, filePath, requiredStrings) {
  if (!fs.existsSync(filePath)) {
    checks.push({ name, status: '❌ MISSING', detail: filePath });
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const missing = requiredStrings.filter(s => !content.includes(s));

  if (missing.length > 0) {
    checks.push({
      name,
      status: '⚠️  INCOMPLETE',
      detail: `Missing: ${missing.join(', ')}`
    });
    return false;
  }

  checks.push({ name, status: '✅ INTEGRATED', detail: filePath });
  return true;
}

console.log('\n🔍 EPIC 72 Integration Verification\n');
console.log('Checking backend components...\n');

// Check WebSocket Server
checkFile(
  'WebSocket Server',
  path.join(__dirname, 'websocket-server.js'),
  [
    'class WebSocketServer',
    'emitGameStarted',
    'emitMovePlayed',
    'emitGameFinished',
    'emitArenaStatisticsUpdated',
    'broadcast('
  ]
);

// Check Arena
checkFile(
  'Arena Integration',
  path.join(__dirname, 'arena.js'),
  [
    'import { WebSocketServer }',
    'this.wsServer = new WebSocketServer',
    'await this.wsServer.start()',
    'this.wsServer.emitGameStarted',
    'this.wsServer.emitGameFinished'
  ]
);

// Check RealChessGame
checkFile(
  'Chess Game WebSocket Events',
  path.join(__dirname, 'real-chess-game.js'),
  [
    'this.wsServer = wsServer',
    'this.wsServer.emitMovePlayed',
    'this.wsServer.emitCommentaryGenerated'
  ]
);

console.log('Checking frontend components...\n');

// Check React Component
checkFile(
  'ChessSpectator Component',
  path.join(__dirname, 'apps/web/src/components/ChessSpectator/ChessSpectator.tsx'),
  [
    'useWebSocket',
    'Chessboard',
    'gameState.fen',
    'Move History',
    'Captured Pieces',
    'arena-statistics',
    'health-status'
  ]
);

// Check WebSocket Hook
checkFile(
  'useWebSocket Hook',
  path.join(__dirname, 'apps/web/src/hooks/useWebSocket.ts'),
  [
    'export function useWebSocket',
    'case \'GameStarted\'',
    'case \'MovePlayed\'',
    'case \'GameFinished\'',
    'new WebSocket',
    'Math.pow(2, reconnectAttemptsRef.current)',
    'setMessages'
  ]
);

// Check CSS
checkFile(
  'Spectator CSS Styling',
  path.join(__dirname, 'apps/web/src/components/ChessSpectator/ChessSpectator.css'),
  [
    '.chess-spectator',
    '.chessboard-container',
    '.move-history',
    '.commentary-section',
    '.arena-statistics',
    '.health-status',
    '.match-restart-countdown'
  ]
);

// Check App.tsx integration
checkFile(
  'App Entry Point',
  path.join(__dirname, 'apps/web/src/App.tsx'),
  [
    'ChessSpectator',
    'import { ChessSpectator }'
  ]
);

console.log('\nVerification Results\n');
console.log('─'.repeat(60));

checks.forEach((check, i) => {
  const icon = check.status.includes('✅') ? '✅' : check.status.includes('❌') ? '❌' : '⚠️ ';
  console.log(`${icon} ${check.name.padEnd(30)} ${check.status}`);
  if (check.detail && !check.status.includes('✅')) {
    console.log(`  └─ ${check.detail}`);
  }
});

console.log('─'.repeat(60));

const passed = checks.filter(c => c.status.includes('✅')).length;
const total = checks.length;

console.log(`\n${passed}/${total} checks passed\n`);

if (passed === total) {
  console.log('🎉 All integration checks passed!\n');
  console.log('Next steps:');
  console.log('1. Start Ollama:          ollama serve');
  console.log('2. Start Arena:           pnpm chess');
  console.log('3. Start Web Dev Server:  cd apps/web && npm run dev');
  console.log('4. Open Browser:          http://localhost:5173');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Review the details above.\n');
  process.exit(1);
}
