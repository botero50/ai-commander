/**
 * Cinematic Director
 * Multiple camera directing styles for different viewing preferences
 */

import { DynamicCameraDirector, CameraTarget } from './dynamic-camera-director.js';
import { EventDetector, DetectedEvent } from './event-detector.js';
import { GameState } from '../state/state-types.js';

export type CameraStyle = 'broadcast' | 'action' | 'strategic' | 'economy' | 'player_follow' | 'random_cinematic';

interface StyleConfig {
  name: string;
  description: string;
  eventWeights: Record<string, number>;
  zoomBias: number; // -0.5 to 0.5, affects all zoom levels
  transitionSpeed: 'fast' | 'normal' | 'slow';
  focusStrategy: 'highest_priority' | 'random' | 'balanced';
}

export interface CinematicDirectorState {
  tick: number;
  timestamp: number;
  style: CameraStyle;
  currentTarget: CameraTarget | null;
  recentEvents: DetectedEvent[];
  styleMetadata: StyleConfig;
}

/**
 * Multi-style camera director
 */
export class CinematicDirector {
  private director: DynamicCameraDirector;
  private detector: EventDetector;
  private currentStyle: CameraStyle = 'broadcast';
  private styleConfigs: Record<CameraStyle, StyleConfig>;
  private randomWeightIndex = 0;

  constructor() {
    this.director = new DynamicCameraDirector();
    this.detector = new EventDetector();

    // Initialize style configurations
    this.styleConfigs = {
      broadcast: {
        name: 'Broadcast',
        description: 'Professional, balanced view of all action',
        eventWeights: {
          player_elimination: 1.0,
          victory_push: 1.0,
          large_battle: 1.0,
          base_attack: 0.9,
          wonder_construction: 0.95,
          siege_initiated: 0.85,
          technology_complete: 0.6,
          expansion: 0.5,
          army_collision: 0.8,
          cavalry_arrival: 0.5,
          military_advantage: 0.4,
          resource_spike: 0.2,
          unit_loss: 0.3,
          first_scout: 0.1,
        },
        zoomBias: 0.0,
        transitionSpeed: 'normal',
        focusStrategy: 'highest_priority',
      },

      action: {
        name: 'Action',
        description: 'Aggressive camera, emphasizes combat and drama',
        eventWeights: {
          player_elimination: 1.2,
          victory_push: 1.15,
          large_battle: 1.2,
          base_attack: 1.1,
          wonder_construction: 0.8,
          siege_initiated: 1.0,
          technology_complete: 0.5,
          expansion: 0.3,
          army_collision: 1.0,
          cavalry_arrival: 0.8,
          military_advantage: 0.7,
          resource_spike: 0.1,
          unit_loss: 0.6,
          first_scout: 0.05,
        },
        zoomBias: 0.2, // Closer camera
        transitionSpeed: 'fast',
        focusStrategy: 'highest_priority',
      },

      strategic: {
        name: 'Strategic',
        description: 'Wide view showing economic and military spread',
        eventWeights: {
          player_elimination: 0.8,
          victory_push: 0.7,
          large_battle: 0.6,
          base_attack: 0.5,
          wonder_construction: 0.7,
          siege_initiated: 0.6,
          technology_complete: 0.8,
          expansion: 1.2,
          army_collision: 0.5,
          cavalry_arrival: 0.7,
          military_advantage: 1.0,
          resource_spike: 0.8,
          unit_loss: 0.4,
          first_scout: 0.6,
        },
        zoomBias: -0.3, // Wider camera
        transitionSpeed: 'slow',
        focusStrategy: 'balanced',
      },

      economy: {
        name: 'Economy',
        description: 'Focus on gathering, bases, and economic operations',
        eventWeights: {
          player_elimination: 0.5,
          victory_push: 0.3,
          large_battle: 0.2,
          base_attack: 0.4,
          wonder_construction: 0.6,
          siege_initiated: 0.3,
          technology_complete: 0.4,
          expansion: 1.3,
          army_collision: 0.1,
          cavalry_arrival: 0.2,
          military_advantage: 0.3,
          resource_spike: 1.2,
          unit_loss: 0.1,
          first_scout: 0.8,
        },
        zoomBias: -0.2,
        transitionSpeed: 'slow',
        focusStrategy: 'balanced',
      },

      player_follow: {
        name: 'Player Follow',
        description: 'Track one player\'s units throughout the match',
        eventWeights: {
          player_elimination: 1.0,
          victory_push: 1.0,
          large_battle: 0.9,
          base_attack: 0.5,
          wonder_construction: 0.8,
          siege_initiated: 0.8,
          technology_complete: 0.9,
          expansion: 0.7,
          army_collision: 0.8,
          cavalry_arrival: 1.0,
          military_advantage: 0.8,
          resource_spike: 0.6,
          unit_loss: 0.7,
          first_scout: 0.5,
        },
        zoomBias: 0.1,
        transitionSpeed: 'normal',
        focusStrategy: 'highest_priority',
      },

      random_cinematic: {
        name: 'Random Cinematic',
        description: 'Dramatic angles, unexpected cuts, cinematic feel',
        eventWeights: {
          player_elimination: 1.3,
          victory_push: 1.2,
          large_battle: 1.1,
          base_attack: 1.0,
          wonder_construction: 1.1,
          siege_initiated: 1.0,
          technology_complete: 0.7,
          expansion: 0.5,
          army_collision: 1.0,
          cavalry_arrival: 0.9,
          military_advantage: 0.8,
          resource_spike: 0.3,
          unit_loss: 0.5,
          first_scout: 0.2,
        },
        zoomBias: 0.3, // More dramatic close-ups
        transitionSpeed: 'fast',
        focusStrategy: 'random',
      },
    };
  }

  /**
   * Direct camera with current style
   */
  direct(state: GameState): CameraTarget {
    const target = this.director.direct(state);
    const style = this.styleConfigs[this.currentStyle];

    // Apply style modifications
    return this.applyStyle(target, state, style);
  }

  /**
   * Apply style modifications to camera target
   */
  private applyStyle(target: CameraTarget, state: GameState, style: StyleConfig): CameraTarget {
    // Apply zoom bias
    const adjustedZoom = Math.max(0.3, Math.min(2.0, target.zoom + style.zoomBias));

    // Apply transition speed
    const duration = this.getDuration(style.transitionSpeed);

    // For random cinematic, occasionally randomize target
    let finalTarget = target;
    if (style.focusStrategy === 'random' && Math.random() < 0.1) {
      // 10% chance to pick random location
      finalTarget = this.getRandomTarget(state);
    }

    return {
      x: finalTarget.x,
      z: finalTarget.z,
      zoom: adjustedZoom,
      duration,
      reason: `${style.name}: ${finalTarget.reason}`,
    };
  }

  /**
   * Get transition duration based on speed setting
   */
  private getDuration(speed: 'fast' | 'normal' | 'slow'): number {
    switch (speed) {
      case 'fast':
        return 200;
      case 'normal':
        return 400;
      case 'slow':
        return 800;
    }
  }

  /**
   * Get random target for cinematic mode
   */
  private getRandomTarget(state: GameState): CameraTarget {
    // Pick random location biased toward interesting areas
    const x = 20 + Math.random() * 160;
    const z = 20 + Math.random() * 160;

    return {
      x: Math.round(x),
      z: Math.round(z),
      zoom: 0.8 + Math.random() * 0.4,
      duration: 500,
      reason: 'random_cinematic',
    };
  }

  /**
   * Set camera style
   */
  setStyle(style: CameraStyle): void {
    if (!this.styleConfigs[style]) {
      throw new Error(`Unknown camera style: ${style}`);
    }
    this.currentStyle = style;
  }

  /**
   * Get current style
   */
  getStyle(): CameraStyle {
    return this.currentStyle;
  }

  /**
   * Get all available styles
   */
  getAvailableStyles(): Array<{ id: CameraStyle; name: string; description: string }> {
    return Object.entries(this.styleConfigs).map(([id, config]) => ({
      id: id as CameraStyle,
      name: config.name,
      description: config.description,
    }));
  }

  /**
   * Get current director state
   */
  getState(gameState: GameState): CinematicDirectorState {
    const style = this.styleConfigs[this.currentStyle];
    const directorState = this.director.getState(gameState);

    return {
      tick: gameState.tick,
      timestamp: gameState.timestamp,
      style: this.currentStyle,
      currentTarget: directorState.currentTarget,
      recentEvents: directorState.recentEvents,
      styleMetadata: style,
    };
  }

  /**
   * Get event history
   */
  getEventHistory(): DetectedEvent[] {
    return this.director.getEventHistory();
  }

  /**
   * Get critical events
   */
  getCriticalEvents(): DetectedEvent[] {
    return this.director.getCriticalEvents();
  }

  /**
   * Reset director
   */
  reset(): void {
    this.director.reset();
    this.currentStyle = 'broadcast';
    this.randomWeightIndex = 0;
  }
}
