#!/usr/bin/env node

/**
 * AI Commander Demo CLI
 *
 * Wrapper around the compiled match-runner package
 * Runs a complete Ollama vs Ollama match demo
 */

// For demo purposes, create a simple match executor
// In production, this would import from @ai-commander/match-runner
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_OUTPUT_DIR = path.join(process.cwd(), 'demo-output');

class AICommanderDemo {
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
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.log('✅ Connected to Ollama', '✅');
    } catch (error) {
      throw new Error(
        `Cannot connect to Ollama at ${this.config.ollamaEndpoint}. ` +
        `Make sure Ollama is running: ollama serve`
      );
    }
  }

  async run() {
    this.logSection('🎮 AI COMMANDER — FIRST PLAYABLE DEMO');

    try {
      // Phase 1: Initialization
      this.logSection('PHASE 1: INITIALIZATION');
      this.log('Checking Ollama connection...', '🔌');
      await this.checkOllamaConnection();

      this.log(`Player 1 Model: ${this.config.player1Model}`, '🤖');
      this.log(`Player 2 Model: ${this.config.player2Model}`, '🤖');
      this.log(`Max Ticks: ${this.config.maxTicks}`, '⏱️');

      // Phase 2: Setup
      this.logSection('PHASE 2: MATCH SETUP');
      this.log('Initializing match executor...', '⚙️');

      const executor = new OllamaMatchExecutor({
        player1Model: this.config.player1Model,
        player2Model: this.config.player2Model,
        ollamaEndpoint: this.config.ollamaEndpoint,
        maxTicks: this.config.maxTicks,
        replayPath: path.join(DEMO_OUTPUT_DIR, 'replay.json'),
        logsPath: path.join(DEMO_OUTPUT_DIR, 'logs.txt'),
        telemetryPath: path.join(DEMO_OUTPUT_DIR, 'telemetry.json'),
      });

      // Phase 3: Execution
      this.logSection('PHASE 3: MATCH EXECUTION');
      this.log('Starting match...', '▶️');

      const startTime = Date.now();
      const result = await executor.execute();
      const duration = Date.now() - startTime;

      // Phase 4: Results
      this.logSection('PHASE 4: MATCH COMPLETE');

      if (result.winner === 1) {
        this.log(`🏆 WINNER: Player 1 (${this.config.player1Model})`, '🎉');
      } else if (result.winner === 2) {
        this.log(`🏆 WINNER: Player 2 (${this.config.player2Model})`, '🎉');
      } else {
        this.log('Match ended in a draw', '🤝');
      }

      console.log('\n📊 MATCH STATISTICS:');
      console.log(`  Total Ticks: ${result.totalTicks}`);
      console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`  Ticks/Second: ${(result.totalTicks / (duration / 1000)).toFixed(1)}`);

      console.log('\n👤 PLAYER 1 STATS:');
      console.log(`  Commands Executed: ${result.player1Stats.commandsExecuted}`);
      console.log(`  Commands Failed: ${result.player1Stats.commandsFailed}`);
      console.log(`  Goals Completed: ${result.player1Stats.goalsCompleted}`);
      console.log(`  Avg Latency: ${result.player1Stats.averageLatencyMs.toFixed(0)}ms`);

      console.log('\n👤 PLAYER 2 STATS:');
      console.log(`  Commands Executed: ${result.player2Stats.commandsExecuted}`);
      console.log(`  Commands Failed: ${result.player2Stats.commandsFailed}`);
      console.log(`  Goals Completed: ${result.player2Stats.goalsCompleted}`);
      console.log(`  Avg Latency: ${result.player2Stats.averageLatencyMs.toFixed(0)}ms`);

      // Phase 5: Artifacts
      this.logSection('PHASE 5: ARTIFACTS');

      if (result.replayPath && fs.existsSync(result.replayPath)) {
        const size = fs.statSync(result.replayPath).size;
        this.log(`Replay saved: ${result.replayPath} (${(size / 1024).toFixed(1)} KB)`, '📹');
      }

      if (result.logsPath && fs.existsSync(result.logsPath)) {
        const size = fs.statSync(result.logsPath).size;
        this.log(`Logs saved: ${result.logsPath} (${(size / 1024).toFixed(1)} KB)`, '📝');
      }

      if (result.telemetryPath && fs.existsSync(result.telemetryPath)) {
        const size = fs.statSync(result.telemetryPath).size;
        this.log(`Telemetry saved: ${result.telemetryPath} (${(size / 1024).toFixed(1)} KB)`, '📈');
      }

      this.logSection('✅ DEMO COMPLETE');
      console.log(`Output directory: ${DEMO_OUTPUT_DIR}`);
      console.log('\nTo replay the match:');
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

  const demo = new AICommanderDemo(config);
  await demo.run();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
