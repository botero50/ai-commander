#!/usr/bin/env node

/**
 * Chess Arena — AI Research Platform
 *
 * Autonomous continuous chess tournament system.
 * Plays real games forever, tracks statistics, enables experimentation.
 *
 * EPIC 72: Continuous Arena
 * Story 72.1: Continuous Match Loop
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RealChessGame } from './real-chess-game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ChessArena {
  constructor() {
    // Configuration
    this.config = {
      maxMovesPerGame: 500,
      moveTimeoutMs: 30000,
      matchDelayMs: parseInt(process.env.MATCH_RESTART_DELAY_MS) || 2000,
      ollamaRetryCount: parseInt(process.env.OLLAMA_RETRY_COUNT) || 5,
      ollamaRetryDelayMs: parseInt(process.env.OLLAMA_RETRY_DELAY_MS) || 2000,
      statsFile: process.env.STATISTICS_PERSIST_FILE || 'arena-statistics.json',
    };

    // Arena state
    this.state = {
      matchCount: 0,
      totalGames: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      startTime: Date.now(),
      gameHistory: [],
      maxHistorySize: 100,
      totalMoves: 0,
      totalDurationMs: 0,
      illegalMoveRetries: 0,
      resignations: 0,
    };

    // AI players
    this.players = [
      {
        id: 'p1',
        name: process.env.BRAIN_P1 || 'ollama:tinyllama',
        provider: 'ollama',
        model: (process.env.BRAIN_P1 || 'ollama:tinyllama').split(':')[1],
      },
      {
        id: 'p2',
        name: process.env.BRAIN_P2 || 'ollama:mistral',
        provider: 'ollama',
        model: (process.env.BRAIN_P2 || 'ollama:mistral').split(':')[1],
      },
    ];

    this.lastMatchConfig = null;
  }

  /**
   * Main arena loop — runs forever
   */
  async run() {
    try {
      this.displayStartup();

      // Graceful shutdown
      process.on('SIGINT', () => this.shutdown());

      // Main loop
      let matchNumber = 1;
      while (true) {
        try {
          this.state.matchCount = matchNumber;
          this.state.totalGames++;

          // Verify Ollama is available
          await this.ensureOllamaAvailable();

          // Select random players
          const matchConfig = this.selectPlayers();

          // Display match header
          this.displayMatchHeader(matchNumber, matchConfig);

          // Play game
          const result = await this.playGame(matchConfig);

          // Record result
          this.recordGameResult(result, matchConfig);

          // Display result
          this.displayResult(result, matchConfig);

          // Display current statistics
          this.displayStatistics();

          // Countdown to next match
          if (matchNumber < 999) {
            await this.countdownToNextMatch();
          }

          matchNumber++;
        } catch (error) {
          console.error(`\n❌ Match ${this.state.matchCount} error: ${error.message}`);
          console.log('   Retrying in 10 seconds...\n');
          await this.delay(10000);
        }
      }
    } catch (error) {
      console.error(`\n❌ Arena fatal error: ${error.message}\n`);
      await this.shutdown();
    }
  }

  /**
   * Select random player pair
   * Story 72.2: Random Player Assignment
   */
  selectPlayers() {
    let matchConfig = null;
    let attempts = 0;

    // Ensure different players than last match
    do {
      const whiteIdx = Math.floor(Math.random() * this.players.length);
      const blackIdx = Math.floor(Math.random() * this.players.length);

      matchConfig = {
        white: {
          ...this.players[whiteIdx],
          side: 'white',
        },
        black: {
          ...this.players[blackIdx],
          side: 'black',
        },
      };

      attempts++;
    } while (
      this.lastMatchConfig &&
      attempts < 10 &&
      this.configSame(matchConfig, this.lastMatchConfig)
    );

    this.lastMatchConfig = matchConfig;
    return matchConfig;
  }

  configSame(config1, config2) {
    return (
      config1.white.model === config2.white.model &&
      config1.black.model === config2.black.model
    );
  }

  /**
   * Play a complete chess game
   */
  async playGame(matchConfig) {
    const game = new RealChessGame(matchConfig);
    const startTime = Date.now();

    console.log('');
    const result = await game.play();

    return {
      ...result,
      durationMs: Date.now() - startTime,
      whiteModel: matchConfig.white.model,
      blackModel: matchConfig.black.model,
    };
  }

  /**
   * Record game result for statistics
   * Story 72.3: Arena Statistics
   */
  recordGameResult(result, matchConfig) {
    // Update counters
    if (result.result === 'white-win') {
      this.state.whiteWins++;
    } else if (result.result === 'black-win') {
      this.state.blackWins++;
    } else if (result.result === 'draw') {
      this.state.draws++;
    }

    // Update aggregate metrics
    this.state.totalMoves += result.moveCount;
    this.state.totalDurationMs += result.durationMs;
    this.state.illegalMoveRetries += result.illegalMoveRetries || 0;

    // Add to history
    const gameRecord = {
      gameNumber: this.state.totalGames,
      white: matchConfig.white.model,
      black: matchConfig.black.model,
      result: result.result,
      moves: result.moveCount,
      durationSec: Math.round(result.durationMs / 1000),
      timestamp: Date.now(),
    };

    this.state.gameHistory.push(gameRecord);
    if (this.state.gameHistory.length > this.state.maxHistorySize) {
      this.state.gameHistory.shift();
    }

    // Persist statistics
    this.persistStatistics();
  }

  /**
   * Verify Ollama is running
   * Story 72.4: Fault Recovery
   */
  async ensureOllamaAvailable() {
    const maxRetries = this.config.ollamaRetryCount;
    const retryDelayMs = this.config.ollamaRetryDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('http://localhost:11434/api/version');
        if (response.ok) {
          return; // Available
        }
      } catch (error) {
        // Not available yet
      }

      if (attempt < maxRetries) {
        console.log(`⚠️  Ollama unavailable (retry ${attempt}/${maxRetries})`);
        await this.delay(retryDelayMs);
      }
    }

    throw new Error('Ollama unavailable after retries');
  }

  /**
   * Persist statistics to JSON
   * Story 72.3: Arena Statistics
   */
  persistStatistics() {
    try {
      // Calculate derived metrics
      const uptime = Math.floor((Date.now() - this.state.startTime) / 1000);
      const uptimeHours = uptime / 3600;
      const avgMoves = this.state.totalGames > 0 ? Math.round(this.state.totalMoves / this.state.totalGames) : 0;
      const avgDurationSec = this.state.totalGames > 0 ? Math.round(this.state.totalDurationMs / this.state.totalGames / 1000) : 0;
      const gamesPerHour = uptimeHours > 0 ? Math.round((this.state.totalGames / uptimeHours) * 100) / 100 : 0;

      const stats = {
        timestamp: new Date().toISOString(),
        // Story 72.3 acceptance criteria
        gamesPlayed: this.state.totalGames,
        wins: this.state.whiteWins + this.state.blackWins,
        losses: this.state.whiteWins + this.state.blackWins,
        draws: this.state.draws,
        averageMoves: avgMoves,
        averageDurationSec: avgDurationSec,
        gamesPerHour,
        resignations: this.state.resignations,
        illegalMoveRetries: this.state.illegalMoveRetries,
        // Breakdown
        whiteWins: this.state.whiteWins,
        blackWins: this.state.blackWins,
        uptime,
        uptimeHours: Math.round(uptimeHours * 100) / 100,
        // Recent games for debugging
        recentGames: this.state.gameHistory.slice(-20),
      };

      fs.writeFileSync(
        this.config.statsFile,
        JSON.stringify(stats, null, 2)
      );
    } catch (error) {
      console.error(`Failed to save stats: ${error.message}`);
    }
  }

  /**
   * Display methods
   */

  displayStartup() {
    console.clear();
    console.log('╔════════════════════════════════════════╗');
    console.log('║   AI Commander Chess Arena            ║');
    console.log('║   Research & Experimentation Platform  ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log(`White (Player 1): ${this.players[0].model}`);
    console.log(`Black (Player 2): ${this.players[1].model}`);
    console.log(`Match restart delay: ${this.config.matchDelayMs}ms`);
    console.log('');
    console.log('Arena starting... press Ctrl+C to stop\n');
  }

  displayMatchHeader(matchNumber, matchConfig) {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`Match ${matchNumber}: ${matchConfig.white.model} vs ${matchConfig.black.model}`);
    console.log(`${'═'.repeat(50)}`);
  }

  displayResult(result, matchConfig) {
    const resultText =
      result.result === 'white-win' ? `${matchConfig.white.model} wins` :
      result.result === 'black-win' ? `${matchConfig.black.model} wins` :
      'Draw';

    console.log(`\n✅ Game finished: ${resultText}`);
    console.log(`   Moves: ${result.moveCount} | Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  }

  displayStatistics() {
    const totalTime = (Date.now() - this.state.startTime) / 1000;
    const gamesPerHour = totalTime > 0 ? Math.round((this.state.totalGames / totalTime) * 3600) : 0;
    const avgMoves = this.state.totalGames > 0 ? Math.round(this.state.totalMoves / this.state.totalGames) : 0;
    const avgDurationSec = this.state.totalGames > 0 ? Math.round(this.state.totalDurationMs / this.state.totalGames / 1000) : 0;

    console.log(`\n📊 Arena Statistics`);
    console.log(`   Total Games: ${this.state.totalGames}`);
    console.log(`   Results: W:${this.state.whiteWins} B:${this.state.blackWins} D:${this.state.draws}`);
    console.log(`   Avg Moves: ${avgMoves} | Avg Duration: ${avgDurationSec}s | Rate: ${gamesPerHour}/hour`);
  }

  async countdownToNextMatch() {
    const delaySeconds = Math.ceil(this.config.matchDelayMs / 1000);
    for (let i = delaySeconds; i > 0; i--) {
      process.stdout.write(`\r⏳ Next match in ${i}s   `);
      await this.delay(1000);
    }
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
  }

  async shutdown() {
    console.log('\n\n🛑 Shutting down gracefully...');
    this.persistStatistics();
    console.log(`📊 Final stats saved to ${this.config.statsFile}`);
    console.log('✅ Arena shutdown complete\n');
    process.exit(0);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run the arena
const arena = new ChessArena();
arena.run().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
