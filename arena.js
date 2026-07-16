#!/usr/bin/env node

/**
 * Chess Arena Manager — Continuous match execution
 *
 * Plays chess games forever until user interrupts (Ctrl+C)
 * Randomizes players and waits between matches
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

class ChessArena {
  constructor() {
    this.config = {
      maxMovesPerGame: 500,
      moveTimeoutMs: 30000,
      matchDelayMs: 5000,
      configPath: path.join(process.cwd(), 'chess-arena-config.json'),
    };

    this.arenaState = {
      matchCount: 0,
      totalGames: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      currentMatch: null,
      startTime: Date.now(),
    };

    this.players = [];
  }

  async run() {
    try {
      // Load configuration
      this.loadConfig();

      // Initialize players
      this.initializePlayers();

      console.log('\n🏛️  Arena Started');
      console.log('   Press Ctrl+C to stop\n');

      // Main game loop
      let matchNumber = 1;
      while (true) {
        try {
          console.log('─'.repeat(60));
          console.log(`Match #${matchNumber}`);
          console.log('─'.repeat(60));

          // Select random players
          const { white, black } = this.selectPlayers();
          console.log(`${white.name} (White) vs ${black.name} (Black)\n`);

          // Play game (simplified - just announce for now)
          const result = await this.simulateGame(white, black, matchNumber);

          // Display result
          this.displayResult(result, white, black);

          // Update stats
          this.updateStats(result);

          // Wait before next match
          if (matchNumber < 999) {
            // Don't wait after last match in a session
            await this.waitForNextMatch();
          }

          matchNumber++;
        } catch (error) {
          console.error(`\n❌ Match error: ${error.message}`);
          console.log('   Resuming in 10 seconds...\n');
          await this.delay(10000);
        }
      }
    } catch (error) {
      console.error(`\n❌ Arena fatal error: ${error.message}\n`);
      process.exit(1);
    }
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.config.configPath)) {
        throw new Error(`Config file not found: ${this.config.configPath}`);
      }

      const content = fs.readFileSync(this.config.configPath, 'utf-8');
      const config = JSON.parse(content);

      if (!config.players || config.players.length < 2) {
        throw new Error('Config must have at least 2 players');
      }

      this.config = { ...this.config, ...config };
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  initializePlayers() {
    if (!this.config.players) {
      throw new Error('No players configured');
    }

    this.players = this.config.players.map((p) => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      model: p.model,
      elo: p.elo || 1500,
      wins: 0,
      losses: 0,
      draws: 0,
    }));
  }

  selectPlayers() {
    // For now, select first two players
    // TODO: Randomize in Story 61.3
    const white = this.players[0];
    const black = this.players[this.players.length > 1 ? 1 : 0];

    if (!white || !black) {
      throw new Error('Not enough players configured');
    }

    return { white, black };
  }

  async simulateGame(white, black, matchNumber) {
    // This is a placeholder for actual game execution
    // In a real implementation, this would:
    // 1. Create a ChessAdapter session
    // 2. Create Brain instances for each player
    // 3. Run ChessGameLoop
    // 4. Return result with moves

    // For now, simulate a game with random result
    const moves = this.generateRandomMoves();
    const results = ['white-win', 'black-win', 'draw'];
    const result = results[Math.floor(Math.random() * results.length)];

    // Simulate game duration
    const gameDurationMs = Math.random() * 30000 + 5000; // 5-35 seconds
    await this.delay(Math.min(gameDurationMs, 2000)); // Cap at 2 seconds for demo

    return {
      matchNumber,
      white: white.name,
      black: black.name,
      result,
      moves,
      movesCount: moves.length,
      durationMs: gameDurationMs,
    };
  }

  generateRandomMoves() {
    const moveCount = Math.floor(Math.random() * 60) + 10; // 10-70 moves
    const moves = [];

    const chessMoves = [
      'e2-e4', 'e7-e5', 'g1-f3', 'b8-c6',
      'f1-b5', 'a7-a6', 'b5-a4', 'g8-f6',
      'e1-g1', 'f8-e7', 'f1-e1', 'b7-b5',
      'a4-b3', 'd7-d6', 'd2-d3', 'c8-g4',
    ];

    for (let i = 0; i < moveCount; i++) {
      moves.push(chessMoves[i % chessMoves.length]);
    }

    return moves;
  }

  displayResult(result, white, black) {
    const resultText =
      result.result === 'white-win' ? `${white.name} wins` :
      result.result === 'black-win' ? `${black.name} wins` :
      'Draw';

    console.log(`\n✅ Game Over`);
    console.log(`   Result: ${resultText}`);
    console.log(`   Moves: ${result.movesCount}`);
    console.log(`   Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log();
  }

  updateStats(result) {
    this.arenaState.totalGames++;

    if (result.result === 'white-win') {
      this.arenaState.whiteWins++;
    } else if (result.result === 'black-win') {
      this.arenaState.blackWins++;
    } else {
      this.arenaState.draws++;
    }

    // Update player records
    const white = this.players.find((p) => p.name === result.white);
    const black = this.players.find((p) => p.name === result.black);

    if (white && black) {
      if (result.result === 'white-win') {
        white.wins++;
        black.losses++;
      } else if (result.result === 'black-win') {
        black.wins++;
        white.losses++;
      } else {
        white.draws++;
        black.draws++;
      }
    }
  }

  displayStats() {
    console.log('\n📊 Arena Statistics');
    console.log('─'.repeat(40));
    console.log(`Total Games: ${this.arenaState.totalGames}`);
    console.log(`White Wins: ${this.arenaState.whiteWins}`);
    console.log(`Black Wins: ${this.arenaState.blackWins}`);
    console.log(`Draws: ${this.arenaState.draws}`);

    const elapsed = Date.now() - this.arenaState.startTime;
    console.log(`Elapsed Time: ${(elapsed / 1000 / 60).toFixed(1)} minutes`);

    console.log('\nPlayer Records:');
    for (const player of this.players) {
      const record = `${player.wins}-${player.losses}-${player.draws}`;
      console.log(`  ${player.name}: ${record}`);
    }
  }

  async waitForNextMatch() {
    const delaySeconds = this.config.matchDelayMs / 1000;

    for (let i = delaySeconds; i > 0; i--) {
      process.stdout.write(`\r⏳ Next match in ${i}s    `);
      await this.delay(1000);
    }

    process.stdout.write('\r' + ' '.repeat(35) + '\n');
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { ChessArena };
