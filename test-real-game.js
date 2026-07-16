#!/usr/bin/env node

import { RealChessGame } from './real-chess-game.js';
import { BroadcastService } from './broadcast-service.js';

async function test() {
  const broadcast = new BroadcastService({});

  const matchConfig = {
    white: {
      name: 'Player1',
      provider: 'ollama',
      model: 'mistral',
      temperature: 0.5,
    },
    black: {
      name: 'Player2',
      provider: 'ollama',
      model: 'neural-chat',
      temperature: 0.5,
    },
  };

  console.log('\n🎮 Testing Real Chess Game Execution\n');

  const game = new RealChessGame(matchConfig, broadcast, null);
  const result = await game.play();

  console.log('\n✅ Game Complete');
  console.log(`Moves: ${result.moveCount}`);
  console.log(`Result: ${result.result}`);
  console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`\nGame PGN:\n${result.pgn}`);
}

test().catch(console.error);
