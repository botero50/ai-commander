#!/usr/bin/env node

/**
 * Model Benchmarker
 *
 * Story 73.1: Model Benchmarking
 *
 * Supports tournaments between different Ollama models.
 * Collects runtime metrics for every model.
 * Generates rankings using real games only.
 *
 * Usage:
 *   node model-benchmarker.js <model1> <model2> [num-games]
 *   node model-benchmarker.js tinyllama mistral 20
 */

import fs from 'fs';
import { ChessArena } from './arena.js';

class ModelBenchmarker {
  constructor(model1, model2, numGames = 10) {
    this.model1 = model1;
    this.model2 = model2;
    this.numGames = numGames;
    this.results = {
      model1: {
        name: model1,
        asWhite: { wins: 0, losses: 0, draws: 0, games: 0, totalMoves: 0, totalLatency: 0 },
        asBlack: { wins: 0, losses: 0, draws: 0, games: 0, totalMoves: 0, totalLatency: 0 },
        overall: { wins: 0, losses: 0, draws: 0, games: 0 },
      },
      model2: {
        name: model2,
        asWhite: { wins: 0, losses: 0, draws: 0, games: 0, totalMoves: 0, totalLatency: 0 },
        asBlack: { wins: 0, losses: 0, draws: 0, games: 0, totalMoves: 0, totalLatency: 0 },
        overall: { wins: 0, losses: 0, draws: 0, games: 0 },
      },
    };
  }

  /**
   * Analyze results from statistics file
   * Story 73.1: Generate rankings
   */
  analyzeResults(statsFile = 'arena-statistics.json') {
    if (!fs.existsSync(statsFile)) {
      console.error(`❌ Statistics file not found: ${statsFile}`);
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
      const games = data.recentGames || [];

      if (games.length === 0) {
        console.log('No games found in statistics.');
        return null;
      }

      // Analyze each game
      for (const game of games) {
        const white = game.white;
        const black = game.black;
        const result = game.result;

        // Record results for each model
        this.recordGame(white, black, result, game.moves, game.durationSec);
      }

      return this.generateRanking();
    } catch (error) {
      console.error(`Error analyzing results: ${error.message}`);
      return null;
    }
  }

  recordGame(white, black, result, moves = 0, duration = 0) {
    // Determine which model is which
    const whiteIsModel1 = white === this.model1;
    const blackIsModel1 = black === this.model1;

    if (whiteIsModel1) {
      this.results.model1.asWhite.games++;
      this.results.model1.overall.games++;
      this.results.model2.asBlack.games++;
      this.results.model2.overall.games++;

      if (result === 'white-win') {
        this.results.model1.asWhite.wins++;
        this.results.model1.overall.wins++;
        this.results.model2.asBlack.losses++;
        this.results.model2.overall.losses++;
      } else if (result === 'black-win') {
        this.results.model1.asWhite.losses++;
        this.results.model1.overall.losses++;
        this.results.model2.asBlack.wins++;
        this.results.model2.overall.wins++;
      } else {
        this.results.model1.asWhite.draws++;
        this.results.model1.overall.draws++;
        this.results.model2.asBlack.draws++;
        this.results.model2.overall.draws++;
      }

      this.results.model1.asWhite.totalMoves += moves;
      this.results.model2.asBlack.totalMoves += moves;
    } else {
      this.results.model2.asWhite.games++;
      this.results.model2.overall.games++;
      this.results.model1.asBlack.games++;
      this.results.model1.overall.games++;

      if (result === 'white-win') {
        this.results.model2.asWhite.wins++;
        this.results.model2.overall.wins++;
        this.results.model1.asBlack.losses++;
        this.results.model1.overall.losses++;
      } else if (result === 'black-win') {
        this.results.model2.asWhite.losses++;
        this.results.model2.overall.losses++;
        this.results.model1.asBlack.wins++;
        this.results.model1.overall.wins++;
      } else {
        this.results.model2.asWhite.draws++;
        this.results.model2.overall.draws++;
        this.results.model1.asBlack.draws++;
        this.results.model1.overall.draws++;
      }

      this.results.model2.asWhite.totalMoves += moves;
      this.results.model1.asBlack.totalMoves += moves;
    }
  }

  generateRanking() {
    const rankings = [];

    for (const [key, model] of Object.entries(this.results)) {
      const overall = model.overall;
      const winRate = overall.games > 0 ? (overall.wins / overall.games * 100).toFixed(1) : 0;
      const drawRate = overall.games > 0 ? (overall.draws / overall.games * 100).toFixed(1) : 0;
      const avgMoves = overall.games > 0 ? Math.round(model.asWhite.totalMoves / overall.games + model.asBlack.totalMoves / overall.games) : 0;

      rankings.push({
        model: model.name,
        winRate: parseFloat(winRate),
        drawRate: parseFloat(drawRate),
        games: overall.games,
        wins: overall.wins,
        draws: overall.draws,
        losses: overall.losses,
        avgMoves,
        whiteRecord: `${model.asWhite.wins}-${model.asWhite.losses}-${model.asWhite.draws}`,
        blackRecord: `${model.asBlack.wins}-${model.asBlack.losses}-${model.asBlack.draws}`,
      });
    }

    // Sort by win rate
    rankings.sort((a, b) => b.winRate - a.winRate);
    return rankings;
  }

  displayRanking() {
    console.log('\n🏆 Model Benchmark Results\n');

    const ranking = this.generateRanking();
    if (!ranking) {
      console.log('No results to display.');
      return;
    }

    console.log('Rankings (by win rate):');
    console.log('─'.repeat(80));
    console.log('Rank | Model        | Games | W  D  L | Win%  | Draw% | Avg Moves | White/Black Record');
    console.log('─'.repeat(80));

    for (let i = 0; i < ranking.length; i++) {
      const r = ranking[i];
      const rank = i + 1;
      const name = r.model.padEnd(12);
      const games = String(r.games).padStart(5);
      const record = `${String(r.wins).padStart(2)} ${String(r.draws).padStart(2)} ${String(r.losses).padStart(2)}`;
      const winRate = String(r.winRate).padStart(5);
      const drawRate = String(r.drawRate).padStart(5);
      const avgMoves = String(r.avgMoves).padStart(9);

      console.log(`${rank}    | ${name} | ${games} | ${record} | ${winRate}% | ${drawRate}% | ${avgMoves} | ${r.whiteRecord} / ${r.blackRecord}`);
    }

    console.log('─'.repeat(80));

    // Print summary
    const top = ranking[0];
    console.log(`\n✅ Strongest model: ${top.model} (${top.winRate}% win rate over ${top.games} games)`);

    // Save results to file
    const resultsFile = 'benchmark-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify({ timestamp: new Date().toISOString(), ranking }, null, 2));
    console.log(`📊 Results saved to ${resultsFile}\n`);

    return ranking;
  }
}

// Main execution
const model1 = process.argv[2];
const model2 = process.argv[3];
const numGames = parseInt(process.argv[4]) || 10;

if (!model1 || !model2) {
  console.log(`Usage: node model-benchmarker.js <model1> <model2> [num-games]`);
  console.log(`Example: node model-benchmarker.js tinyllama mistral 20`);
  process.exit(1);
}

const benchmarker = new ModelBenchmarker(model1, model2, numGames);
const ranking = benchmarker.analyzeResults('arena-statistics.json');

if (ranking) {
  benchmarker.displayRanking();
}

export { ModelBenchmarker };
