#!/usr/bin/env node

/**
 * Story 21.2 — First Real Match Validation
 *
 * Run a complete Ollama vs Ollama match from start to finish:
 * 1. Validate Ollama runtime
 * 2. Create game session
 * 3. Create two Ollama brains
 * 4. Execute match (observe → plan → decide → execute)
 * 5. Detect winner
 * 6. Save replay, logs, telemetry
 * 7. Generate match report
 */

import fs from 'fs';
import path from 'path';
import { BrainManager } from '@ai-commander/brain';
import { ZeroADAdapter } from '@ai-commander/zeroad-adapter';
import { OllamaMatchExecutor } from '@ai-commander/match-runner';
import { validateOllamaRuntime } from '@ai-commander/brain-ollama';
import { MatchReportGenerator } from '@ai-commander/match-runner';

interface TestConfig {
  player1Model: string;
  player2Model: string;
  ollamaEndpoint: string;
  maxTicks: number;
  outputDir: string;
}

const config: TestConfig = {
  player1Model: 'mistral',
  player2Model: 'llama2',
  ollamaEndpoint: 'http://localhost:11434',
  maxTicks: 100, // Reduced for testing
  outputDir: './test-match-output',
};

async function main() {
  console.log('='.repeat(70));
  console.log('Story 21.2 — First Real Match Validation');
  console.log('='.repeat(70));

  try {
    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    console.log(`\n[1/5] Validating Ollama Runtime...`);
    await validateOllamaRuntime(config);

    console.log(`[2/5] Creating Game Session...`);
    const adapter = new ZeroADAdapter();
    await adapter.initialize();
    const gameSession = await adapter.createSession({
      map: 'Schwarzwald',
      difficulty: 'hard',
    });

    console.log(`[3/5] Creating Ollama Brains...`);
    const brain1 = await BrainManager.create({
      provider: 'ollama',
      model: config.player1Model,
      endpoint: config.ollamaEndpoint,
    });

    const brain2 = await BrainManager.create({
      provider: 'ollama',
      model: config.player2Model,
      endpoint: config.ollamaEndpoint,
    });

    console.log(`[4/5] Executing Match (${config.maxTicks} ticks)...`);
    const startTime = Date.now();

    const executor = new OllamaMatchExecutor({
      player1Model: config.player1Model,
      player2Model: config.player2Model,
      ollamaEndpoint: config.ollamaEndpoint,
      maxTicks: config.maxTicks,
      replayPath: path.join(config.outputDir, 'replay.json'),
      logsPath: path.join(config.outputDir, 'logs.json'),
      telemetryPath: path.join(config.outputDir, 'telemetry.json'),
    });

    const result = await executor.execute(gameSession);
    const duration = Date.now() - startTime;

    console.log(`\n[5/5] Generating Report...`);

    // Generate match report
    const report = MatchReportGenerator.generateReport(
      'match-001',
      result,
      config.player1Model,
      config.player2Model
    );

    const reportMarkdown = MatchReportGenerator.formatMarkdown(report);
    fs.writeFileSync(path.join(config.outputDir, 'report.md'), reportMarkdown);

    // Output summary
    console.log('\n' + '='.repeat(70));
    console.log('MATCH RESULTS');
    console.log('='.repeat(70));
    console.log(`\nWinner: Player ${result.winner}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Ticks: ${result.totalTicks}`);
    console.log(`\nPlayer 1 (${config.player1Model}):`);
    console.log(`  Commands: ${result.player1Stats.commandsExecuted}`);
    console.log(`  Failed: ${result.player1Stats.commandsFailed}`);
    console.log(`  Goals: ${result.player1Stats.goalsCompleted}`);
    console.log(`  Avg Latency: ${result.player1Stats.averageLatencyMs.toFixed(0)}ms`);
    console.log(`\nPlayer 2 (${config.player2Model}):`);
    console.log(`  Commands: ${result.player2Stats.commandsExecuted}`);
    console.log(`  Failed: ${result.player2Stats.commandsFailed}`);
    console.log(`  Goals: ${result.player2Stats.goalsCompleted}`);
    console.log(`  Avg Latency: ${result.player2Stats.averageLatencyMs.toFixed(0)}ms`);

    console.log(`\nOutput Files:`);
    console.log(`  Replay: ${path.join(config.outputDir, 'replay.json')}`);
    console.log(`  Logs: ${path.join(config.outputDir, 'logs.json')}`);
    console.log(`  Telemetry: ${path.join(config.outputDir, 'telemetry.json')}`);
    console.log(`  Report: ${path.join(config.outputDir, 'report.md')}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ MATCH COMPLETE');
    console.log('='.repeat(70));

    return 0;
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Ollama is running: ollama serve');
    console.error('2. Verify model is pulled: ollama pull mistral');
    console.error('3. Check Ollama is accessible: curl http://localhost:11434/api/tags');
    console.error('4. Check Node.js version: node --version (need 22+)');
    return 1;
  }
}

process.exit(await main());
