#!/usr/bin/env node

/**
 * Test Match Summary Generator — Demonstrates summary generation and display
 */

import { MatchSummaryGenerator } from './match-summary-generator.js';

function runTest() {
  const summaryGen = new MatchSummaryGenerator();

  console.log('\n' + '═'.repeat(60));
  console.log('  📊 MATCH SUMMARY GENERATOR TEST');
  console.log('═'.repeat(60) + '\n');

  // Test 1: White wins with Italian Game
  console.log('Test 1: White Victory\n');
  const whiteWinData = {
    white: 'Aggressive-Alpha',
    black: 'Defensive-Beta',
    result: 'white-win',
    moves: [
      'e2-e4', 'e7-e5', 'g1-f3', 'b8-c6',
      'f1-b5', 'a7-a6', 'b5-a4', 'g8-f6',
      'e1-g1', 'f8-e7', 'f1-e1', 'b7-b5',
      'a4-b3', 'd7-d6', 'd2-d3', 'c8-g4',
      'c2-c3', 'a8-a7', 'h2-h3', 'g4-f3',
      'e1-f3', 'f6-e4', 'd3-e4', 'e5-e4',
      'f3-e2',
    ],
    durationMs: 45000,
    replays: [
      { type: 'checkmate', description: 'Checkmate by Aggressive-Alpha' },
      { type: 'tactical-sequence', description: 'Fork by Aggressive-Alpha' },
    ],
  };

  const summary1 = summaryGen.generateSummary(whiteWinData);
  summaryGen.displaySummary(summary1);
  console.log('Brief: ' + summaryGen.generateBrief(summary1));

  // Test 2: Black wins with Sicilian Defense
  console.log('\n\nTest 2: Black Victory\n');
  const blackWinData = {
    white: 'Balanced-Gamma',
    black: 'Tactical-Delta',
    result: 'black-win',
    moves: [
      'e2-e4', 'c7-c5', 'g1-f3', 'd7-d6',
      'd2-d4', 'c5-d4', 'f3-d4', 'g8-f6',
      'b1-c3', 'a7-a6', 'c1-e3', 'e7-e5',
      'd4-f3', 'b8-d7', 'f1-e2', 'f8-e7',
      'e1-g1', 'e8-g8', 'a1-c1', 'b7-b5',
      'e3-f4', 'b5-b4', 'c3-e2', 'e7-f6',
      'f4-g3', 'd7-c5', 'a2-a3', 'b4-a3',
      'b2-a3', 'c5-e6', 'e2-f4', 'e6-f4',
      'g3-f4', 'd8-b6', 'f3-d4', 'd6-d5',
      'c1-c7',
    ],
    durationMs: 62000,
    replays: [
      { type: 'queen-sacrifice', description: 'Queen sacrifice by Tactical-Delta' },
      { type: 'brilliant-move', description: 'Rook to c7 by Tactical-Delta' },
    ],
  };

  const summary2 = summaryGen.generateSummary(blackWinData);
  summaryGen.displaySummary(summary2);
  console.log('Brief: ' + summaryGen.generateBrief(summary2));

  // Test 3: Draw with Queen's Gambit
  console.log('\n\nTest 3: Draw Result\n');
  const drawData = {
    white: 'Positional-Echo',
    black: 'Cautious-Foxtrot',
    result: 'draw',
    moves: [
      'd2-d4', 'd7-d5', 'c2-c4', 'e7-e6',
      'b1-c3', 'g8-f6', 'c1-f4', 'f8-e7',
      'e2-e3', 'e8-g8', 'f1-d3', 'b8-d7',
      'g1-f3', 'c7-c6', 'e1-g1', 'a7-a6',
      'f3-e5', 'd7-e5', 'f4-e5', 'c8-e6',
      'e5-f6', 'e7-f6', 'c3-e2', 'f8-e8',
      'e2-f4', 'f6-e7', 'f1-c1', 'd5-c4',
      'd3-c4', 'e7-d6', 'f4-d3', 'b7-b5',
      'c4-b3', 'a6-a5', 'd1-f3', 'f8-a3',
      'c1-c1',
    ],
    durationMs: 58000,
    replays: [
      { type: 'tactical-sequence', description: 'Trading sequence' },
    ],
  };

  const summary3 = summaryGen.generateSummary(drawData);
  summaryGen.displaySummary(summary3);
  console.log('Brief: ' + summaryGen.generateBrief(summary3));

  // Test 4: Opening detection with short games
  console.log('\n\nTest 4: Opening Detection\n');
  const shortGame = {
    white: 'Gambler-Zulu',
    black: 'Aggressive-Alpha',
    result: 'white-win',
    moves: [
      'e2-e4', 'e7-e5', 'g1-f3', 'b8-c6', 'f1-b5',
    ],
    durationMs: 8000,
    replays: [],
  };

  const summary4 = summaryGen.generateSummary(shortGame);
  console.log('Opening Detected: ' + summary4.opening.name);
  console.log('Opening Type: ' + summary4.opening.type);
  console.log('Confidence: ' + (summary4.opening.confidence * 100).toFixed(0) + '%');

  // Test 5: JSON Export
  console.log('\n\nTest 5: JSON Export\n');
  console.log('Exporting summary1 as JSON:');
  console.log(summaryGen.exportAsJSON(summary1));

  // Test 6: Next match preview
  console.log('\n\nTest 6: Next Match Preview\n');
  const nextMatch = {
    white: 'Balanced-Gamma',
    whitePersonality: 'Balanced',
    black: 'Tactical-Delta',
    blackPersonality: 'Tactical',
    timeControl: 'Blitz',
  };
  console.log('Next Match Info:');
  summaryGen.displayNextMatchPreview(nextMatch);

  console.log('\n✅ All tests completed!\n');
}

// Run test
runTest();
