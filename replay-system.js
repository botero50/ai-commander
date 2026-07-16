/**
 * Replay System — Saves and replays critical chess moments
 *
 * Captures:
 * - Checkmate sequences
 * - Queen sacrifices
 * - Brilliant moves
 * - Tactical sequences
 *
 * Replays:
 * - Move-by-move
 * - With commentary
 * - Full game context
 * - Time-based playback
 */

export class ReplaySystem {
  constructor() {
    this.replays = [];
    this.currentPosition = null;
    this.moveSequence = [];
  }

  /**
   * Replay types
   */
  static ReplayType = {
    CHECKMATE: 'checkmate',
    QUEEN_SACRIFICE: 'queen-sacrifice',
    BRILLIANT_MOVE: 'brilliant-move',
    TACTICAL_SEQUENCE: 'tactical-sequence',
    PROMOTION: 'promotion',
    BLUNDER: 'blunder',
  };

  /**
   * Save a replay for a critical moment
   * @param {Object} replayData - Replay information
   * @param {string} replayData.type - Replay type
   * @param {Array} replayData.movesToReplay - Moves to include
   * @param {string} replayData.criticality - Which move is critical
   * @param {string} replayData.description - Replay description
   * @param {string} replayData.player - Player making critical move
   * @returns {Object} Saved replay
   */
  saveReplay(replayData) {
    const replay = {
      id: `replay-${Date.now()}`,
      type: replayData.type,
      moves: replayData.movesToReplay || [],
      criticalMoveIndex: replayData.criticality || replayData.movesToReplay?.length - 1,
      description: replayData.description,
      player: replayData.player,
      timestamp: Date.now(),
      status: 'saved',
    };

    this.replays.push(replay);
    return replay;
  }

  /**
   * Generate replay for checkmate sequence
   * @param {Array} moves - Recent moves leading to checkmate
   * @param {string} winner - Winning player
   * @returns {Object} Checkmate replay
   */
  generateCheckmateReplay(moves, winner) {
    return this.saveReplay({
      type: ReplaySystem.ReplayType.CHECKMATE,
      movesToReplay: moves.slice(-5), // Last 5 moves
      criticality: moves.length - 1,
      description: `Checkmate sequence: ${winner} delivers mate`,
      player: winner,
    });
  }

  /**
   * Generate replay for queen sacrifice
   * @param {Array} moves - Recent moves with sacrifice
   * @param {string} sacrificer - Player sacrificing queen
   * @returns {Object} Sacrifice replay
   */
  generateSacrificeReplay(moves, sacrificer) {
    return this.saveReplay({
      type: ReplaySystem.ReplayType.QUEEN_SACRIFICE,
      movesToReplay: moves.slice(-4), // 4 moves around sacrifice
      criticality: moves.length - 1,
      description: `Queen sacrifice by ${sacrificer}`,
      player: sacrificer,
    });
  }

  /**
   * Generate replay for tactical sequence
   * @param {Array} moves - Tactical moves
   * @param {string} player - Player executing tactic
   * @param {string} tacticType - Type of tactic (fork, pin, etc.)
   * @returns {Object} Tactical replay
   */
  generateTacticalReplay(moves, player, tacticType) {
    return this.saveReplay({
      type: ReplaySystem.ReplayType.TACTICAL_SEQUENCE,
      movesToReplay: moves.slice(-3), // 3-move sequence
      criticality: moves.length - 1,
      description: `${tacticType} by ${player}`,
      player: player,
    });
  }

  /**
   * Play a replay move-by-move
   * @param {Object} replay - Replay to play
   * @param {number} speed - Playback speed (1 = normal, 2 = fast)
   */
  async playReplay(replay, speed = 1) {
    console.log('\n' + '═'.repeat(60));
    console.log(`  🎬 REPLAY: ${replay.description}`);
    console.log('═'.repeat(60) + '\n');

    for (let i = 0; i < replay.moves.length; i++) {
      const move = replay.moves[i];
      const moveNumber = i + 1;
      const isCritical = i === replay.criticalMoveIndex;

      // Display move
      const marker = isCritical ? '⭐' : '  ';
      console.log(`  ${marker} Move ${moveNumber}: ${move}`);

      // Delay between moves (based on speed)
      const delay = Math.floor(500 / speed); // 500ms at speed 1
      await this.delay(delay);

      // Highlight critical move
      if (isCritical) {
        console.log(`\n  🎯 CRITICAL MOMENT: ${replay.description}\n`);
        await this.delay(1000);
      }
    }

    console.log('═'.repeat(60) + '\n');
  }

  /**
   * Get all replays of a type
   * @param {string} type - Replay type
   * @returns {Array} Matching replays
   */
  getReplays(type = null) {
    if (!type) {
      return this.replays;
    }
    return this.replays.filter((r) => r.type === type);
  }

  /**
   * Get statistics on replays
   * @returns {Object} Replay statistics
   */
  getReplayStats() {
    const stats = {
      total: this.replays.length,
      byType: {},
      byPlayer: {},
    };

    for (const replay of this.replays) {
      // Count by type
      stats.byType[replay.type] = (stats.byType[replay.type] || 0) + 1;

      // Count by player
      stats.byPlayer[replay.player] = (stats.byPlayer[replay.player] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get most critical replay
   * @returns {Object} Most critical replay
   */
  getMostCriticalReplay() {
    // Rank by type criticality
    const criticality = {
      [ReplaySystem.ReplayType.CHECKMATE]: 5,
      [ReplaySystem.ReplayType.QUEEN_SACRIFICE]: 4,
      [ReplaySystem.ReplayType.BRILLIANT_MOVE]: 3,
      [ReplaySystem.ReplayType.TACTICAL_SEQUENCE]: 2,
      [ReplaySystem.ReplayType.PROMOTION]: 1,
      [ReplaySystem.ReplayType.BLUNDER]: 2,
    };

    return this.replays.reduce((best, current) => {
      const currentScore = criticality[current.type] || 0;
      const bestScore = criticality[best.type] || 0;
      return currentScore > bestScore ? current : best;
    }, this.replays[0]);
  }

  /**
   * Display replay summary
   */
  displayReplaySummary() {
    const stats = this.getReplayStats();

    console.log('\n' + '═'.repeat(60));
    console.log('  📹 REPLAY SUMMARY');
    console.log('═'.repeat(60));
    console.log(`\n  Total Replays Captured: ${stats.total}`);

    if (stats.total > 0) {
      console.log('\n  By Type:');
      for (const [type, count] of Object.entries(stats.byType)) {
        console.log(`    • ${type}: ${count}`);
      }

      console.log('\n  By Player:');
      for (const [player, count] of Object.entries(stats.byPlayer)) {
        console.log(`    • ${player}: ${count} moments`);
      }

      const mostCritical = this.getMostCriticalReplay();
      if (mostCritical) {
        console.log(`\n  Most Critical Moment:`);
        console.log(`    ${mostCritical.description}`);
      }
    }

    console.log('\n' + '═'.repeat(60) + '\n');
  }

  /**
   * Export replay as PGN-style notation
   * @param {Object} replay - Replay to export
   * @returns {string} PGN notation
   */
  exportReplayAsPGN(replay) {
    return `[Event "${replay.description}"]\n[Type "${replay.type}"]\n[Moves "${replay.moves.join(' ')}"]\n`;
  }

  /**
   * Clear all replays
   */
  reset() {
    this.replays = [];
    this.currentPosition = null;
    this.moveSequence = [];
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default ReplaySystem;
