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
import { ChessUI } from './ui.js';
import { BroadcastService } from './broadcast-service.js';
import { RealChessGame } from './real-chess-game.js';
import { WebSocketServer } from './websocket-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execPromise = promisify(exec);

class ChessArena {
  constructor() {
    this.config = {
      maxMovesPerGame: 500,
      moveTimeoutMs: 30000,
      matchDelayMs: parseInt(process.env.MATCH_RESTART_DELAY_MS) || 5000,
      healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 30000,
      ollamaRetryCount: parseInt(process.env.OLLAMA_RETRY_COUNT) || 5,
      ollamaRetryDelayMs: parseInt(process.env.OLLAMA_RETRY_DELAY_MS) || 5000,
      statsFile: process.env.STATISTICS_PERSIST_FILE || 'arena-statistics.json',
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
      gameHistory: [],  // Last 100 games for statistics
      maxHistorySize: 100,
    };

    this.players = [];
    this.lastMatchConfig = null;
    this.ui = new ChessUI();
    this.broadcast = new BroadcastService({
      stream: {
        obsWebSocketUrl: 'ws://localhost:4455',
        youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || '',
        streamTitle: 'AI Chess Tournament - Live',
      },
    });
    this.wsServer = new WebSocketServer(9000);

    // Personality profiles
    this.personalities = [
      { name: 'Aggressive', temperature: 0.9, depth: 'tactical', riskTolerance: 0.8 },
      { name: 'Defensive', temperature: 0.3, depth: 'strategic', riskTolerance: 0.2 },
      { name: 'Positional', temperature: 0.5, depth: 'strategic', riskTolerance: 0.4 },
      { name: 'Tactical', temperature: 0.7, depth: 'tactical', riskTolerance: 0.6 },
      { name: 'Balanced', temperature: 0.5, depth: 'balanced', riskTolerance: 0.5 },
      { name: 'Gambler', temperature: 0.95, depth: 'tactical', riskTolerance: 0.95 },
      { name: 'Cautious', temperature: 0.2, depth: 'strategic', riskTolerance: 0.1 },
    ];

    // Time controls
    this.timeControls = [
      { name: 'Bullet', seconds: 60 },
      { name: 'Blitz', seconds: 300 },
      { name: 'Rapid', seconds: 900 },
      { name: 'Classical', seconds: 3600 },
      { name: 'Infinite', seconds: 0 },
    ];
  }

  async run() {
    try {
      // Load configuration
      this.loadConfig();

      // Initialize players
      this.initializePlayers();

      this.ui.displayArenaStarted();

      // Start WebSocket server for spectators
      await this.wsServer.start();

      // Connect to streaming (optional)
      await this.broadcast.streamService.connect();

      // Start health monitoring (EPIC 73)
      this.startHealthMonitor();

      // Setup graceful shutdown (EPIC 73)
      process.on('SIGINT', () => this.shutdown());

      // Main game loop
      let matchNumber = 1;
      while (true) {
        try {
          this.arenaState.matchCount = matchNumber;
          this.arenaState.totalGames++;

          this.ui.displayMatchHeader(matchNumber);

          // Ensure Ollama is available (EPIC 73)
          await this.ensureOllamaAvailable();

          // Select random players with randomized personalities
          const matchConfig = this.selectPlayers();
          this.displayMatchConfig(matchConfig);

          // Notify spectators game is starting
          this.wsServer.emitGameStarted(matchConfig.white, matchConfig.black, matchNumber);

          // Play game
          const result = await this.simulateGame(matchConfig, matchNumber);

          // Display result
          this.displayResult(result, matchConfig.white, matchConfig.black);

          // Record game result and broadcast statistics (EPIC 73)
          this.recordGameResult(result.result, matchConfig, result.durationMs, result.movesCount);

          // Notify spectators game finished
          this.wsServer.emitGameFinished(
            result.result,
            matchConfig.white.name,
            matchConfig.black.name,
            result.movesCount,
            result.durationMs
          );

          // Display replays
          await this.displayReplays();

          // Display match summary
          this.displayMatchSummary(result, matchConfig.white, matchConfig.black);

          // Update stats
          this.updateStats(result);

          // Countdown to next match (EPIC 73)
          if (matchNumber < 999) {
            await this.countdownToNextMatch(this.config.matchDelayMs);
          }

          matchNumber++;
        } catch (error) {
          console.error(`\n❌ Match error: ${error.message}`);
          this.wsServer.emitGameError({
            error: error.message,
            matchNumber,
          });
          console.log('   Resuming in 10 seconds...\n');
          await this.delay(10000);
        }
      }
    } catch (error) {
      console.error(`\n❌ Arena fatal error: ${error.message}\n`);
      await this.shutdown();
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
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players for randomization');
    }

    let matchConfig = null;

    // Keep generating until we get a different config than last time
    let attempts = 0;
    do {
      const whiteIdx = Math.floor(Math.random() * this.players.length);
      let blackIdx = Math.floor(Math.random() * this.players.length);

      // Ensure white and black are different
      while (blackIdx === whiteIdx) {
        blackIdx = Math.floor(Math.random() * this.players.length);
      }

      const white = this.players[whiteIdx];
      const black = this.players[blackIdx];

      // Randomize personalities and settings
      const whitePers = this.personalities[Math.floor(Math.random() * this.personalities.length)];
      const blackPers = this.personalities[Math.floor(Math.random() * this.personalities.length)];
      const timeControl = this.timeControls[Math.floor(Math.random() * this.timeControls.length)];

      matchConfig = {
        white: {
          ...white,
          personality: whitePers.name,
          temperature: whitePers.temperature,
          depth: whitePers.depth,
          riskTolerance: whitePers.riskTolerance,
        },
        black: {
          ...black,
          personality: blackPers.name,
          temperature: blackPers.temperature,
          depth: blackPers.depth,
          riskTolerance: blackPers.riskTolerance,
        },
        timeControl: timeControl.name,
        seed: Math.random(),
      };

      // Check if it's different from last config
      if (!this.lastMatchConfig || this.configsAreDifferent(matchConfig, this.lastMatchConfig)) {
        break;
      }

      attempts++;
    } while (attempts < 100);

    if (!matchConfig) {
      throw new Error('Failed to generate unique match configuration');
    }

    this.lastMatchConfig = matchConfig;
    return matchConfig;
  }

  configsAreDifferent(config1, config2) {
    return (
      config1.white.name !== config2.white.name ||
      config1.white.personality !== config2.white.personality ||
      config1.black.name !== config2.black.name ||
      config1.black.personality !== config2.black.personality ||
      config1.timeControl !== config2.timeControl
    );
  }

  displayMatchConfig(config) {
    console.log(`${config.white.name} (${config.white.personality}) vs ${config.black.name} (${config.black.personality})`);
    console.log(`Time Control: ${config.timeControl}`);
    console.log(`White Temperature: ${config.white.temperature.toFixed(2)}`);
    console.log(`Black Temperature: ${config.black.temperature.toFixed(2)}`);
    console.log();
  }

  async simulateGame(matchConfig, matchNumber) {
    // Reset broadcast for new game
    this.broadcast.reset();

    // Create and execute REAL chess game (with WebSocket server for spectators)
    const gameExecutor = new RealChessGame(matchConfig, this.broadcast, this.ui, this.wsServer);

    console.log('\n🎮 Starting real chess game...');
    const gameResult = await gameExecutor.play();

    const summary = this.broadcast.getMatchSummary();

    return {
      matchNumber,
      white: matchConfig.white.name,
      black: matchConfig.black.name,
      result: gameResult.result,
      moves: gameResult.moves,
      movesCount: gameResult.moves.length,
      durationMs: gameResult.durationMs,
      events: summary.eventsByType,
      pgn: gameResult.pgn,
      fen: gameResult.fen,
    };
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

  async displayReplays() {
    await this.broadcast.displayReplays();
  }

  displayMatchSummary(result, white, black) {
    this.broadcast.displayMatchSummary({
      white: white.name,
      black: black.name,
      result: result.result,
      moves: result.moves,
      durationMs: result.durationMs,
    });

    // Display runtime monitoring
    this.broadcast.displayMonitoringSummary();
  }

  displayStreamDashboard() {
    if (this.broadcast.streamService.streamState.isConnected) {
      this.broadcast.streamService.displayDashboard();
    }
  }

  displayProductionChecklist() {
    if (this.broadcast.streamService.streamState.isConnected) {
      this.broadcast.streamService.displayProductionChecklist();
    }
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

  async countdownToNextMatch(delayMs) {
    const delaySeconds = Math.ceil(delayMs / 1000);
    for (let i = delaySeconds; i > 0; i--) {
      this.wsServer.emitMatchRestartIn(i, this.arenaState.matchCount + 1);
      process.stdout.write(`\r⏳ Next match in ${i}s    `);
      await this.delay(1000);
    }
    process.stdout.write('\r' + ' '.repeat(35) + '\r');
  }

  recordGameResult(result, matchConfig, durationMs, moveCount) {
    // Update win/loss/draw counts
    if (result === 'white-win') {
      this.arenaState.whiteWins++;
    } else if (result === 'black-win') {
      this.arenaState.blackWins++;
    } else {
      this.arenaState.draws++;
    }

    // Add to game history
    const gameRecord = {
      matchNumber: this.arenaState.matchCount,
      white: matchConfig.white.name,
      black: matchConfig.black.name,
      result,
      moveCount,
      durationMs,
      whiteTemp: matchConfig.white.temperature,
      blackTemp: matchConfig.black.temperature,
      personality: {
        white: matchConfig.white.personality,
        black: matchConfig.black.personality,
      },
      timeControl: matchConfig.timeControl,
      timestamp: Date.now(),
    };

    this.arenaState.gameHistory.push(gameRecord);
    if (this.arenaState.gameHistory.length > this.arenaState.maxHistorySize) {
      this.arenaState.gameHistory.shift();
    }

    // Broadcast updated statistics
    this.broadcastStatistics();
  }

  broadcastStatistics() {
    const uptime = Date.now() - this.arenaState.startTime;
    const hours = uptime / (1000 * 60 * 60);
    const gamesPerHour = hours > 0 ? this.arenaState.totalGames / hours : 0;

    const avgMoveCount = this.arenaState.gameHistory.length > 0
      ? Math.round(
          this.arenaState.gameHistory.reduce((sum, g) => sum + g.moveCount, 0) /
          this.arenaState.gameHistory.length
        )
      : 0;

    this.wsServer.emitArenaStatisticsUpdated({
      totalGames: this.arenaState.totalGames,
      whiteWins: this.arenaState.whiteWins,
      blackWins: this.arenaState.blackWins,
      draws: this.arenaState.draws,
      uptime: Math.floor(uptime / 1000),
      gamesPerHour: Math.round(gamesPerHour * 100) / 100,
      avgMoveCount,
      recentGames: this.arenaState.gameHistory.slice(-10),
    });
  }

  async ensureOllamaAvailable() {
    const maxRetries = this.config.ollamaRetryCount;
    const retryDelayMs = this.config.ollamaRetryDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('http://localhost:11434/api/version');
        if (response.ok) {
          console.log('✅ Ollama available');
          this.wsServer.emitHealthStatus({ ollama: 'healthy' });
          return;
        }
      } catch (error) {
        console.warn(`⚠️  Ollama unavailable (attempt ${attempt}/${maxRetries})`);
        this.wsServer.emitHealthStatus({
          ollama: 'unhealthy',
          error: error.message,
        });
        if (attempt < maxRetries) {
          await this.delay(retryDelayMs);
        }
      }
    }

    throw new Error('Ollama unavailable after retries');
  }

  startHealthMonitor() {
    setInterval(async () => {
      try {
        const response = await fetch('http://localhost:11434/api/version');
        const data = await response.json();
        this.wsServer.emitHealthStatus({
          ollama: 'healthy',
          version: data.version,
        });
      } catch (error) {
        this.wsServer.emitHealthStatus({
          ollama: 'unhealthy',
          error: error.message,
        });
      }
    }, this.config.healthCheckIntervalMs);
  }

  persistStatistics() {
    try {
      const statsPath = path.join(process.cwd(), this.config.statsFile);
      fs.writeFileSync(
        statsPath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          totalGames: this.arenaState.totalGames,
          whiteWins: this.arenaState.whiteWins,
          blackWins: this.arenaState.blackWins,
          draws: this.arenaState.draws,
          uptime: Date.now() - this.arenaState.startTime,
          gameHistory: this.arenaState.gameHistory,
        }, null, 2)
      );
      console.log(`📊 Statistics saved to ${this.config.statsFile}`);
    } catch (error) {
      console.error(`❌ Failed to save statistics: ${error.message}`);
    }
  }

  async shutdown() {
    console.log('\n\n🛑 Shutting down gracefully...');
    this.persistStatistics();
    await this.wsServer.stop();
    console.log('✅ Arena shutdown complete');
    process.exit(0);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { ChessArena };
