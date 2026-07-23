#!/usr/bin/env node

/**
 * Run Instrumented Chess Games for Investigation
 *
 * Plays AI vs AI chess games while recording complete decision pipeline
 * for every move. No modifications to game logic - purely observational.
 *
 * Usage:
 *   node run-instrumented-chess.js [num_games] [output_dir]
 *
 * Example:
 *   node run-instrumented-chess.js 3 ./chess-analysis
 *
 * This will:
 * 1. Play 3 complete games
 * 2. Record every move's complete pipeline
 * 3. Generate detailed analysis reports
 * 4. Export raw JSON data for external analysis
 * 5. Identify most likely bottlenecks
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import InstrumentedChessGame from './chess-game-instrumented.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const numGames = parseInt(process.argv[2]) || 1;
const outputDir = process.argv[3] || './chess-analysis';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║      INSTRUMENTED CHESS INVESTIGATION - NO CODE MODIFICATIONS  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`Running ${numGames} instrumented game(s)...`);
console.log(`Output directory: ${outputDir}`);
console.log('');
console.log('Recording:');
console.log('  ✓ FEN position before each move');
console.log('  ✓ ASCII board representation');
console.log('  ✓ Side to move');
console.log('  ✓ Complete prompt sent to LLM');
console.log('  ✓ Ollama request parameters');
console.log('  ✓ Raw model response');
console.log('  ✓ Extracted move + confidence');
console.log('  ✓ Legal move validation');
console.log('  ✓ Response latency');
console.log('  ✓ Actual move executed');
console.log('  ✓ Any errors or warnings');
console.log('');
console.log('No modifications to chess playing logic - purely observational.');
console.log('━'.repeat(70));
console.log('');

/**
 * Load config
 */
function loadConfig() {
  const configPath = path.join(__dirname, 'chess-arena-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('ERROR: chess-arena-config.json not found');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/**
 * Run a single instrumented game
 */
async function runGame(gameNumber, config) {
  console.log(`Game ${gameNumber}: Starting...`);

  try {
    // Create instrumented game instance
    const matchConfig = {
      white: { ...config.players[0] },
      black: { ...config.players[1] },
    };

    const game = new InstrumentedChessGame(matchConfig);

    const startTime = Date.now();

    // Play the game
    await game.play();

    const duration = Date.now() - startTime;
    const result = game.game.pgn();

    console.log(`Game ${gameNumber}: Complete (${duration}ms)`);

    // Generate reports
    const report = game.getReport();
    const analysis = game.exportAnalysis();
    const bottlenecks = game.getBottlenecks();

    // Save files
    const gameDir = path.join(outputDir, `game-${gameNumber}`);
    if (!fs.existsSync(gameDir)) {
      fs.mkdirSync(gameDir, { recursive: true });
    }

    // Save text report
    fs.writeFileSync(path.join(gameDir, 'report.txt'), report);
    console.log(`  → Report saved to game-${gameNumber}/report.txt`);

    // Save JSON analysis
    fs.writeFileSync(
      path.join(gameDir, 'analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
    console.log(`  → Analysis saved to game-${gameNumber}/analysis.json`);

    // Save bottlenecks
    fs.writeFileSync(
      path.join(gameDir, 'bottlenecks.json'),
      JSON.stringify(bottlenecks, null, 2)
    );
    console.log(`  → Bottlenecks saved to game-${gameNumber}/bottlenecks.json`);

    // Save PGN
    fs.writeFileSync(path.join(gameDir, 'game.pgn'), result);
    console.log(`  → PGN saved to game-${gameNumber}/game.pgn`);

    // Print summary to console
    console.log('');
    console.log(report);
    console.log('');

    return {
      gameNumber,
      duration,
      moveCount: analysis.totalMoves,
      legalMovePercentage: analysis.legalMovesPercentage,
      bottlenecks,
    };
  } catch (error) {
    console.error(`Game ${gameNumber} failed: ${error.message}`);
    console.error(error);
    return null;
  }
}

/**
 * Aggregate results across all games
 */
function aggregateResults(results) {
  const validResults = results.filter(r => r !== null);

  if (validResults.length === 0) {
    console.log('No valid games completed');
    return;
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   AGGREGATE RESULTS                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log(`Games completed: ${validResults.length}/${numGames}`);
  console.log(`Average moves per game: ${Math.round(
    validResults.reduce((sum, r) => sum + r.moveCount, 0) / validResults.length
  )}`);

  const avgLegality = Math.round(
    validResults.reduce((sum, r) => sum + r.legalMovePercentage, 0) / validResults.length
  );
  console.log(`Average legal move rate: ${avgLegality}%`);
  console.log('');

  // Aggregate bottlenecks
  const bottleneckCounts = {};
  for (const result of validResults) {
    if (result.bottlenecks) {
      for (const bottleneck of result.bottlenecks) {
        const key = bottleneck.issue;
        if (!bottleneckCounts[key]) {
          bottleneckCounts[key] = {
            count: 0,
            severity: bottleneck.severity,
            ...bottleneck,
          };
        }
        bottleneckCounts[key].count++;
      }
    }
  }

  console.log('BOTTLENECK FREQUENCY (Across all games)');
  console.log('─'.repeat(70));
  const sorted = Object.values(bottleneckCounts).sort((a, b) => b.count - a.count);
  for (const bottleneck of sorted) {
    console.log(
      `${bottleneck.issue} [${bottleneck.severity}]: Found in ${bottleneck.count}/${validResults.length} games`
    );
  }

  console.log('');
  console.log('NEXT STEPS');
  console.log('─'.repeat(70));
  console.log('1. Review individual game reports in:');
  console.log(`   ${path.resolve(outputDir)}`);
  console.log('');
  console.log('2. Check analysis.json files for detailed metrics');
  console.log('');
  console.log('3. Identify patterns in bottlenecks.json files');
  console.log('');
  console.log('4. Based on identified bottlenecks, propose changes with evidence');
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  const config = loadConfig();
  const results = [];

  for (let i = 1; i <= numGames; i++) {
    const result = await runGame(i, config);
    results.push(result);

    if (i < numGames) {
      console.log('');
      console.log('Waiting before next game...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  aggregateResults(results);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
