/**
 * Opening Diversity Tracker
 *
 * Story 73.2: Opening Diversity
 *
 * Tracks opening frequencies to:
 * - Prevent repetitive openings
 * - Encourage exploration
 * - Detect repeated games (same opening + same tactics)
 * - Rank opening variety
 */

import fs from 'fs';
import { Chess } from 'chess.js';

class OpeningTracker {
  constructor() {
    this.openingDatabase = new Map(); // ECO code → frequency
    this.gameSequences = []; // Track game sequences for repetition detection
    this.maxHistorySize = 100;
  }

  /**
   * Extract opening from PGN moves
   * Returns: { name: string, ecoCode: string, moves: number }
   */
  static extractOpening(moves) {
    if (!moves || moves.length === 0) {
      return { name: 'Unknown', ecoCode: '', moves: 0 };
    }

    // Simplified opening detection: first 10 moves
    const firstTenMoves = moves.slice(0, 10);

    // Common opening patterns (simplified ECO)
    const patterns = {
      'e4_c5': { name: 'Sicilian Defense', ecoCode: 'B20-B99' },
      'e4_e5': { name: 'Open Game', ecoCode: 'C20-C99' },
      'e4_c6': { name: 'Caro-Kann Defense', ecoCode: 'B10-B19' },
      'e4_d5': { name: 'Scandinavian Defense', ecoCode: 'B01' },
      'd4_Nf6': { name: 'Indian Defense', ecoCode: 'A45-A90' },
      'd4_d5': { name: 'Closed Game', ecoCode: 'D10-D69' },
      'c4': { name: 'English Opening', ecoCode: 'A10-A39' },
      'Nf3': { name: 'Reti Opening', ecoCode: 'A04-A09' },
    };

    // Detect opening from first moves
    const game = new Chess();
    let detectedOpening = null;

    for (const move of firstTenMoves) {
      game.move(move);
      const movesSoFar = game.history().join('_');

      // Check if this matches a known pattern
      for (const [pattern, opening] of Object.entries(patterns)) {
        if (movesSoFar.includes(pattern)) {
          detectedOpening = opening;
        }
      }
    }

    return {
      name: detectedOpening?.name || 'Unusual Opening',
      ecoCode: detectedOpening?.ecoCode || '',
      moves: firstTenMoves.length,
    };
  }

  /**
   * Record a game's opening
   */
  recordGame(pgn, moves, result) {
    const opening = OpeningTracker.extractOpening(moves);

    // Track frequency
    const key = opening.ecoCode || opening.name;
    if (!this.openingDatabase.has(key)) {
      this.openingDatabase.set(key, {
        name: opening.name,
        ecoCode: opening.ecoCode,
        count: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }

    const stats = this.openingDatabase.get(key);
    stats.count++;

    if (result === 'white-win') stats.wins++;
    else if (result === 'black-win') stats.losses++;
    else stats.draws++;

    // Track game sequence for repetition detection
    const gameSeq = {
      opening: key,
      moves: moves.length,
      result,
      timestamp: Date.now(),
    };

    this.gameSequences.push(gameSeq);
    if (this.gameSequences.length > this.maxHistorySize) {
      this.gameSequences.shift();
    }

    return opening;
  }

  /**
   * Detect if we're in a repetition cycle
   * Returns: { isRepetitive: boolean, frequency: number, lastN: number }
   */
  detectRepetition(threshold = 0.3) {
    if (this.gameSequences.length < 5) {
      return { isRepetitive: false, frequency: 0, lastN: this.gameSequences.length };
    }

    // Check last 10 games
    const lastN = Math.min(10, this.gameSequences.length);
    const recentGames = this.gameSequences.slice(-lastN);

    // Count opening frequency in recent games
    const openingCounts = {};
    for (const game of recentGames) {
      openingCounts[game.opening] = (openingCounts[game.opening] || 0) + 1;
    }

    const maxFrequency = Math.max(...Object.values(openingCounts));
    const repetitionRate = maxFrequency / lastN;

    return {
      isRepetitive: repetitionRate >= threshold,
      frequency: repetitionRate,
      lastN,
      dominantOpening: Object.keys(openingCounts).find(k => openingCounts[k] === maxFrequency),
    };
  }

  /**
   * Get opening statistics
   */
  getStatistics() {
    const sorted = Array.from(this.openingDatabase.values())
      .sort((a, b) => b.count - a.count);

    return {
      totalOpenings: this.openingDatabase.size,
      gamesPlayed: this.gameSequences.length,
      topOpenings: sorted.slice(0, 5),
      allOpenings: sorted,
    };
  }

  /**
   * Display opening diversity report
   */
  displayReport() {
    const stats = this.getStatistics();
    const repetition = this.detectRepetition();

    console.log('\n📚 Opening Diversity Report');
    console.log(`   Total Unique Openings: ${stats.totalOpenings}`);
    console.log(`   Games Analyzed: ${stats.gamesPlayed}`);
    console.log(`   Diversity Index: ${(stats.totalOpenings / stats.gamesPlayed * 100).toFixed(1)}%`);

    if (repetition.isRepetitive) {
      console.log(`   ⚠️  Repetition Detected: ${(repetition.frequency * 100).toFixed(0)}% same opening (last ${repetition.lastN} games)`);
    } else {
      console.log(`   ✅ Good Diversity: ${(repetition.frequency * 100).toFixed(0)}% most frequent`);
    }

    console.log('\n   Top Openings:');
    for (const opening of stats.topOpenings) {
      const winRate = opening.count > 0 ? (opening.wins / opening.count * 100).toFixed(0) : '0';
      console.log(`     ${opening.name.padEnd(25)} : ${opening.count.toString().padStart(3)} games (${winRate}% wins)`);
    }
  }
}

export { OpeningTracker };
