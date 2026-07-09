/**
 * Live Commentary Engine
 * Generates real-time narration from detected game events
 */

import { EventDetector, DetectedEvent } from '../director/event-detector.js';
import { GameState } from '../state/state-types.js';

export interface CommentaryLine {
  id: string;
  tick: number;
  timestamp: number;
  text: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  speaker: 'narrator' | 'analyst';
  duration: number; // Estimated speech duration in ms
}

export interface CommentaryState {
  tick: number;
  timestamp: number;
  currentLine: CommentaryLine | null;
  recentLines: CommentaryLine[];
  totalLines: number;
}

/**
 * Generates live commentary from detected events
 */
export class LiveCommentaryEngine {
  private detector: EventDetector;
  private commentary: CommentaryLine[] = [];
  private commentaryIdCounter = 0;
  private lastCommentaryTick = 0;
  private readonly COMMENTARY_COOLDOWN = 500; // Min ms between commentary

  // Commentary templates by event type
  private templates: Record<string, string[]> = {
    army_collision: [
      '{p1} and {p2} armies clash!',
      'A major engagement is starting!',
      'The armies have met!',
      'Combat erupts across the battlefield!',
      'Two forces collide in battle!',
    ],

    first_scout: [
      '{p1} sends out a scout to explore.',
      'The first scout ventures into enemy territory.',
      '{p1} is expanding their vision.',
      'A scout is moving out to gather intelligence.',
    ],

    expansion: [
      '{p1} establishes a new settlement!',
      'Expansion underway for {p1}!',
      '{p1} is spreading their control.',
      'A new base for {p1}!',
      '{p1} expands their empire.',
    ],

    technology_complete: [
      '{p1} has unlocked new military units!',
      'Technology breakthrough for {p1}!',
      '{p1} now has access to advanced units.',
      'The tech race favors {p1}!',
      '{p1} gains a technological advantage.',
    ],

    base_attack: [
      'Attack incoming on {p1}!',
      '{p2} is attacking {p1}\'s base!',
      '{p1}\'s defenses are under siege!',
      'Danger! {p1}\'s structures are being destroyed!',
      '{p1} must defend immediately!',
    ],

    large_battle: [
      'A massive battle erupts!',
      'This is it! Major combat engagement!',
      'Dozens of units clash in epic battle!',
      'The biggest engagement of the match!',
      'Total war on the battlefield!',
    ],

    wonder_construction: [
      '{p1} starts construction on a Wonder!',
      'The race for victory begins! {p1} is building a Wonder!',
      '{p1} is making their push for victory!',
      'A Wonder is under construction!',
      'The path to victory is being built!',
    ],

    player_elimination: [
      '{p1} has been eliminated!',
      'It\'s over! {p1} is defeated!',
      '{p2} emerges victorious!',
      '{p1} has fallen! {p2} stands alone!',
    ],

    victory_push: [
      'This is the moment! {p1} launches a final assault!',
      '{p1} commits everything to victory!',
      'The endgame begins! {p1} is going all-in!',
      'Victory or defeat! {p1} makes their final push!',
      '{p1}\'s army converges on the enemy!',
    ],

    resource_spike: [
      '{p1} gains a sudden resource advantage!',
      'A resource windfall for {p1}!',
      '{p1}\'s economy surges!',
      'Resources are flowing for {p1}!',
    ],

    military_advantage: [
      '{p1} now has superior military force!',
      'The advantage shifts to {p1}!',
      '{p1}\'s army is now more powerful!',
      'Military supremacy for {p1}!',
    ],

    cavalry_arrival: [
      '{p1} deploys mounted units!',
      'Cavalry enters the battle!',
      '{p1}\'s mounted warriors arrive!',
      'The mobility advantage shifts to {p1}!',
    ],

    siege_initiated: [
      '{p2} sieges {p1}\'s fortification!',
      'Walls are under attack!',
      'A fortress is under siege!',
      '{p1}\'s defenses face assault!',
    ],

    unit_loss: [
      '{p1} suffers heavy casualties!',
      'Significant losses for {p1}!',
      '{p1}\'s units are being destroyed!',
      'The tide turns against {p1}!',
    ],
  };

  constructor() {
    this.detector = new EventDetector();
  }

  /**
   * Update commentary with game state
   */
  update(state: GameState): CommentaryLine[] {
    // Detect events
    const events = this.detector.detect(state);

    // Generate commentary for each event
    const newCommentary: CommentaryLine[] = [];

    for (const event of events) {
      // Apply cooldown to prevent spamming
      if (state.tick - this.lastCommentaryTick < this.COMMENTARY_COOLDOWN / 50) {
        continue; // Skip if too soon
      }

      const line = this.eventToCommentary(event, state);
      if (line) {
        newCommentary.push(line);
        this.lastCommentaryTick = state.tick;
      }
    }

    // Add to history
    this.commentary.push(...newCommentary);

    // Limit history
    if (this.commentary.length > 200) {
      this.commentary = this.commentary.slice(-200);
    }

    return newCommentary;
  }

  /**
   * Convert detected event to commentary
   */
  private eventToCommentary(event: DetectedEvent, state: GameState): CommentaryLine | null {
    // Get appropriate template
    const templates = this.templates[event.type];
    if (!templates || templates.length === 0) {
      return null;
    }

    // Pick random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Get player names
    const player1 = state.players[0]?.name || 'Player 1';
    const player2 = state.players[1]?.name || 'Player 2';

    // Fill in placeholders
    let text = template;
    text = text.replace('{p1}', event.playerId === 1 ? player1 : player2);
    text = text.replace('{p2}', event.playerId === 1 ? player2 : player1);

    // Estimate speech duration (rough: 150ms per word)
    const wordCount = text.split(' ').length;
    const duration = wordCount * 150;

    // Determine if analyst or narrator
    const speaker = event.severity === 'critical' ? 'analyst' : 'narrator';

    return {
      id: `commentary-${this.commentaryIdCounter++}`,
      tick: event.tick,
      timestamp: event.timestamp,
      text,
      eventType: event.type,
      severity: event.severity,
      speaker,
      duration,
    };
  }

  /**
   * Get all commentary
   */
  getAllCommentary(): CommentaryLine[] {
    return [...this.commentary];
  }

  /**
   * Get recent commentary lines
   */
  getRecentCommentary(count: number = 5): CommentaryLine[] {
    return this.commentary.slice(-count);
  }

  /**
   * Get commentary by event type
   */
  getCommentaryByType(eventType: string): CommentaryLine[] {
    return this.commentary.filter((c) => c.type === eventType);
  }

  /**
   * Get commentary by severity
   */
  getCommentaryBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): CommentaryLine[] {
    return this.commentary.filter((c) => c.severity === severity);
  }

  /**
   * Get commentary by speaker
   */
  getCommentaryBySpeaker(speaker: 'narrator' | 'analyst'): CommentaryLine[] {
    return this.commentary.filter((c) => c.speaker === speaker);
  }

  /**
   * Get commentary in time range
   */
  getCommentaryByTimeRange(startTick: number, endTick: number): CommentaryLine[] {
    return this.commentary.filter((c) => c.tick >= startTick && c.tick <= endTick);
  }

  /**
   * Calculate commentary density (lines per minute)
   */
  getCommentaryDensity(): number {
    if (this.commentary.length === 0) return 0;

    const firstTick = this.commentary[0].tick;
    const lastTick = this.commentary[this.commentary.length - 1].tick;
    const tickDuration = lastTick - firstTick;

    // Assume 50ms per tick, so 50ms * 1200 = 60s = 1 minute
    const duration = (tickDuration / 20) / 1000; // Convert to seconds, then to minutes

    if (duration === 0) return 0;
    return this.commentary.length / duration;
  }

  /**
   * Get commentary statistics
   */
  getStatistics(): {
    totalLines: number;
    byEventType: Record<string, number>;
    bySpeaker: Record<string, number>;
    bySeverity: Record<string, number>;
    averageLineLength: number;
    totalSpeechTime: number;
  } {
    const stats = {
      totalLines: this.commentary.length,
      byEventType: {} as Record<string, number>,
      bySpeaker: { narrator: 0, analyst: 0 },
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      averageLineLength: 0,
      totalSpeechTime: 0,
    };

    let totalLength = 0;

    for (const line of this.commentary) {
      // By type
      stats.byEventType[line.eventType] = (stats.byEventType[line.eventType] || 0) + 1;

      // By speaker
      stats.bySpeaker[line.speaker]++;

      // By severity
      stats.bySeverity[line.severity]++;

      // Track lengths
      totalLength += line.text.length;
      stats.totalSpeechTime += line.duration;
    }

    if (this.commentary.length > 0) {
      stats.averageLineLength = totalLength / this.commentary.length;
    }

    return stats;
  }

  /**
   * Get current commentary state
   */
  getState(gameState: GameState): CommentaryState {
    const recent = this.getRecentCommentary(10);

    return {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      currentLine: recent.length > 0 ? recent[recent.length - 1] : null,
      recentLines: recent,
      totalLines: this.commentary.length,
    };
  }

  /**
   * Get event history from detector
   */
  getEventHistory() {
    return this.detector.getEventHistory();
  }

  /**
   * Reset engine
   */
  reset(): void {
    this.detector.reset();
    this.commentary = [];
    this.commentaryIdCounter = 0;
    this.lastCommentaryTick = 0;
  }
}
