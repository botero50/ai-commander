#!/usr/bin/env node

/**
 * Chess Prompt Analyzer
 *
 * Story 73.1: Prompt Optimization
 * Analyzes game statistics to compare prompt effectiveness.
 *
 * Usage:
 *   node analyze-prompts.js [statistics-file]
 *
 * Reads arena-statistics.json and produces ranking of prompts by:
 * - Win rate when used
 * - Average game length
 * - Effectiveness vs each opponent prompt
 */

import fs from 'fs';
import path from 'path';

const statsFile = process.argv[2] || 'arena-statistics.json';

function analyzePrompts() {
  if (!fs.existsSync(statsFile)) {
    console.error(`❌ Statistics file not found: ${statsFile}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
  const games = data.recentGames || [];

  if (games.length === 0) {
    console.log('No games recorded yet.');
    return;
  }

  console.log(`\n📊 Chess Prompt Analysis`);
  console.log(`Games analyzed: ${games.length}\n`);

  // Analyze by prompt
  const promptStats = {};

  for (const game of games) {
    const whitePrompt = game.whitePrompt || 'unknown';
    const blackPrompt = game.blackPrompt || 'unknown';

    if (!promptStats[whitePrompt]) {
      promptStats[whitePrompt] = {
        name: whitePrompt,
        gamesAsWhite: 0,
        whiteWins: 0,
        gamesAsBlack: 0,
        blackWins: 0,
        totalMoves: 0,
        totalGames: 0,
      };
    }

    if (!promptStats[blackPrompt]) {
      promptStats[blackPrompt] = {
        name: blackPrompt,
        gamesAsWhite: 0,
        whiteWins: 0,
        gamesAsBlack: 0,
        blackWins: 0,
        totalMoves: 0,
        totalGames: 0,
      };
    }

    // Track white
    promptStats[whitePrompt].gamesAsWhite++;
    promptStats[whitePrompt].totalMoves += game.moves || 0;
    promptStats[whitePrompt].totalGames++;

    if (game.result === 'white-win') {
      promptStats[whitePrompt].whiteWins++;
    }

    // Track black
    promptStats[blackPrompt].gamesAsBlack++;
    promptStats[blackPrompt].totalMoves += game.moves || 0;
    promptStats[blackPrompt].totalGames++;

    if (game.result === 'black-win') {
      promptStats[blackPrompt].blackWins++;
    }
  }

  // Calculate statistics
  const rankings = Object.values(promptStats).map(ps => {
    const totalWins = ps.whiteWins + ps.blackWins;
    const winRate = ps.totalGames > 0 ? (totalWins / ps.totalGames * 100) : 0;
    const avgMoves = ps.totalGames > 0 ? Math.round(ps.totalMoves / ps.totalGames) : 0;

    return {
      ...ps,
      winRate,
      avgMoves,
      score: winRate, // Primary ranking metric
    };
  });

  // Sort by win rate
  rankings.sort((a, b) => b.score - a.score);

  // Display rankings
  console.log('Prompt Rankings (by win rate):');
  console.log('─'.repeat(70));
  console.log('Rank | Prompt      | Games | Wins | W:% | Avg Moves');
  console.log('─'.repeat(70));

  for (let i = 0; i < rankings.length; i++) {
    const r = rankings[i];
    const rank = i + 1;
    const name = (r.name || 'unknown').padEnd(11);
    const games = String(r.totalGames).padStart(5);
    const wins = String(r.totalWins || 0).padStart(4);
    const rate = r.winRate.toFixed(1).padStart(5);
    const moves = String(r.avgMoves).padStart(10);

    console.log(`${rank}    | ${name} | ${games} | ${wins} | ${rate}% | ${moves}`);
  }

  // Compare matchups
  console.log('\n\nPrompt Matchups:');
  console.log('─'.repeat(70));

  const matchups = {};
  for (const game of games) {
    const pairing = [game.whitePrompt, game.blackPrompt].sort().join(' vs ');

    if (!matchups[pairing]) {
      matchups[pairing] = {
        pairing,
        whitePrompt: game.whitePrompt,
        blackPrompt: game.blackPrompt,
        whiteWins: 0,
        blackWins: 0,
        draws: 0,
        total: 0,
      };
    }

    matchups[pairing].total++;

    if (game.result === 'white-win') {
      matchups[pairing].whiteWins++;
    } else if (game.result === 'black-win') {
      matchups[pairing].blackWins++;
    } else {
      matchups[pairing].draws++;
    }
  }

  const sortedMatchups = Object.values(matchups).sort((a, b) => b.total - a.total);

  for (const m of sortedMatchups) {
    const whiteRate = m.whiteWins > 0 ? (m.whiteWins / m.total * 100).toFixed(1) : '0.0';
    console.log(`${m.whitePrompt} vs ${m.blackPrompt}: W${m.whiteWins} B${m.blackWins} D${m.draws} (${m.total} games)`);
  }

  console.log('\n\nTop Recommendation:');
  console.log('─'.repeat(70));
  const topPrompt = rankings[0];
  console.log(`✅ Strongest: ${topPrompt.name}`);
  console.log(`   Win Rate: ${topPrompt.winRate.toFixed(1)}%`);
  console.log(`   Games: ${topPrompt.totalGames}`);
  console.log(`   Avg Moves: ${topPrompt.avgMoves}`);
}

analyzePrompts();
