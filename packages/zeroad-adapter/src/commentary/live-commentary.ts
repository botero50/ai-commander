/**
 * Live Commentary Service
 *
 * Generates real-time esports-style commentary for spectators:
 * - Event-triggered: Reacts immediately to dramatic moments (combat, eliminations)
 * - Interval-triggered: Analyzes state every ~15 seconds for strategic trends
 * - Never exposes reasoning — only observable facts
 * - Maintains buffer of last 50 comments for display
 * - Deduplicates similar observations (don't repeat within 30s)
 *
 * Architecture:
 * - Subscribes to DramaticMomentDetector for real-time events
 * - Subscribes to DecisionOverlay for decision context
 * - Accesses GameState snapshot for metrics analysis
 * - Generates CommentaryEntry objects
 * - Broadcasts updates to React UI via subscription pattern
 */

import type { DecisionCategory } from './decision-summary.js';
import type { DecisionOverlay } from '../match/decision-overlay.js';
import type { DramaticMoment } from '../camera/dramatic-moment-detector.js';

/**
 * Single commentary entry (spectator-friendly, no reasoning)
 */
export interface CommentaryEntry {
  readonly tick: number;
  readonly timestamp: number;
  readonly text: string; // E.g., "Engaging! Both sides converging"
  readonly type: 'event' | 'status'; // event = dramatic moment, status = interval analysis
  readonly source: 'dramatic_moment' | 'resource_analysis' | 'military_analysis' | 'status';
  readonly confidence: number; // 0-1
  readonly players: readonly ('player1' | 'player2')[]; // Which players involved
  readonly momentSeverity?: number; // 0-100 if from dramatic event
}

/**
 * Callback when commentary updates
 */
export type CommentarySubscriber = (entries: readonly CommentaryEntry[]) => void;

/**
 * Game state snapshot for analysis
 */
export interface GameStateSnapshot {
  readonly tick: number;
  readonly players: Array<{
    readonly id: 'player1' | 'player2';
    readonly food: number;
    readonly wood: number;
    readonly stone: number;
    readonly metal: number;
    readonly populationCurrent: number;
    readonly populationMax: number;
    readonly unitCount: number;
    readonly buildingCount: number;
  }>;
}

/**
 * Live commentary generator
 */
export class LiveCommentary {
  private entries: CommentaryEntry[] = [];
  private subscribers: CommentarySubscriber[] = [];
  private maxEntries = 50; // Keep last 50 comments
  private unsubscribeFromOverlay: (() => void) | null = null;
  private unsubscribeFromDramatic: (() => void) | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private previousState: GameStateSnapshot | null = null;
  private lastCommentTime: number = 0;
  private lastCommentText: string = '';
  private minCommentInterval = 1000; // Don't spam (min 1s between comments)

  constructor(
    private decisionOverlay: DecisionOverlay,
    private dramaticMomentDetector: (callback: (moment: DramaticMoment) => void) => () => void,
    private gameStateProvider: () => GameStateSnapshot | null,
    private logger?: { info: (msg: string) => void; warn: (msg: string) => void }
  ) {
    this.log('Live commentary service created');
  }

  /**
   * Start commentary generation (subscribe to events + start interval timer)
   */
  start(): void {
    this.log('Starting live commentary');

    // Subscribe to dramatic moments for event-triggered commentary
    this.unsubscribeFromDramatic = this.dramaticMomentDetector((moment) => {
      this.handleDramaticMoment(moment);
    });

    // Start interval timer for state-based analysis (~15 seconds)
    this.intervalTimer = setInterval(() => {
      this.analyzeGameState();
    }, 15000); // 15 seconds

    this.log('Live commentary started');
  }

  /**
   * Handle a dramatic moment (event-triggered)
   */
  private handleDramaticMoment(moment: DramaticMoment): void {
    // Severity-based filtering: only high-severity events trigger immediate commentary
    if (moment.severity < 40) {
      return; // Ignore very minor events
    }

    let text = '';
    let source: CommentaryEntry['source'] = 'dramatic_moment';

    switch (moment.type) {
      case 'unit_eliminated':
        if (moment.severity >= 60) {
          text = `${this.playerName(moment.players[0])} unit lost`;
        } else {
          return; // Skip low-severity unit losses
        }
        break;

      case 'building_destroyed':
        if (moment.severity >= 90) {
          text = `${this.playerName(moment.players[0])}'s base under attack!`;
        } else if (moment.severity >= 60) {
          text = `${this.playerName(moment.players[0])} structure destroyed`;
        } else {
          return;
        }
        break;

      case 'large_engagement':
        text = 'Engaging! Both sides converging';
        break;

      case 'player_eliminated':
        text = `${this.playerName(moment.players[0])} player is eliminated!`;
        break;

      case 'major_expansion':
        text = `${this.playerName(moment.players[0])} is expanding their territory`;
        break;

      case 'victory':
        text = `${this.playerName(moment.players[0])} has won the game!`;
        break;

      case 'defeat':
        text = `${this.playerName(moment.players[0])} has been defeated`;
        break;

      default:
        return; // Unknown event type
    }

    if (text) {
      this.addEntry({
        tick: moment.tick,
        timestamp: Date.now(),
        text,
        type: 'event',
        source,
        confidence: 0.85 + (moment.severity / 100) * 0.15, // 0.85-1.0
        players: (moment.players as Array<'player1' | 'player2'>) || [],
        momentSeverity: moment.severity,
      });
    }
  }

  /**
   * Analyze current game state for strategic commentary (interval-triggered)
   */
  private analyzeGameState(): void {
    const currentState = this.gameStateProvider();
    if (!currentState) {
      return; // No game state available
    }

    const comments: CommentaryEntry[] = [];

    // Analyze each player
    for (const player of currentState.players) {
      // Resource analysis
      if (player.food > 800 && player.wood > 600) {
        const comment = this.generateResourceComment(player, currentState);
        if (comment) {
          comments.push(comment);
        }
      }

      // Population analysis
      if (player.populationCurrent > 30 && player.unitCount > 20) {
        const comment = this.generateMilitaryComment(player, currentState);
        if (comment) {
          comments.push(comment);
        }
      }
    }

    // Comparative analysis (who's ahead?)
    if (currentState.players.length === 2) {
      const p1 = currentState.players[0];
      const p2 = currentState.players[1];
      const comment = this.generateComparativeComment(p1, p2, currentState);
      if (comment) {
        comments.push(comment);
      }
    }

    // Add comments while respecting deduplication
    for (const comment of comments) {
      this.addEntry(comment);
    }

    this.previousState = currentState;
  }

  /**
   * Generate resource-based commentary
   */
  private generateResourceComment(
    player: GameStateSnapshot['players'][0],
    state: GameStateSnapshot
  ): CommentaryEntry | null {
    const totalResources = player.food + player.wood + player.stone + player.metal;

    // Strong economy
    if (totalResources > 2000) {
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(player.id)} building a strong economy`,
        type: 'status',
        source: 'resource_analysis',
        confidence: 0.82,
        players: [player.id],
      };
    }

    // Rapid expansion
    if (player.buildingCount > 12) {
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(player.id)} rapidly expanding`,
        type: 'status',
        source: 'resource_analysis',
        confidence: 0.88,
        players: [player.id],
      };
    }

    return null;
  }

  /**
   * Generate military-based commentary
   */
  private generateMilitaryComment(
    player: GameStateSnapshot['players'][0],
    state: GameStateSnapshot
  ): CommentaryEntry | null {
    // Large army
    if (player.unitCount > 25) {
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(player.id)} has significant military presence`,
        type: 'status',
        source: 'military_analysis',
        confidence: 0.85,
        players: [player.id],
      };
    }

    // Building army
    if (player.unitCount > 15) {
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(player.id)} appears to be building a large force`,
        type: 'status',
        source: 'military_analysis',
        confidence: 0.78,
        players: [player.id],
      };
    }

    return null;
  }

  /**
   * Generate comparative commentary (who's ahead?)
   */
  private generateComparativeComment(
    p1: GameStateSnapshot['players'][0],
    p2: GameStateSnapshot['players'][0],
    state: GameStateSnapshot
  ): CommentaryEntry | null {
    const p1Resources = p1.food + p1.wood + p1.stone + p1.metal;
    const p2Resources = p2.food + p2.wood + p2.stone + p2.metal;
    const resourceGap = Math.abs(p1Resources - p2Resources);

    // Significant economic advantage
    if (resourceGap > 600) {
      const leader = p1Resources > p2Resources ? p1 : p2;
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(leader.id)} has economic advantage`,
        type: 'status',
        source: 'status',
        confidence: 0.88,
        players: [p1.id, p2.id],
      };
    }

    // Military imbalance
    const unitGap = Math.abs(p1.unitCount - p2.unitCount);
    if (unitGap > 10) {
      const leader = p1.unitCount > p2.unitCount ? p1 : p2;
      return {
        tick: state.tick,
        timestamp: Date.now(),
        text: `${this.playerName(leader.id)} has military advantage`,
        type: 'status',
        source: 'status',
        confidence: 0.86,
        players: [p1.id, p2.id],
      };
    }

    return null;
  }

  /**
   * Add entry and auto-prune if needed (with deduplication)
   */
  private addEntry(entry: CommentaryEntry): void {
    // Deduplication: don't add same comment twice within 30 seconds
    const now = Date.now();
    if (
      entry.text === this.lastCommentText &&
      now - this.lastCommentTime < 30000
    ) {
      return; // Duplicate, skip
    }

    // Rate limiting: at least 1 second between comments
    if (now - this.lastCommentTime < this.minCommentInterval) {
      return;
    }

    // Add to beginning (newest first)
    this.entries.unshift(entry);
    this.lastCommentTime = now;
    this.lastCommentText = entry.text;

    // Auto-prune if exceeding max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Notify all subscribers of update
   */
  private notifySubscribers(): void {
    const snapshot = Object.freeze([...this.entries]) as readonly CommentaryEntry[];
    for (const subscriber of this.subscribers) {
      try {
        subscriber(snapshot);
      } catch (err) {
        this.log(`Subscriber error: ${err}`);
      }
    }
  }

  /**
   * Subscribe to commentary updates
   */
  subscribe(callback: CommentarySubscriber): () => void {
    this.subscribers.push(callback);
    // Immediately send current entries
    callback(Object.freeze([...this.entries]) as readonly CommentaryEntry[]);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  /**
   * Get all entries
   */
  getEntries(): readonly CommentaryEntry[] {
    return Object.freeze([...this.entries]);
  }

  /**
   * Get latest N entries
   */
  getLatestEntries(count: number = 10): readonly CommentaryEntry[] {
    return Object.freeze([...this.entries.slice(0, count)]);
  }

  /**
   * Get entries by type (event or status)
   */
  getEntriesByType(type: 'event' | 'status'): readonly CommentaryEntry[] {
    return Object.freeze([
      ...this.entries.filter((e) => e.type === type),
    ]);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.lastCommentText = '';
    this.notifySubscribers();
  }

  /**
   * Stop and clean up
   */
  destroy(): void {
    this.log('Stopping live commentary');

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (this.unsubscribeFromDramatic) {
      this.unsubscribeFromDramatic();
      this.unsubscribeFromDramatic = null;
    }

    if (this.unsubscribeFromOverlay) {
      this.unsubscribeFromOverlay();
      this.unsubscribeFromOverlay = null;
    }

    this.subscribers = [];
    this.entries = [];

    this.log('Live commentary destroyed');
  }

  /**
   * Convert player ID to display name
   */
  private playerName(playerId: string | 'player1' | 'player2'): string {
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
