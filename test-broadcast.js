#!/usr/bin/env node

/**
 * Test Broadcast Service — Demonstrates live event detection and commentary
 */

import { BroadcastService } from './broadcast-service.js';

const broadcast = new BroadcastService();

console.log('\n' + '═'.repeat(60));
console.log('  🔴 LIVE BROADCAST TEST');
console.log('═'.repeat(60) + '\n');

// Simulate some chess events
const testMoves = [
  { move: 'e2-e4', fen: 'after e4' },
  { move: 'e7-e5', fen: 'after e5' },
  { move: 'Nxf7', fen: 'knight captures f7' }, // Capture
  { move: 'Qh5+', fen: 'queen checks' },       // Check
  { move: 'Nf6#', fen: 'checkmate' },          // Checkmate
];

const players = ['Ollama', 'Stockfish'];
let moveIndex = 0;

for (const move of testMoves) {
  const playerName = players[moveIndex % 2];

  console.log(`Move ${moveIndex + 1}: ${playerName} plays ${move.move}`);

  // Process move
  const broadcasts = broadcast.processMove(move, playerName);

  // Display commentary
  for (const b of broadcasts) {
    broadcast.displayBroadcast(b);
  }

  moveIndex++;
}

// Show match summary
console.log('\n' + '═'.repeat(60));
const summary = broadcast.getMatchSummary();
console.log(`  📊 Event Summary`);
console.log('═'.repeat(60));
console.log(`  Total Events: ${summary.totalEvents}`);
console.log(`  Event Types: ${Object.keys(summary.eventsByType).join(', ')}`);
console.log('\n');
