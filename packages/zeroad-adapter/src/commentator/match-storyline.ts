/**
 * Match Storyline
 * Tracks narrative arc and generates meta-commentary about the match
 */

import { EventDetector, DetectedEvent } from '../director/event-detector.js';
import { GameState } from '../state/state-types.js';

export type MatchPhase = 'opening' | 'economic_race' | 'mid_game_pressure' | 'turning_point' | 'final_push' | 'victory';

export interface PhaseEvent {
  tick: number;
  timestamp: number;
  type: string;
  title: string;
  importance: number;
}

export interface MatchPhaseData {
  phase: MatchPhase;
  startTick: number;
  startTimestamp: number;
  endTick: number;
  endTimestamp: number;
  events: PhaseEvent[];
  dominantPlayer: number | null; // Which player is winning this phase
  keyMoment: PhaseEvent | null; // The turning point within phase
}

export interface StorylineState {
  currentPhase: MatchPhase;
  phaseStartTick: number;
  phases: MatchPhaseData[];
  winner: number | null;
  narrative: string[];
}

/**
 * Tracks match narrative arc and generates story-based commentary
 */
export class MatchStoryline {
  private detector: EventDetector;
  private phases: MatchPhaseData[] = [];
  private currentPhase: MatchPhase = 'opening';
  private phaseStartTick = 0;
  private phaseStartTimestamp = 0;
  private narrative: string[] = [];
  private playerStats: Record<number, { expansions: number; attacks: number; techs: number; losses: number }> = {
    1: { expansions: 0, attacks: 0, techs: 0, losses: 0 },
    2: { expansions: 0, attacks: 0, techs: 0, losses: 0 },
  };
  private technologyTimestamps: Record<number, number> = { 1: 0, 2: 0 };
  private militaryAdvantageHolder: number | null = null;
  private firstAttackTick = -1;

  constructor() {
    this.detector = new EventDetector();
    this.startPhase('opening', 0, 0);
  }

  /**
   * Update storyline with game state
   */
  update(state: GameState): void {
    // Detect events
    const events = this.detector.detect(state);

    // Categorize events
    for (const event of events) {
      this.categorizeEvent(event);
    }

    // Check for phase transitions
    this.updatePhase(state);
  }

  /**
   * Categorize event for statistics
   */
  private categorizeEvent(event: DetectedEvent): void {
    if (!event.playerId) return;

    const stats = this.playerStats[event.playerId];
    if (!stats) return;

    switch (event.type) {
      case 'expansion':
      case 'first_scout':
        stats.expansions++;
        break;
      case 'technology_complete':
      case 'cavalry_arrival':
        stats.techs++;
        this.technologyTimestamps[event.playerId] = event.timestamp;
        break;
      case 'base_attack':
      case 'siege_initiated':
        stats.attacks++;
        if (this.firstAttackTick === -1) {
          this.firstAttackTick = event.tick;
        }
        break;
      case 'unit_loss':
        stats.losses++;
        break;
      case 'military_advantage':
        this.militaryAdvantageHolder = event.playerId;
        break;
    }
  }

  /**
   * Update match phase based on tick and events
   */
  private updatePhase(state: GameState): void {
    const matchTime = state.timestamp;
    const phase = this.determinePhase(state, matchTime);

    if (phase !== this.currentPhase) {
      this.endPhase(state.tick, state.timestamp);
      this.startPhase(phase, state.tick, state.timestamp);
    }
  }

  /**
   * Determine current phase based on game state
   */
  private determinePhase(state: GameState, matchTime: number): MatchPhase {
    const criticalEvents = this.detector.getCriticalEvents();

    // Victory: Someone eliminated
    const eliminationEvent = criticalEvents.find((e) => e.type === 'player_elimination');
    if (eliminationEvent) {
      return 'victory';
    }

    // Final push: Wonder construction or massive army
    const wonderEvent = criticalEvents.find((e) => e.type === 'wonder_construction');
    const victoryPushEvent = criticalEvents.find((e) => e.type === 'victory_push');
    if (wonderEvent || victoryPushEvent) {
      return 'final_push';
    }

    // Turning point: Major battle or advantage shift
    const largeEvent = criticalEvents.find((e) =>
      ['large_battle', 'military_advantage'].includes(e.type)
    );
    if (largeEvent && matchTime > 120000) {
      // After 2 minutes
      return 'turning_point';
    }

    // Mid-game pressure: First attack has happened
    if (this.firstAttackTick !== -1 && matchTime > 60000) {
      // After 1 minute
      return 'mid_game_pressure';
    }

    // Economic race: Early game, no attacks yet
    if (matchTime > 30000) {
      // After 30 seconds
      return 'economic_race';
    }

    return 'opening';
  }

  /**
   * Start new phase
   */
  private startPhase(phase: MatchPhase, tick: number, timestamp: number): void {
    this.currentPhase = phase;
    this.phaseStartTick = tick;
    this.phaseStartTimestamp = timestamp;

    // Generate phase introduction
    const intro = this.generatePhaseIntroduction(phase);
    if (intro) {
      this.narrative.push(intro);
    }
  }

  /**
   * End current phase
   */
  private endPhase(endTick: number, endTimestamp: number): void {
    const phaseData: MatchPhaseData = {
      phase: this.currentPhase,
      startTick: this.phaseStartTick,
      startTimestamp: this.phaseStartTimestamp,
      endTick,
      endTimestamp,
      events: [], // Would be populated from detector
      dominantPlayer: this.identifyDominantPlayer(),
      keyMoment: null,
    };

    this.phases.push(phaseData);

    // Generate phase summary
    const summary = this.generatePhaseSummary(phaseData);
    if (summary) {
      this.narrative.push(summary);
    }
  }

  /**
   * Identify which player was dominant in current phase
   */
  private identifyDominantPlayer(): number | null {
    const stats1 = this.playerStats[1];
    const stats2 = this.playerStats[2];

    if (!stats1 || !stats2) return null;

    // Score based on phase-appropriate actions
    let score1 = 0;
    let score2 = 0;

    switch (this.currentPhase) {
      case 'opening':
      case 'economic_race':
        // Expansions matter
        score1 = stats1.expansions * 10;
        score2 = stats2.expansions * 10;
        break;

      case 'mid_game_pressure':
        // Tech and attacks matter
        score1 = stats1.techs * 15 + stats1.attacks * 20;
        score2 = stats2.techs * 15 + stats2.attacks * 20;
        break;

      case 'turning_point':
        // Military advantage matters
        score1 = this.militaryAdvantageHolder === 1 ? 100 : 0;
        score2 = this.militaryAdvantageHolder === 2 ? 100 : 0;
        break;

      case 'final_push':
      case 'victory':
        // Who has initiative
        score1 = stats1.attacks * 20;
        score2 = stats2.attacks * 20;
        break;
    }

    if (score1 > score2) return 1;
    if (score2 > score1) return 2;
    return null;
  }

  /**
   * Generate introduction for phase
   */
  private generatePhaseIntroduction(phase: MatchPhase): string {
    const intros: Record<MatchPhase, string[]> = {
      opening: [
        'The match begins! Both players send out scouts.',
        'Early game is underway. The race for resources begins.',
        'The opening moves are critical. Who will secure early advantage?',
      ],

      economic_race: [
        'Now entering the economic phase. Both players are expanding.',
        'The economy becomes the focus. Who can boom faster?',
        'Both civilizations are growing. The race accelerates.',
      ],

      mid_game_pressure: [
        'Mid-game pressure! The first armies clash.',
        'Technology and military tactics take center stage.',
        'Aggression emerges. Military forces are being deployed.',
      ],

      turning_point: [
        'This is the turning point! The match could go either way.',
        'One player gains critical advantage.',
        'The tide of battle shifts. Momentum is everything now.',
      ],

      final_push: [
        'The endgame! One player makes their final assault.',
        'Victory is within reach. This is the moment that decides it.',
        'All-in! Everything comes down to this final clash.',
      ],

      victory: [
        'And that\'s the match! Victory is decided!',
        'The victor emerges! The match is over.',
        'Final victory goes to the superior player.',
      ],
    };

    const options = intros[phase] || [];
    return options[Math.floor(Math.random() * options.length)] || '';
  }

  /**
   * Generate summary for phase
   */
  private generatePhaseSummary(phase: MatchPhaseData): string {
    if (!phase.dominantPlayer) return '';

    const playerName = phase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
    const stats = this.playerStats[phase.dominantPlayer];

    switch (phase.phase) {
      case 'opening':
        return `${playerName} gets off to a good start.`;

      case 'economic_race':
        if (stats.expansions > 1) {
          return `${playerName} expands aggressively, building economic momentum.`;
        }
        return `${playerName} focuses on steady expansion.`;

      case 'mid_game_pressure':
        if (stats.attacks > 0) {
          return `${playerName} takes the initiative with aggressive attacks!`;
        }
        return `${playerName} pressures the opponent's defenses.`;

      case 'turning_point':
        return `${playerName} gains the advantage at this critical moment!`;

      case 'final_push':
        return `${playerName} commits everything to achieve victory!`;

      case 'victory':
        return `${playerName} achieves victory through superior strategy!`;

      default:
        return '';
    }
  }

  /**
   * Generate full match story
   */
  generateMatchStory(): string {
    const storyLines: string[] = [];

    storyLines.push('=== MATCH STORY ===\n');

    // Opening summary
    storyLines.push('OPENING:');
    const openingPhase = this.phases.find((p) => p.phase === 'opening');
    if (openingPhase?.dominantPlayer) {
      const name = openingPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      storyLines.push(`${name} gets the better opening, securing early resource advantage.`);
    } else {
      storyLines.push('Both players begin with equal footing.');
    }

    storyLines.push('');

    // Economic phase
    storyLines.push('ECONOMY:');
    const economicPhase = this.phases.find((p) => p.phase === 'economic_race');
    if (economicPhase?.dominantPlayer) {
      const name = economicPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      const stats = this.playerStats[economicPhase.dominantPlayer];
      storyLines.push(`${name} executes an aggressive expansion strategy with ${stats.expansions} settlements.`);
    }

    storyLines.push('');

    // Mid-game
    storyLines.push('MID-GAME:');
    const midPhase = this.phases.find((p) => p.phase === 'mid_game_pressure');
    if (midPhase?.dominantPlayer) {
      const name = midPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      const otherName = midPhase.dominantPlayer === 1 ? 'Player 2' : 'Player 1';
      const stats = this.playerStats[midPhase.dominantPlayer];

      if (stats.techs > 0) {
        storyLines.push(
          `${name} unlocks advanced military units, forcing ${otherName} into a defensive posture.`
        );
      }
      if (stats.attacks > 0) {
        storyLines.push(`${name} initiates aggressive attacks against ${otherName}'s settlements.`);
      }
    }

    storyLines.push('');

    // Turning point
    storyLines.push('TURNING POINT:');
    const turningPhase = this.phases.find((p) => p.phase === 'turning_point');
    if (turningPhase?.dominantPlayer) {
      const name = turningPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      storyLines.push(`${name} seizes military supremacy at the critical moment!`);
    }

    storyLines.push('');

    // Final push
    storyLines.push('FINAL ASSAULT:');
    const finalPhase = this.phases.find((p) => p.phase === 'final_push');
    if (finalPhase?.dominantPlayer) {
      const name = finalPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      storyLines.push(`${name} launches an overwhelming final attack!`);
    }

    storyLines.push('');

    // Victory
    storyLines.push('VICTORY:');
    const victoryPhase = this.phases.find((p) => p.phase === 'victory');
    if (victoryPhase?.dominantPlayer) {
      const name = victoryPhase.dominantPlayer === 1 ? 'Player 1' : 'Player 2';
      storyLines.push(`${name} emerges victorious!`);
    }

    return storyLines.join('\n');
  }

  /**
   * Get narrative text
   */
  getNarrative(): string[] {
    return [...this.narrative];
  }

  /**
   * Get all phases
   */
  getPhases(): MatchPhaseData[] {
    return [...this.phases];
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): MatchPhase {
    return this.currentPhase;
  }

  /**
   * Get player statistics
   */
  getPlayerStats(): Record<number, { expansions: number; attacks: number; techs: number; losses: number }> {
    return JSON.parse(JSON.stringify(this.playerStats));
  }

  /**
   * Get storyline state
   */
  getState(): StorylineState {
    return {
      currentPhase: this.currentPhase,
      phaseStartTick: this.phaseStartTick,
      phases: this.phases,
      winner: this.phases.find((p) => p.phase === 'victory')?.dominantPlayer || null,
      narrative: this.narrative,
    };
  }

  /**
   * Get event history
   */
  getEventHistory() {
    return this.detector.getEventHistory();
  }

  /**
   * Reset storyline
   */
  reset(): void {
    this.detector.reset();
    this.phases = [];
    this.currentPhase = 'opening';
    this.phaseStartTick = 0;
    this.phaseStartTimestamp = 0;
    this.narrative = [];
    this.playerStats = {
      1: { expansions: 0, attacks: 0, techs: 0, losses: 0 },
      2: { expansions: 0, attacks: 0, techs: 0, losses: 0 },
    };
    this.technologyTimestamps = { 1: 0, 2: 0 };
    this.militaryAdvantageHolder = null;
    this.firstAttackTick = -1;
  }
}
