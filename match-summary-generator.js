/**
 * Match Summary Generator — Creates comprehensive post-match summaries
 *
 * Generates:
 * - Winner announcement
 * - Opening identification
 * - Game statistics
 * - Decisive moments
 * - Rating predictions
 * - Next match preview
 */

export class MatchSummaryGenerator {
  constructor() {
    this.openings = this.initializeOpenings();
  }

  /**
   * Common chess openings (first 3 moves)
   */
  initializeOpenings() {
    return {
      // Italian Game
      'e2-e4_e7-e5_g1-f3': { name: 'Italian Game', type: 'Open Game', difficulty: 'Intermediate' },

      // Ruy Lopez
      'e2-e4_e7-e5_g1-f3_b8-c6_f1-b5': { name: 'Ruy Lopez', type: 'Open Game', difficulty: 'Advanced' },

      // French Defense
      'e2-e4_e7-e6_d2-d4': { name: 'French Defense', type: 'Semi-Open', difficulty: 'Intermediate' },

      // Sicilian Defense
      'e2-e4_c7-c5_g1-f3': { name: 'Sicilian Defense', type: 'Semi-Open', difficulty: 'Advanced' },

      // King's Indian
      'd2-d4_g8-f6_c2-c4_g7-g6': { name: "King's Indian Defense", type: 'Indian', difficulty: 'Advanced' },

      // Queen's Gambit
      'd2-d4_d7-d5_c2-c4': { name: "Queen's Gambit", type: 'Closed Game', difficulty: 'Intermediate' },

      // English Opening
      'c2-c4_e7-e5_g1-f3': { name: 'English Opening', type: 'Closed Game', difficulty: 'Intermediate' },

      // Caro-Kann
      'd2-d4_c7-c6_c2-c4': { name: 'Caro-Kann Defense', type: 'Semi-Closed', difficulty: 'Intermediate' },
    };
  }

  /**
   * Generate complete match summary
   * @param {Object} matchData - Match information
   * @param {string} matchData.white - White player
   * @param {string} matchData.black - Black player
   * @param {string} matchData.result - 'white-win' | 'black-win' | 'draw'
   * @param {Array} matchData.moves - List of moves
   * @param {number} matchData.durationMs - Game duration
   * @param {Array} matchData.replays - Captured replays
   * @returns {Object} Complete summary
   */
  generateSummary(matchData) {
    const moves = matchData.moves || [];
    const replays = matchData.replays || [];

    // Detect opening
    const opening = this.detectOpening(moves);

    // Calculate statistics
    const stats = this.calculateStatistics(moves, matchData.durationMs);

    // Identify decisive moment
    const decisiveMoment = this.findDecisiveMoment(moves, matchData.result, replays);

    // Get critical moments
    const criticalMoments = this.extractCriticalMoments(replays);

    // Predict rating changes
    const ratingPrediction = this.predictRatingChanges(matchData, stats);

    return {
      players: {
        white: matchData.white,
        black: matchData.black,
      },
      result: matchData.result,
      winner: this.getWinnerName(matchData),
      opening,
      statistics: stats,
      decisiveMoment,
      criticalMoments,
      ratingPrediction,
      timestamp: Date.now(),
    };
  }

  /**
   * Detect opening from first few moves
   */
  detectOpening(moves) {
    if (!moves || moves.length < 3) {
      return { name: 'Unknown', type: 'Unknown', confidence: 0 };
    }

    // Try exact match with first 3 moves
    const key = moves.slice(0, 3).join('_');
    if (this.openings[key]) {
      return { ...this.openings[key], confidence: 1.0 };
    }

    // Try pattern matching with first 2 moves
    if (moves[0] === 'e2-e4') {
      if (moves[1] === 'e7-e5') {
        return { name: 'Open Game', type: 'Semi-Open', confidence: 0.8 };
      } else if (moves[1] === 'c7-c5') {
        return { name: 'Sicilian-style', type: 'Semi-Open', confidence: 0.7 };
      } else {
        return { name: 'e4 Opening', type: 'Open', confidence: 0.6 };
      }
    } else if (moves[0] === 'd2-d4') {
      return { name: 'Queen Pawn Opening', type: 'Closed', confidence: 0.6 };
    } else if (moves[0] === 'c2-c4') {
      return { name: 'English Opening', type: 'Closed', confidence: 0.5 };
    }

    return { name: 'Irregular Opening', type: 'Unknown', confidence: 0.3 };
  }

  /**
   * Calculate game statistics
   */
  calculateStatistics(moves, durationMs) {
    const moveCount = moves.length;
    const turnCount = Math.ceil(moveCount / 2);
    const durationSeconds = (durationMs || 0) / 1000;
    const avgTimePerMove = moveCount > 0 ? durationSeconds / moveCount : 0;

    // Count captures (moves with 'x' notation)
    const captureCount = moves.filter(m => m && m.includes('x')).length;

    // Count checks
    const checkCount = moves.filter(m => m && m.includes('+')).length;

    // Count piece movement patterns
    const pawnMoves = moves.filter(m => /^[a-h][2-7]-[a-h][3-8]$/.test(m) || /^[a-h]/.test(m) && m.length === 5).length;

    // Average moves per player
    const whiteMovesCount = Math.ceil(moveCount / 2);
    const blackMovesCount = Math.floor(moveCount / 2);

    return {
      totalMoves: moveCount,
      totalTurns: turnCount,
      whiteMovesCount,
      blackMovesCount,
      captureCount,
      checkCount,
      pawnMovesCount: pawnMoves,
      durationSeconds: Math.round(durationSeconds),
      avgTimePerMove: avgTimePerMove.toFixed(2),
      avgMovesPerMinute: ((moveCount / durationSeconds) * 60).toFixed(1) || 'N/A',
    };
  }

  /**
   * Find the decisive moment (where winner gained advantage)
   */
  findDecisiveMoment(moves, result, replays) {
    // If we have replays, the most critical one is likely the decisive moment
    if (replays && replays.length > 0) {
      const mostCritical = replays.reduce((best, current) => {
        const criticalityMap = {
          checkmate: 10,
          'queen-sacrifice': 8,
          'brilliant-move': 7,
          'tactical-sequence': 5,
          promotion: 4,
          blunder: 3,
        };

        const currentScore = criticalityMap[current.type] || 0;
        const bestScore = criticalityMap[best.type] || 0;
        return currentScore > bestScore ? current : best;
      });

      if (mostCritical) {
        return {
          type: mostCritical.type,
          description: mostCritical.description,
          moveIndex: moves.length - 2,
          turn: Math.ceil((moves.length - 2) / 2),
        };
      }
    }

    // Default: decisive moment is near end if win, or in endgame if draw
    const moveIndex = Math.max(0, moves.length - 5);
    return {
      type: 'game-conclusion',
      description: result === 'draw' ? 'Draw reached' : 'Winning position established',
      moveIndex,
      turn: Math.ceil(moveIndex / 2),
    };
  }

  /**
   * Extract critical moments from replays
   */
  extractCriticalMoments(replays) {
    if (!replays || replays.length === 0) {
      return [];
    }

    // Sort by criticality and take top 3
    const criticalityMap = {
      checkmate: 10,
      'queen-sacrifice': 8,
      'brilliant-move': 7,
      'tactical-sequence': 5,
      promotion: 4,
      blunder: 3,
    };

    return replays
      .map(r => ({
        ...r,
        score: criticalityMap[r.type] || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(r => ({
        type: r.type,
        description: r.description,
        player: r.player,
      }));
  }

  /**
   * Predict rating changes (simplified)
   */
  predictRatingChanges(matchData, stats) {
    const baseRatingChange = 8; // K-factor simplified
    const result = matchData.result;

    let whiteChange = 0;
    let blackChange = 0;

    if (result === 'white-win') {
      whiteChange = baseRatingChange;
      blackChange = -baseRatingChange;
    } else if (result === 'black-win') {
      blackChange = baseRatingChange;
      whiteChange = -baseRatingChange;
    } else {
      // Draw: smaller change
      whiteChange = 0;
      blackChange = 0;
    }

    // Adjust based on game length (longer games more impactful)
    const lengthFactor = Math.min(1.5, stats.totalTurns / 20);
    whiteChange = Math.round(whiteChange * lengthFactor);
    blackChange = Math.round(blackChange * lengthFactor);

    return {
      white: {
        change: whiteChange,
        direction: whiteChange > 0 ? '↑' : whiteChange < 0 ? '↓' : '→',
      },
      black: {
        change: blackChange,
        direction: blackChange > 0 ? '↑' : blackChange < 0 ? '↓' : '→',
      },
    };
  }

  /**
   * Get winner name
   */
  getWinnerName(matchData) {
    if (matchData.result === 'white-win') {
      return matchData.white;
    } else if (matchData.result === 'black-win') {
      return matchData.black;
    } else {
      return 'Draw';
    }
  }

  /**
   * Display summary professionally
   */
  displaySummary(summary) {
    const isWhiteWin = summary.result === 'white-win';
    const isBlackWin = summary.result === 'black-win';
    const isDraw = summary.result === 'draw';

    // Result line
    let resultLine = '';
    if (isWhiteWin) {
      resultLine = `🏆 ${summary.players.white.toUpperCase()} WINS`;
    } else if (isBlackWin) {
      resultLine = `🏆 ${summary.players.black.toUpperCase()} WINS`;
    } else {
      resultLine = `🤝 DRAW`;
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`  ${resultLine}`);
    console.log('═'.repeat(60));

    // Matchup
    console.log(`\n  ${summary.players.white} vs ${summary.players.black}`);

    // Opening
    console.log(`\n  📖 Opening: ${summary.opening.name}`);
    console.log(`     Type: ${summary.opening.type}`);

    // Statistics
    console.log(`\n  📊 Statistics:`);
    console.log(`     Moves: ${summary.statistics.totalMoves} (${summary.statistics.whiteMovesCount} by White, ${summary.statistics.blackMovesCount} by Black)`);
    console.log(`     Duration: ${summary.statistics.durationSeconds}s`);
    console.log(`     Avg Time/Move: ${summary.statistics.avgTimePerMove}s`);
    console.log(`     Captures: ${summary.statistics.captureCount}`);
    console.log(`     Checks: ${summary.statistics.checkCount}`);

    // Decisive moment
    console.log(`\n  ⚔️  Decisive Moment:`);
    console.log(`     Type: ${summary.decisiveMoment.type}`);
    console.log(`     Move: ${summary.decisiveMoment.turn}`);
    console.log(`     ${summary.decisiveMoment.description}`);

    // Critical moments
    if (summary.criticalMoments.length > 0) {
      console.log(`\n  ✨ Critical Moments:`);
      summary.criticalMoments.forEach((moment, i) => {
        console.log(`     ${i + 1}. ${moment.description} (${moment.player})`);
      });
    }

    // Rating predictions
    console.log(`\n  📈 Rating Impact:`);
    console.log(`     ${summary.players.white}: ${summary.ratingPrediction.white.direction} ${summary.ratingPrediction.white.change > 0 ? '+' : ''}${summary.ratingPrediction.white.change}`);
    console.log(`     ${summary.players.black}: ${summary.ratingPrediction.black.direction} ${summary.ratingPrediction.black.change > 0 ? '+' : ''}${summary.ratingPrediction.black.change}`);

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  /**
   * Export summary as JSON
   */
  exportAsJSON(summary) {
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Generate next match preview
   */
  generateNextMatchPreview(upcomingMatch) {
    if (!upcomingMatch) {
      return {
        white: 'TBD',
        black: 'TBD',
        timeControl: 'TBD',
      };
    }

    return {
      white: upcomingMatch.white,
      black: upcomingMatch.black,
      personality_white: upcomingMatch.whitePersonality || 'Unknown',
      personality_black: upcomingMatch.blackPersonality || 'Unknown',
      timeControl: upcomingMatch.timeControl || 'Unknown',
    };
  }

  /**
   * Display next match preview
   */
  displayNextMatchPreview(nextMatch) {
    console.log('\n  ➡️  Next Match Preview:');
    console.log(`     ${nextMatch.white} (${nextMatch.personality_white}) vs ${nextMatch.black} (${nextMatch.personality_black})`);
    console.log(`     Time Control: ${nextMatch.timeControl}`);
  }

  /**
   * Generate concise summary (one-liner)
   */
  generateBrief(summary) {
    const winner = summary.winner === 'Draw' ? '🤝 Draw' : `🏆 ${summary.winner}`;
    const moves = summary.statistics.totalMoves;
    const opening = summary.opening.name;

    return `${winner} in ${moves} moves (${opening})`;
  }
}

export default MatchSummaryGenerator;
