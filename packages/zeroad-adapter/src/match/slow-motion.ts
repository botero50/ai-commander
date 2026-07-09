/**
 * Slow Motion
 * Automatically applies slow-motion effects during battles, critical moments, and victory
 */

export type SlowMotionTrigger = 'large_battle' | 'critical_attack' | 'victory' | 'manual';

export interface SlowMotionEffect {
  id: string;
  trigger: SlowMotionTrigger;
  tick: number;
  timestamp: number;
  startTick: number;
  endTick: number;
  speedFactor: number; // 0.25 (4x slow) to 1.0 (normal speed)
  easeInTicks: number; // gradual transition to slow motion
  easeOutTicks: number; // gradual transition back to normal
  title: string;
  description: string;
}

export interface SlowMotionState {
  tick: number;
  timestamp: number;
  currentSpeed: number; // 0.25 to 1.0
  isSlowMotion: boolean;
  activeEffect: SlowMotionEffect | null;
  recentEffects: SlowMotionEffect[];
  totalSlowMotionDuration: number; // ms
}

type SlowMotionSubscriber = (state: SlowMotionState) => void;

/**
 * Slow Motion Manager
 * Detects moments and applies cinematic slow-motion effects
 */
export class SlowMotionManager {
  private effects: SlowMotionEffect[] = [];
  private effectIdCounter = 0;
  private subscribers: Set<SlowMotionSubscriber> = new Set();
  private currentSpeed = 1.0;
  private isSlowMotion = false;
  private activeEffectId: string | null = null;
  private totalSlowMotionMs = 0;

  constructor() {}

  /**
   * Create slow-motion for large battle
   */
  createBattleSlowMotion(
    tick: number,
    timestamp: number,
    unitCount: number,
    title: string
  ): SlowMotionEffect {
    // Scale speed based on battle size: 20+ units = 0.25x, 10-20 = 0.35x, <10 = 0.5x
    let speedFactor = 0.5;
    if (unitCount >= 20) {
      speedFactor = 0.25;
    } else if (unitCount >= 15) {
      speedFactor = 0.3;
    } else if (unitCount >= 10) {
      speedFactor = 0.4;
    }

    const duration = 12000; // 12 seconds of slow motion
    const easeInTicks = 50;
    const easeOutTicks = 100;

    const effect: SlowMotionEffect = {
      id: `effect-${this.effectIdCounter++}`,
      trigger: 'large_battle',
      tick,
      timestamp,
      startTick: Math.max(0, tick - easeInTicks),
      endTick: tick + (duration / 33), // Convert ms to ticks (assuming ~33ms per tick)
      speedFactor,
      easeInTicks,
      easeOutTicks,
      title,
      description: `${unitCount}-unit engagement in slow motion`,
    };

    this.effects.push(effect);
    this.emitUpdate(tick, timestamp);

    return effect;
  }

  /**
   * Create slow-motion for critical attack
   */
  createAttackSlowMotion(
    tick: number,
    timestamp: number,
    attackerId: string,
    targetId: string,
    title: string
  ): SlowMotionEffect {
    const speedFactor = 0.4; // 2.5x slow motion for attacks
    const duration = 5000; // 5 seconds
    const easeInTicks = 20;
    const easeOutTicks = 40;

    const effect: SlowMotionEffect = {
      id: `effect-${this.effectIdCounter++}`,
      trigger: 'critical_attack',
      tick,
      timestamp,
      startTick: Math.max(0, tick - easeInTicks),
      endTick: tick + (duration / 33),
      speedFactor,
      easeInTicks,
      easeOutTicks,
      title,
      description: `${attackerId} attacking ${targetId}`,
    };

    this.effects.push(effect);
    this.emitUpdate(tick, timestamp);

    return effect;
  }

  /**
   * Create slow-motion for victory
   */
  createVictorySlowMotion(
    tick: number,
    timestamp: number,
    winner: 'player1' | 'player2',
    title: string
  ): SlowMotionEffect {
    const speedFactor = 0.5; // 2x slow motion for victory
    const duration = 8000; // 8 seconds
    const easeInTicks = 30;
    const easeOutTicks = 80;

    const effect: SlowMotionEffect = {
      id: `effect-${this.effectIdCounter++}`,
      trigger: 'victory',
      tick,
      timestamp,
      startTick: Math.max(0, tick - easeInTicks),
      endTick: tick + (duration / 33),
      speedFactor,
      easeInTicks,
      easeOutTicks,
      title,
      description: `${winner === 'player1' ? 'Player 1' : 'Player 2'} victory`,
    };

    this.effects.push(effect);
    this.emitUpdate(tick, timestamp);

    return effect;
  }

  /**
   * Manually create slow-motion effect
   */
  createManualSlowMotion(
    tick: number,
    timestamp: number,
    speedFactor: number,
    durationMs: number,
    title: string
  ): SlowMotionEffect {
    // Clamp speed factor to valid range
    const clampedSpeed = Math.max(0.25, Math.min(1.0, speedFactor));
    const easeInTicks = 20;
    const easeOutTicks = 40;

    const effect: SlowMotionEffect = {
      id: `effect-${this.effectIdCounter++}`,
      trigger: 'manual',
      tick,
      timestamp,
      startTick: Math.max(0, tick - easeInTicks),
      endTick: tick + (durationMs / 33),
      speedFactor: clampedSpeed,
      easeInTicks,
      easeOutTicks,
      title,
      description: `Manual slow motion (${(clampedSpeed * 100).toFixed(0)}% speed)`,
    };

    this.effects.push(effect);
    this.emitUpdate(tick, timestamp);

    return effect;
  }

  /**
   * Update current playback speed based on active effects
   */
  updatePlaybackSpeed(currentTick: number, timestamp: number): number {
    // Find active effect at this tick
    let activeEffect: SlowMotionEffect | null = null;
    let effectSpeed = 1.0;

    for (const effect of this.effects) {
      if (currentTick >= effect.startTick && currentTick <= effect.endTick) {
        activeEffect = effect;

        // Calculate easing
        let speedFactor = effect.speedFactor;

        if (currentTick < effect.startTick + effect.easeInTicks) {
          // Easing in: interpolate from 1.0 to speedFactor
          const easeProgress = (currentTick - effect.startTick) / effect.easeInTicks;
          speedFactor = 1.0 + (effect.speedFactor - 1.0) * easeProgress;
        } else if (currentTick > effect.endTick - effect.easeOutTicks) {
          // Easing out: interpolate from speedFactor to 1.0
          const easeProgress = 1.0 - (effect.endTick - currentTick) / effect.easeOutTicks;
          speedFactor = 1.0 + (effect.speedFactor - 1.0) * easeProgress;
        }

        effectSpeed = Math.min(effectSpeed, speedFactor); // Use slowest effect
        this.activeEffectId = effect.id;
      }
    }

    this.currentSpeed = effectSpeed;
    this.isSlowMotion = effectSpeed < 1.0;

    this.emitUpdate(currentTick, timestamp);

    return effectSpeed;
  }

  /**
   * Subscribe to slow motion updates
   */
  subscribe(callback: SlowMotionSubscriber): () => void {
    this.subscribers.add(callback);

    // Send initial state
    this.emitUpdate(0, 0);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get effects by trigger type
   */
  getEffectsByTrigger(trigger: SlowMotionTrigger): SlowMotionEffect[] {
    return this.effects.filter((e) => e.trigger === trigger);
  }

  /**
   * Get recent effects (last N)
   */
  getRecentEffects(count: number = 5): SlowMotionEffect[] {
    return this.effects.slice(-count);
  }

  /**
   * Get total slow-motion duration
   */
  getTotalSlowMotionDuration(): number {
    return this.effects.reduce((sum, effect) => {
      const durationMs = (effect.endTick - effect.startTick) * 33; // Convert ticks to ms
      return sum + durationMs;
    }, 0);
  }

  /**
   * Get slow-motion percentage of total playtime
   */
  getSlowMotionPercentage(totalPlaytimeMs: number): number {
    if (totalPlaytimeMs === 0) return 0;
    return (this.getTotalSlowMotionDuration() / totalPlaytimeMs) * 100;
  }

  /**
   * Emit state update
   */
  private emitUpdate(tick: number, timestamp: number): void {
    const state: SlowMotionState = {
      tick,
      timestamp,
      currentSpeed: this.currentSpeed,
      isSlowMotion: this.isSlowMotion,
      activeEffect: this.activeEffectId
        ? this.effects.find((e) => e.id === this.activeEffectId) || null
        : null,
      recentEffects: this.getRecentEffects(5),
      totalSlowMotionDuration: this.getTotalSlowMotionDuration(),
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in slow motion subscriber:', err);
      }
    }
  }

  /**
   * Get all effects
   */
  getAllEffects(): SlowMotionEffect[] {
    return [...this.effects];
  }

  /**
   * Reset manager
   */
  reset(): void {
    this.effects = [];
    this.effectIdCounter = 0;
    this.currentSpeed = 1.0;
    this.isSlowMotion = false;
    this.activeEffectId = null;
    this.totalSlowMotionMs = 0;
    this.subscribers.clear();
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.reset();
  }
}
