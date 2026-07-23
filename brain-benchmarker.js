#!/usr/bin/env node

/**
 * Brain Benchmarker
 *
 * Story 73.4: Brain Benchmarking
 *
 * Run tournaments between different prompts, models, and temperatures.
 * Generate rankings and identify strongest configurations.
 *
 * Usage:
 *   node brain-benchmarker.js [num-games] [output-file]
 *
 * Examples:
 *   node brain-benchmarker.js 10
 *   node brain-benchmarker.js 50 tournament-results.json
 */

import fs from 'fs';
import { ChessArena } from './arena.js';

class BrainBenchmarker {
  constructor(numGames = 10) {
    this.numGames = numGames;
    this.results = [];
  }

  /**
   * Generate tournament configurations to test
   */
  generateConfigurations() {
    const models = ['tinyllama', 'mistral', 'neural-chat'];
    const prompts = ['classic', 'aggressive', 'defensive', 'positional', 'balanced'];
    const temperatures = [0.3, 0.5, 0.7, 0.9];

    const configs = [];

    for (const model of models) {
      for (const prompt of prompts) {
        for (const temp of temperatures) {
          configs.push({
            model,
            prompt,
            temperature: temp,
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
            avgMoveCount: 0,
            totalMoveCount: 0,
          });
        }
      }
    }

    return configs;
  }

  /**
   * Run tournament
   * Note: This is a design/specification. Full implementation would require
   * modifying arena to support configuration overrides and systematic testing.
   */
  async runTournament() {
    console.log('\n🏆 Brain Benchmarker Tournament\n');
    console.log(`Configuration: ${this.numGames} games per configuration`);
    console.log(`Total configurations to test: ${this.generateConfigurations().length}`);
    console.log(`Total games to play: ${this.numGames * this.generateConfigurations().length}`);
    console.log('\nEstimated time: depends on game duration\n');

    // Configuration would look like:
    // for each config:
    //   for i = 1 to numGames:
    //     modify arena to use config
    //     run one game
    //     track results

    console.log('✅ Tournament structure defined.');
    console.log('   Implementation: Modify arena.js to accept configuration overrides');
    console.log('   Then run tournaments systematically.\n');
  }

  /**
   * Analyze tournament results
   */
  analyzeResults(resultsFile = 'tournament-results.json') {
    if (!fs.existsSync(resultsFile)) {
      console.error(`❌ Results file not found: ${resultsFile}`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    const results = data.results || [];

    if (results.length === 0) {
      console.log('No tournament results found.');
      return;
    }

    console.log('\n🏆 Tournament Rankings\n');

    // Group by model
    const byModel = {};
    for (const result of results) {
      if (!byModel[result.model]) {
        byModel[result.model] = [];
      }
      byModel[result.model].push(result);
    }

    // Calculate rankings
    const rankings = [];
    for (const [model, games] of Object.entries(byModel)) {
      const wins = games.reduce((sum, g) => sum + (g.result === 'win' ? 1 : 0), 0);
      const losses = games.reduce((sum, g) => sum + (g.result === 'loss' ? 1 : 0), 0);
      const draws = games.reduce((sum, g) => sum + (g.result === 'draw' ? 1 : 0), 0);
      const winRate = (wins / games.length * 100).toFixed(1);

      rankings.push({
        model,
        wins,
        losses,
        draws,
        total: games.length,
        winRate,
      });
    }

    // Sort by win rate
    rankings.sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

    // Display
    console.log('Model Rankings:');
    console.log('─'.repeat(50));
    for (let i = 0; i < rankings.length; i++) {
      const r = rankings[i];
      console.log(`${i + 1}. ${r.model.padEnd(15)} W:${r.wins} L:${r.losses} D:${r.draws} (${r.winRate}%)`);
    }

    return rankings;
  }
}

// Main execution
const numGames = parseInt(process.argv[2]) || 10;
const outputFile = process.argv[3] || 'tournament-results.json';

const benchmarker = new BrainBenchmarker(numGames);

// Check command
const command = process.argv[2];
if (command === 'analyze') {
  benchmarker.analyzeResults(process.argv[3] || 'tournament-results.json');
} else {
  // Run tournament
  benchmarker.runTournament().catch(error => {
    console.error(`❌ Tournament error: ${error.message}`);
    process.exit(1);
  });
}
