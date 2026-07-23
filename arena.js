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

import 'dotenv/config.js'; // Load .env file
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { RealChessGame } from './real-chess-game.js';
import { OpeningTracker } from './opening-tracker.js';
import { getGameEventBus } from './game-event-bus.js';
import { ArenaResearchIntegration } from './arena-research-integration.js';
import {
  startBroadcastServer,
  stopBroadcastServer,
  broadcastGameStart,
  broadcastMove,
  broadcastGameFinish,
  getClientCount,
} from './broadcast-server.js';

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
      // Story 72.2: Recovery tracking
      ollamaTimeouts: 0,
      ollamaCrashes: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      avgDecisionLatency: 0,
      totalDecisionLatency: 0,
    };

    // AI players - Extract model correctly (handles colons in model names like dolphin-mixtral:8x7b)
    const extractModel = (brainString) => {
      const parts = brainString.split(':');
      return parts.slice(1).join(':'); // Join all parts after 'ollama:', handles colons in model name
    };

    this.players = [
      {
        id: 'p1',
        name: process.env.BRAIN_P1 || 'ollama:dolphin-mixtral:8x7b',
        provider: 'ollama',
        model: extractModel(process.env.BRAIN_P1 || 'ollama:dolphin-mixtral:8x7b'),
      },
      {
        id: 'p2',
        name: process.env.BRAIN_P2 || 'ollama:mistral:latest',
        provider: 'ollama',
        model: extractModel(process.env.BRAIN_P2 || 'ollama:mistral:latest'),
      },
    ];

    // Story 73.2: Opening Diversity tracking
    this.openingTracker = new OpeningTracker();

    // EPIC 14: Research integration
    this.eventBus = getGameEventBus();
    this.research = null;  // Initialized in run()
  }

  /**
   * Main arena loop — runs forever
   */
  async run() {
    try {
      this.displayStartup();

      // EPIC 14: Initialize research integration
      try {
        const dbPath = path.join(process.cwd(), 'research.db');
        const schemaPath = path.join(process.cwd(), 'schema.sql');
        this.research = new ArenaResearchIntegration();
        await this.research.initialize(dbPath, schemaPath);

        // Start experiment (entire arena session)
        await this.research.startExperiment({
          name: `Arena Run ${new Date().toISOString()}`,
          hypothesis: 'Continuous autonomous chess research',
          git_commit: process.env.GIT_COMMIT || 'unknown',
          application_version: '1.0.0',
        });

        console.log('✅ Research integration started\n');
      } catch (researchError) {
        console.warn(`⚠️  Research integration failed: ${researchError.message}`);
        console.warn('   Arena will continue without research data collection\n');
        this.research = null;
      }

      // Start broadcast server for live game viewing
      try {
        await startBroadcastServer();
        console.log('✅ Broadcast server started\n');
      } catch (broadcastError) {
        console.warn(`⚠️  Broadcast server failed: ${broadcastError.message}`);
        console.warn('   Arena will continue without live broadcasting\n');
      }

      // Subscribe to game events for broadcasting
      this.eventBus.subscribe('game.started', (event) => {
        broadcastGameStart(event);
      });

      this.eventBus.subscribe('move.made', (event) => {
        broadcastMove(event);
      });

      this.eventBus.subscribe('game.finished', (event) => {
        broadcastGameFinish(event);
      });

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

          // EPIC 14: Start run (for research)
          if (this.research) {
            try {
              await this.research.startRun({
                run_number: matchNumber,
                config_snapshot: JSON.stringify(matchConfig),
                git_commit: process.env.GIT_COMMIT || 'unknown',
                application_version: '1.0.0',
                execution_start: Date.now(),
              }, this.getCaptureEnvironment());
            } catch (runError) {
              console.warn(`⚠️  Research run start failed: ${runError.message}`);
            }
          }

          // Play game
          const result = await this.playGame(matchConfig);

          // EPIC 14: Record game result (for research)
          if (this.research && result) {
            try {
              await this.research.recordGameResult(result, matchConfig);
            } catch (recordError) {
              console.warn(`⚠️  Research game recording failed: ${recordError.message}`);
            }
          }

          // Record result (existing statistics)
          this.recordGameResult(result, matchConfig);

          // Display result
          this.displayResult(result, matchConfig);

          // Display current statistics
          this.displayStatistics();

          // EPIC 14: Finish run (for research)
          if (this.research) {
            try {
              await this.research.finishRun('completed', 1);
            } catch (finishError) {
              console.warn(`⚠️  Research run finish failed: ${finishError.message}`);
            }
          }

          // Countdown to next match
          if (matchNumber < 999) {
            await this.countdownToNextMatch();
          }

          matchNumber++;
        } catch (error) {
          // Story 72.2: Enhanced recovery
          this.state.recoveryAttempts++;
          console.error(`\n❌ Match ${this.state.matchCount} error: ${error.message}`);

          // Categorize error
          if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            this.state.ollamaTimeouts++;
            console.log('   ⏱️  Timeout detected - waiting longer before retry (15s)\n');
            await this.delay(15000);
          } else if (error.message.includes('unavailable') || error.message.includes('ECONNREFUSED')) {
            this.state.ollamaCrashes++;
            console.log('   💥 Ollama crash/disconnect detected - attempting recovery (20s)\n');
            await this.delay(20000);
          } else {
            console.log('   🔄 Retrying in 5 seconds...\n');
            await this.delay(5000);
          }

          // Attempt recovery
          try {
            await this.ensureOllamaAvailable();
            this.state.successfulRecoveries++;
            console.log('   ✅ Arena recovered - resuming play\n');
          } catch (recoveryError) {
            console.error(`   ❌ Recovery failed: ${recoveryError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`\n❌ Arena fatal error: ${error.message}\n`);
      await this.shutdown();
    }
  }

  /**
   * Capture environment for research
   */
  getCaptureEnvironment() {
    return {
      os: process.platform,
      osVersion: os.release(),
      nodeVersion: process.version,
      cpuCores: os.cpus().length,
      ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      storageAvailableGb: 0,
      ollamaVersion: process.env.OLLAMA_VERSION || 'unknown',
    };
  }

  /**
   * Select random player pair
   * Story 72.2: Random Player Assignment
   */
  selectPlayers() {
    // Use configured players in order (BRAIN_P1 vs BRAIN_P2)
    // Don't randomize - user configured specific matchups
    const matchConfig = {
      white: {
        ...this.players[0],
        side: 'white',
      },
      black: {
        ...this.players[1],
        side: 'black',
      },
    };

    return matchConfig;
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

    // Story 73.2: Track opening diversity
    const opening = this.openingTracker.recordGame(
      result.pgn,
      result.moves,
      result.result
    );

    // Check for repetition
    const repetition = this.openingTracker.detectRepetition();
    if (repetition.isRepetitive) {
      console.log(`   ⚠️  Opening repetition: ${(repetition.frequency * 100).toFixed(0)}% same (${repetition.dominantOpening})`);
    }

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

      // Story 72.2: Calculate average decision latency
      const avgDecisionLatency = this.state.totalGames > 0
        ? Math.round(this.state.totalDecisionLatency / (this.state.totalGames * 20)) // ~20 moves per game average
        : 0;

      const stats = {
        timestamp: new Date().toISOString(),
        // Story 72.3: Expanded statistics
        gamesPlayed: this.state.totalGames,
        whiteWins: this.state.whiteWins,
        blackWins: this.state.blackWins,
        draws: this.state.draws,
        averageMoves: avgMoves,
        averageDurationSec: avgDurationSec,
        averageDecisionLatencyMs: avgDecisionLatency,
        gamesPerHour,
        illegalMoveRetries: this.state.illegalMoveRetries,
        timeoutCount: this.state.ollamaTimeouts,
        recoveryCount: this.state.successfulRecoveries,
        resignations: this.state.resignations,
        uptime,
        uptimeHours: Math.round(uptimeHours * 100) / 100,
        // Story 72.2: Recovery statistics
        totalRecoveryAttempts: this.state.recoveryAttempts,
        ollamaCrashes: this.state.ollamaCrashes,
        ollamaTimeouts: this.state.ollamaTimeouts,
        // Recent games for analysis
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
    const avgDecisionLatency = this.state.totalGames > 0
      ? Math.round(this.state.totalDecisionLatency / (this.state.totalGames * 20))
      : 0;

    console.log(`\n📊 Arena Statistics`);
    console.log(`   Total Games: ${this.state.totalGames} | Rate: ${gamesPerHour}/h | Uptime: ${(totalTime / 60).toFixed(1)}m`);
    console.log(`   Results: W:${this.state.whiteWins} B:${this.state.blackWins} D:${this.state.draws}`);
    console.log(`   Avg Moves: ${avgMoves} | Avg Duration: ${avgDurationSec}s | Avg Latency: ${avgDecisionLatency}ms`);

    // Story 72.2: Show reliability metrics
    if (this.state.recoveryAttempts > 0) {
      const recoveryRate = this.state.successfulRecoveries > 0
        ? (this.state.successfulRecoveries / this.state.recoveryAttempts * 100).toFixed(1)
        : 0;
      console.log(`   Reliability: ${this.state.successfulRecoveries}/${this.state.recoveryAttempts} recoveries (${recoveryRate}%)`);
    }

    // Story 72.3: Show error counts
    if (this.state.illegalMoveRetries > 0 || this.state.ollamaTimeouts > 0) {
      console.log(`   Errors: ${this.state.illegalMoveRetries} illegal moves | ${this.state.ollamaTimeouts} timeouts`);
    }

    // Story 72.4: Show opening diversity
    const openingStats = this.openingTracker.getStatistics();
    const diversityIndex = openingStats.gamesPlayed > 0 ? (openingStats.totalOpenings / openingStats.gamesPlayed * 100).toFixed(1) : 0;
    console.log(`   Openings: ${openingStats.totalOpenings} unique | Diversity: ${diversityIndex}%`);
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

    // Stop broadcast server
    try {
      await stopBroadcastServer();
    } catch (error) {
      console.warn(`⚠️  Broadcast server shutdown failed: ${error.message}`);
    }

    // EPIC 14: Finalize research
    if (this.research) {
      try {
        await this.research.finishExperiment('completed', this.state.totalGames);
        await this.research.stop();
        console.log('✅ Research data flushed and closed');
      } catch (error) {
        console.warn(`⚠️  Research shutdown failed: ${error.message}`);
      }
    }

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
