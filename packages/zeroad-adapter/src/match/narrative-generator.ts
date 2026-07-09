/**
 * Match Narrative Generator
 *
 * Generates post-game narrative that explains the match arc:
 * - Opening: Initial strategies
 * - Early game: First tech race, early military
 * - Mid game: Army building, skirmishes
 * - Turning points: Key moments that shifted momentum
 * - Late game: Final push, overwhelming forces
 * - Conclusion: Why the winner won
 *
 * Never exposes AI reasoning—only observable facts from game state.
 */

import type { TournamentMatchResult } from '../tournament/tournament-runner.js';

/**
 * Single narrative segment
 */
export interface NarrativeEntry {
  readonly phase: 'opening' | 'early' | 'mid' | 'turning_point' | 'late' | 'conclusion';
  readonly text: string; // E.g., "Blue invested heavily in economy while Red rushed military"
  readonly player: 'player1' | 'player2' | 'both';
  readonly tick: number;
  readonly timestamp: number;
  readonly confidence: number; // 0-1, how certain about this narrative
  readonly isKeyMoment: boolean;
  readonly metrics?: {
    readonly resourcesPerSecond?: number;
    readonly unitsCreated?: number;
    readonly unitsLost?: number;
    readonly buildingsCreated?: number;
    readonly resourceGapToOpponent?: number;
  };
}

/**
 * Match narrative generator (post-game analysis)
 */
export class NarrativeGenerator {
  private entries: NarrativeEntry[] = [];

  constructor(
    private matchResult: TournamentMatchResult,
    private logger?: { info: (msg: string) => void; warn: (msg: string) => void }
  ) {
    this.log('Narrative generator created');
  }

  /**
   * Generate full narrative from match data
   */
  generate(): NarrativeEntry[] {
    this.entries = [];

    if (!this.matchResult) {
      return [];
    }

    this.log('Generating match narrative');

    try {
      // Generate narrative for each phase
      this.generateOpening();
      this.generateEarlyGame();
      this.generateMidGame();
      this.generateLateGame();
      this.generateConclusion();
    } catch (err) {
      this.log(`Error generating narrative: ${err}`);
    }

    return this.entries;
  }

  /**
   * Generate opening narrative (first few minutes)
   */
  private generateOpening(): void {
    const p1Name = this.getPlayerName('player1');
    const p2Name = this.getPlayerName('player2');
    const p1Commands = this.matchResult.player1Commands;
    const p2Commands = this.matchResult.player2Commands;

    // Infer strategy from command patterns
    const p1IsAggressive = p1Commands > p2Commands;

    let text = '';
    if (p1IsAggressive) {
      text = `${p1Name} opened with a more aggressive approach, issuing many commands quickly, while ${p2Name} took a measured pace.`;
    } else {
      text = `Both players opened cautiously, managing their units and resources at a measured pace.`;
    }

    this.addEntry({
      phase: 'opening',
      text,
      player: 'both',
      tick: 0,
      timestamp: this.matchResult.timestamp,
      confidence: 0.72,
      isKeyMoment: false,
    });
  }

  /**
   * Generate early game narrative (tech race, first units)
   */
  private generateEarlyGame(): void {
    const p1Name = this.getPlayerName('player1');
    const p2Name = this.getPlayerName('player2');
    const p1Errors = this.matchResult.player1Errors;
    const p2Errors = this.matchResult.player2Errors;

    // Track execution quality
    const p1CleanStart = p1Errors === 0;
    const p2CleanStart = p2Errors === 0;

    let text = '';
    if (p1CleanStart && !p2CleanStart) {
      text = `${p1Name} executed their early game flawlessly without errors, giving them a cleaner start than ${p2Name}.`;
    } else if (p2CleanStart && !p1CleanStart) {
      text = `${p2Name} had a smoother early phase with no execution errors, while ${p1Name} encountered some issues.`;
    } else {
      text = `Both players managed the early game phase without major execution problems.`;
    }

    this.addEntry({
      phase: 'early',
      text,
      player: 'both',
      tick: Math.floor(this.matchResult.duration * 0.2 / 33),
      timestamp: this.matchResult.timestamp,
      confidence: 0.70,
      isKeyMoment: false,
    });
  }

  /**
   * Generate mid-game narrative (army building, skirmishes)
   */
  private generateMidGame(): void {
    const p1Name = this.getPlayerName('player1');
    const p2Name = this.getPlayerName('player2');
    const totalCommands = this.matchResult.player1Commands + this.matchResult.player2Commands;

    // Who dominated mid-game command execution?
    const p1CommandShare = this.matchResult.player1Commands / totalCommands;
    const p1Dominant = p1CommandShare > 0.55;

    let text = '';
    if (p1Dominant) {
      text = `In the mid-game, ${p1Name} was issuing more commands and taking greater initiative, actively pushing their advantage over ${p2Name}.`;
    } else if (!p1Dominant && p1CommandShare < 0.45) {
      text = `${p2Name} seized the mid-game initiative, issuing significantly more commands and controlling the pace against ${p1Name}.`;
    } else {
      text = `The mid-game remained competitive, with both players issuing commands at a balanced rate.`;
    }

    this.addEntry({
      phase: 'mid',
      text,
      player: 'both',
      tick: Math.floor(this.matchResult.duration * 0.5 / 33),
      timestamp: this.matchResult.timestamp,
      confidence: 0.68,
      isKeyMoment: false,
    });
  }

  /**
   * Generate late game narrative (final push)
   */
  private generateLateGame(): void {
    const p1Name = this.getPlayerName('player1');
    const p2Name = this.getPlayerName('player2');
    const winner = this.matchResult.winner || 'unknown';

    if (winner === 'player1') {
      this.addEntry({
        phase: 'late',
        text: `${p1Name} dominated the late game, maintaining pressure and control to secure their victory against ${p2Name}.`,
        player: 'player1',
        tick: Math.floor(this.matchResult.duration * 0.75 / 33),
        timestamp: this.matchResult.timestamp,
        confidence: 0.80,
        isKeyMoment: false,
      });
    } else if (winner === 'player2') {
      this.addEntry({
        phase: 'late',
        text: `${p2Name} achieved dominance in the late game, controlling the final phase and securing the match victory.`,
        player: 'player2',
        tick: Math.floor(this.matchResult.duration * 0.75 / 33),
        timestamp: this.matchResult.timestamp,
        confidence: 0.80,
        isKeyMoment: false,
      });
    }
  }

  /**
   * Generate conclusion explaining why winner won
   */
  private generateConclusion(): void {
    const winner = this.matchResult.winner || 'unknown';
    const winnerName = this.getPlayerName(winner as 'player1' | 'player2');
    const loserName = winner === 'player1' ? this.getPlayerName('player2') : this.getPlayerName('player1');

    const winnerCommands = winner === 'player1'
      ? this.matchResult.player1Commands
      : this.matchResult.player2Commands;
    const winnerErrors = winner === 'player1'
      ? this.matchResult.player1Errors
      : this.matchResult.player2Errors;
    const loserCommands = winner === 'player1'
      ? this.matchResult.player2Commands
      : this.matchResult.player1Commands;

    let text = '';

    // Analyze why they won: execution quality, command volume, or error rate?
    if (winnerErrors === 0 && winner === 'player1' && this.matchResult.player2Errors > 0) {
      text = `${winnerName} achieved flawless execution without errors, while ${loserName} made critical mistakes that sealed their fate.`;
    } else if (winnerCommands > loserCommands * 1.15) {
      text = `${winnerName} took decisive action, issuing significantly more commands and controlling the game's pace, overpowering ${loserName}.`;
    } else {
      text = `${winnerName} emerged victorious, having managed their strategy more effectively than ${loserName} throughout the match.`;
    }

    this.addEntry({
      phase: 'conclusion',
      text,
      player: winner as 'player1' | 'player2',
      tick: Math.floor(this.matchResult.duration / 33),
      timestamp: this.matchResult.timestamp,
      confidence: 0.85,
      isKeyMoment: true,
    });
  }

  /**
   * Add entry and maintain order
   */
  private addEntry(entry: NarrativeEntry): void {
    this.entries.push(entry);
  }

  /**
   * Get player name from brain ID
   */
  private getPlayerName(playerId: 'player1' | 'player2'): string {
    const brainId = playerId === 'player1' ? this.matchResult.brain1Id : this.matchResult.brain2Id;
    // Try to extract a readable name from brain ID
    const parts = brainId.split('-');
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return playerId === 'player1' ? 'Blue' : 'Red';
  }

  /**
   * Log helper
   */
  private log(msg: string): void {
    if (this.logger) {
      this.logger.info(msg);
    }
  }
}
