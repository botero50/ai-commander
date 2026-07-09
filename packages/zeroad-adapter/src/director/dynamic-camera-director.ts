/**
 * Dynamic Camera Director
 * Uses event detection to automatically direct camera to interesting moments
 */

import { EventDetector, DetectedEvent } from './event-detector.js';
import { GameState } from '../state/state-types.js';

export interface CameraTarget {
  x: number;
  z: number;
  zoom: number; // 1.0 = normal, 2.0 = 2x zoom
  duration: number; // ms to reach target
  reason: string;
}

export interface DirectorState {
  tick: number;
  timestamp: number;
  currentTarget: CameraTarget | null;
  recentEvents: DetectedEvent[];
  priorityScore: number;
  focusedPlayers: number[]; // Which players to watch
}

/**
 * Automatically decides where camera should look
 */
export class DynamicCameraDirector {
  private detector: EventDetector;
  private currentTarget: CameraTarget | null = null;
  private lastTargetChangeTime = 0;
  private eventQueue: DetectedEvent[] = [];
  private readonly TARGET_CHANGE_INTERVAL = 1000; // Min ms between target changes

  // Configuration
  private readonly ZOOM_NORMAL = 1.0;
  private readonly ZOOM_CLOSE = 1.5; // For sieges, small battles
  private readonly ZOOM_WIDE = 0.7; // For large battles, expansions
  private readonly TRANSITION_FAST = 300; // ms
  private readonly TRANSITION_SLOW = 800; // ms

  constructor() {
    this.detector = new EventDetector();
  }

  /**
   * Analyze game state and determine camera direction
   */
  direct(state: GameState): CameraTarget {
    // Detect events
    const events = this.detector.detect(state);

    // Add new events to queue
    for (const event of events) {
      this.eventQueue.push(event);
    }

    // Keep queue size manageable
    if (this.eventQueue.length > 50) {
      this.eventQueue = this.eventQueue.slice(-50);
    }

    // Get next target based on events
    const now = state.timestamp;

    // Allow target change if enough time passed
    if (now - this.lastTargetChangeTime > this.TARGET_CHANGE_INTERVAL) {
      this.currentTarget = this.selectTarget(state, events);
      if (this.currentTarget) {
        this.lastTargetChangeTime = now;
      }
    }

    // Return current target or default
    return (
      this.currentTarget || {
        x: 100,
        z: 100,
        zoom: this.ZOOM_NORMAL,
        duration: this.TRANSITION_FAST,
        reason: 'default',
      }
    );
  }

  /**
   * Select best target from detected events
   */
  private selectTarget(state: GameState, events: DetectedEvent[]): CameraTarget | null {
    if (events.length === 0) {
      return null; // Keep current target
    }

    // Get highest priority event
    const event = events.reduce((best, current) => {
      const bestScore = this.getEventPriority(best);
      const currentScore = this.getEventPriority(current);
      return currentScore > bestScore ? current : best;
    });

    // Convert event to camera target
    return this.eventToTarget(event, state);
  }

  /**
   * Get priority score for an event (0-1000)
   */
  private getEventPriority(event: DetectedEvent): number {
    const severityMultiplier =
      event.severity === 'critical' ? 1000 : event.severity === 'high' ? 500 : 200;

    const eventTypeScore: Record<string, number> = {
      player_elimination: 1000, // Match end
      victory_push: 950, // Final assault
      large_battle: 900, // Major combat
      base_attack: 850, // Defense needed
      wonder_construction: 800, // Victory race
      technology_complete: 600, // New unit type
      expansion: 500, // Economic shift
      siege_initiated: 700, // Siege moment
      cavalry_arrival: 550, // Unit type arrival
      military_advantage: 500, // Power shift
      army_collision: 750, // Combat start
      first_scout: 200, // Early game
      resource_spike: 300, // Economic
      unit_loss: 400, // Battle damage
    };

    return eventTypeScore[event.type] || 100;
  }

  /**
   * Convert event to camera target
   */
  private eventToTarget(event: DetectedEvent, state: GameState): CameraTarget {
    const position = event.position || { x: 100, z: 100 };

    // Determine zoom and duration based on event type
    let zoom = this.ZOOM_NORMAL;
    let duration = this.TRANSITION_FAST;

    switch (event.type) {
      case 'player_elimination':
      case 'victory_push':
        // Wide shot for end game
        zoom = this.ZOOM_WIDE;
        duration = this.TRANSITION_SLOW;
        break;

      case 'large_battle':
      case 'army_collision':
        // Wide shot for big battles
        zoom = this.ZOOM_WIDE;
        duration = this.TRANSITION_FAST;
        break;

      case 'siege_initiated':
      case 'base_attack':
        // Close on the fortress
        zoom = this.ZOOM_CLOSE;
        duration = this.TRANSITION_FAST;
        break;

      case 'wonder_construction':
        // Epic wide shot
        zoom = this.ZOOM_WIDE;
        duration = this.TRANSITION_SLOW;
        break;

      case 'expansion':
        // Show new base
        zoom = this.ZOOM_CLOSE;
        duration = this.TRANSITION_FAST;
        break;

      case 'technology_complete':
        // Find the unit that appeared
        zoom = this.ZOOM_NORMAL;
        duration = this.TRANSITION_FAST;
        break;

      default:
        zoom = this.ZOOM_NORMAL;
        duration = this.TRANSITION_FAST;
    }

    // Clamp position to map bounds (assuming 200x200 map)
    const clampedX = Math.max(20, Math.min(180, position.x));
    const clampedZ = Math.max(20, Math.min(180, position.z));

    return {
      x: clampedX,
      z: clampedZ,
      zoom,
      duration,
      reason: event.title,
    };
  }

  /**
   * Get current director state (for debug/replay)
   */
  getState(gameState: GameState): DirectorState {
    return {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      currentTarget: this.currentTarget,
      recentEvents: this.detector.getRecentEvents(10),
      priorityScore: this.currentTarget ? this.getEventPriority(this.eventQueue[0]) : 0,
      focusedPlayers: [], // Could track which player is focused
    };
  }

  /**
   * Get critical events only (skip minor stuff)
   */
  getCriticalEvents(): DetectedEvent[] {
    return this.detector.getCriticalEvents();
  }

  /**
   * Get event history
   */
  getEventHistory(): DetectedEvent[] {
    return this.detector.getEventHistory();
  }

  /**
   * Reset director
   */
  reset(): void {
    this.detector.reset();
    this.currentTarget = null;
    this.lastTargetChangeTime = 0;
    this.eventQueue = [];
  }
}
