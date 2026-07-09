#!/usr/bin/env node

/**
 * AI Commander Simple Demo
 *
 * Demonstrates the concept of two AI models competing
 * This version simulates match execution for demo purposes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_OUTPUT_DIR = path.join(process.cwd(), 'demo-output');

class SimpleDemo {
  constructor(config) {
    this.config = config;
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(DEMO_OUTPUT_DIR)) {
      fs.mkdirSync(DEMO_OUTPUT_DIR, { recursive: true });
      console.log(`📁 Created output directory: ${DEMO_OUTPUT_DIR}`);
    }
  }

  log(message, emoji = '→') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60) + '\n');
  }

  async checkOllamaConnection() {
    try {
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`, {
        timeout: 5000,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.log('✅ Connected to Ollama', '✅');

      // Check if models exist
      const models = data.models || [];
      this.log(`Available models: ${models.length}`, '📦');

      if (!models.some(m => m.name.includes(this.config.player1Model))) {
        throw new Error(`Model '${this.config.player1Model}' not found. Run: ollama pull ${this.config.player1Model}`);
      }
      if (!models.some(m => m.name.includes(this.config.player2Model))) {
        throw new Error(`Model '${this.config.player2Model}' not found. Run: ollama pull ${this.config.player2Model}`);
      }

      return true;
    } catch (error) {
      throw new Error(
        `Cannot connect to Ollama at ${this.config.ollamaEndpoint}. ` +
        `Make sure Ollama is running:\n\n  ollama serve\n\n` +
        `Error: ${error.message}`
      );
    }
  }

  // Simulate a match - in production this would call real game/brain logic
  async simulateMatch() {
    const ticks = [];
    const maxTicks = this.config.maxTicks;
    let player1Score = 50;
    let player2Score = 50;
    let player1Health = 100;
    let player2Health = 100;

    for (let tick = 0; tick < maxTicks; tick++) {
      // Simulate decisions
      const p1Decision = this.getRandomDecision();
      const p2Decision = this.getRandomDecision();

      // Simulate state changes
      if (p1Decision === 'attack' && Math.random() > 0.5) {
        player2Health -= Math.floor(Math.random() * 10);
      }
      if (p2Decision === 'attack' && Math.random() > 0.5) {
        player1Health -= Math.floor(Math.random() * 10);
      }
      if (p1Decision === 'gather') {
        player1Score += Math.floor(Math.random() * 5);
      }
      if (p2Decision === 'gather') {
        player2Score += Math.floor(Math.random() * 5);
      }

      ticks.push({
        tickNumber: tick,
        timestamp: Date.now() + tick * 100,
        player1State: {
          health: Math.max(0, player1Health),
          score: player1Score,
          units: Math.floor(20 + Math.random() * 10),
        },
        player2State: {
          health: Math.max(0, player2Health),
          score: player2Score,
          units: Math.floor(20 + Math.random() * 10),
        },
        player1Decision: p1Decision,
        player2Decision: p2Decision,
      });

      // Check for winner
      if (player1Health <= 0 || player2Health <= 0) {
        break;
      }

      // Progress indicator
      if ((tick + 1) % Math.floor(maxTicks / 10) === 0) {
        this.log(`Progress: ${Math.round(((tick + 1) / maxTicks) * 100)}%`, '⏳');
      }
    }

    // Determine winner
    let winner = null;
    if (player1Health > player2Health) {
      winner = 1;
    } else if (player2Health > player1Health) {
      winner = 2;
    } else if (player1Score > player2Score) {
      winner = 1;
    } else if (player2Score > player1Score) {
      winner = 2;
    }

    return {
      ticks,
      winner,
      totalTicks: ticks.length,
      player1Score,
      player2Score,
      player1Health: Math.max(0, player1Health),
      player2Health: Math.max(0, player2Health),
    };
  }

  getRandomDecision() {
    const decisions = ['attack', 'defend', 'gather', 'build', 'scout'];
    return decisions[Math.floor(Math.random() * decisions.length)];
  }

  async run() {
    this.logSection('🎮 AI COMMANDER — FIRST PLAYABLE DEMO');

    try {
      // Phase 1: Initialization
      this.logSection('PHASE 1: INITIALIZATION');
      this.log('Checking Ollama connection...', '🔌');

      // Try to connect, but allow demo mode if Ollama is unavailable
      let ollamaAvailable = false;
      try {
        await this.checkOllamaConnection();
        ollamaAvailable = true;
      } catch (error) {
        if (process.env.DEMO_MODE === 'true' || process.env.SKIP_OLLAMA === 'true') {
          this.log('⚠️ Running in DEMO MODE (no Ollama required)', '⚠️');
          this.log('To use real Ollama: start ollama serve', '📌');
        } else {
          throw error;
        }
      }

      this.log(`Player 1 Model: ${this.config.player1Model}`, '🤖');
      this.log(`Player 2 Model: ${this.config.player2Model}`, '🤖');
      this.log(`Max Ticks: ${this.config.maxTicks}`, '⏱️');

      // Phase 2: Simulation
      this.logSection('PHASE 2: MATCH EXECUTION');
      this.log('Running simulated match...', '▶️');

      const startTime = Date.now();
      const matchData = await this.simulateMatch();
      const duration = Date.now() - startTime;

      // Phase 3: Results
      this.logSection('PHASE 3: MATCH COMPLETE');

      if (matchData.winner === 1) {
        this.log(`🏆 WINNER: Player 1 (${this.config.player1Model})`, '🎉');
      } else if (matchData.winner === 2) {
        this.log(`🏆 WINNER: Player 2 (${this.config.player2Model})`, '🎉');
      } else {
        this.log('Match ended in a draw', '🤝');
      }

      console.log('\n📊 MATCH STATISTICS:');
      console.log(`  Total Ticks: ${matchData.totalTicks}`);
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`  Ticks/Second: ${(matchData.totalTicks / (duration / 1000)).toFixed(1)}`);

      console.log('\n🔵 PLAYER 1 STATS:');
      console.log(`  Final Score: ${matchData.player1Score}`);
      console.log(`  Health: ${matchData.player1Health}`);

      console.log('\n🔴 PLAYER 2 STATS:');
      console.log(`  Final Score: ${matchData.player2Score}`);
      console.log(`  Health: ${matchData.player2Health}`);

      // Phase 4: Save artifacts
      this.logSection('PHASE 4: ARTIFACTS');

      const replayPath = path.join(DEMO_OUTPUT_DIR, 'replay.json');
      const replay = {
        config: {
          player1Model: this.config.player1Model,
          player2Model: this.config.player2Model,
          maxTicks: this.config.maxTicks,
        },
        metrics: {
          winner: matchData.winner || 'draw',
          totalTicks: matchData.totalTicks,
          duration,
          player1Score: matchData.player1Score,
          player2Score: matchData.player2Score,
        },
        frames: matchData.ticks,
      };

      fs.writeFileSync(replayPath, JSON.stringify(replay, null, 2));
      const replaySize = fs.statSync(replayPath).size;
      this.log(`Replay saved: ${replayPath} (${(replaySize / 1024).toFixed(1)} KB)`, '📹');

      const logsPath = path.join(DEMO_OUTPUT_DIR, 'logs.txt');
      const logs = `AI Commander Match Log\n` +
        `======================\n` +
        `Player 1: ${this.config.player1Model}\n` +
        `Player 2: ${this.config.player2Model}\n` +
        `Duration: ${(duration / 1000).toFixed(2)}s\n` +
        `Total Ticks: ${matchData.totalTicks}\n` +
        `Winner: ${matchData.winner ? `Player ${matchData.winner}` : 'Draw'}\n` +
        `\nMatch Summary:\n` +
        `Player 1 Final Score: ${matchData.player1Score}\n` +
        `Player 2 Final Score: ${matchData.player2Score}\n` +
        `Player 1 Health: ${matchData.player1Health}\n` +
        `Player 2 Health: ${matchData.player2Health}\n`;

      fs.writeFileSync(logsPath, logs);
      const logsSize = fs.statSync(logsPath).size;
      this.log(`Logs saved: ${logsPath} (${(logsSize / 1024).toFixed(1)} KB)`, '📝');

      this.logSection('✅ DEMO COMPLETE');
      console.log(`Output directory: ${DEMO_OUTPUT_DIR}`);
      console.log(`\nRun this to view the replay:`);
      console.log(`  npm run replay\n`);

    } catch (error) {
      this.logSection('❌ DEMO FAILED');
      if (error instanceof Error) {
        console.error('Error:', error.message);
        if (this.config.verbose) {
          console.error('\nFull stack trace:');
          console.error(error.stack);
        }
      } else {
        console.error('Unknown error:', error);
      }
      process.exit(1);
    }
  }
}

// Main
async function main() {
  const config = {
    ollamaEndpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
    player1Model: process.env.PLAYER1_MODEL || 'mistral',
    player2Model: process.env.PLAYER2_MODEL || 'neural-chat',
    maxTicks: parseInt(process.env.MAX_TICKS || '500', 10),
    verbose: process.env.VERBOSE === 'true',
  };

  const demo = new SimpleDemo(config);
  await demo.run();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
