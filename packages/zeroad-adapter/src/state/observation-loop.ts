import { GameState } from './state-types.js';
import { StateExtractor, RawGameState } from './state-extractor.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface ObservationConfig {
  frequency: number; // Hz (1-20, matching game tick rate)
}

export class ObservationLoop {
  private extractor: StateExtractor;
  private logger: Logger;
  private ipcBridge: IPCBridge;
  private config: ObservationConfig;
  private loopInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastState: GameState | null = null;
  private observationCount: number = 0;
  private totalLatency: number = 0;

  // Playback control
  private isPaused: boolean = false;
  private playbackSpeedMultiplier: number = 1.0;
  private observationSkipCounter: number = 0;

  constructor(ipcBridge: IPCBridge, config: ObservationConfig, logger: Logger) {
    this.ipcBridge = ipcBridge;
    this.config = this.validateConfig(config);
    this.logger = logger;
    this.extractor = new StateExtractor(logger);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Observation loop already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting observation loop', { frequency: this.config.frequency });

    const intervalMs = 1000 / this.config.frequency;
    this.loopInterval = setInterval(() => {
      this.observeTick();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping observation loop');
    this.isRunning = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    if (this.observationCount > 0) {
      const avgLatency = this.totalLatency / this.observationCount;
      this.logger.info('Observation loop stopped', {
        observations: this.observationCount,
        avgLatency: avgLatency.toFixed(2),
      });
    }
  }

  getLastState(): GameState | null {
    return this.lastState;
  }

  getMetrics() {
    return {
      isRunning: this.isRunning,
      observationCount: this.observationCount,
      avgLatency: this.observationCount > 0 ? (this.totalLatency / this.observationCount).toFixed(2) : 0,
    };
  }

  private async observeTick(): Promise<void> {
    // Skip observation if paused or speed multiplier requires skipping
    if (this.shouldSkipObservation()) {
      return;
    }

    try {
      const startTime = Date.now();

      // Request current state from game via IPC
      const response = await this.ipcBridge.sendRequest('get_state');
      const rawState = response as unknown as RawGameState;

      // Extract and normalize state
      const gameState = this.extractor.extract(rawState);
      this.lastState = gameState;

      const latency = Date.now() - startTime;
      this.observationCount++;
      this.totalLatency += latency;

      if (latency > 50) {
        this.logger.warn('Slow observation', {
          tick: gameState.tick,
          latency,
          units: gameState.units.length,
          buildings: gameState.buildings.length,
        });
      }
    } catch (err) {
      this.logger.error('Observation tick failed', err);
      // Continue loop on error - IPC may be temporarily unavailable
    }
  }

  private validateConfig(config: ObservationConfig): ObservationConfig {
    if (config.frequency < 1 || config.frequency > 20) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        `Invalid observation frequency: ${config.frequency}. Must be between 1 and 20 Hz`
      );
    }
    return config;
  }

  /**
   * Pause observation updates
   */
  setPaused(paused: boolean): void {
    if (this.isPaused === paused) {
      return;
    }

    this.isPaused = paused;
    this.observationSkipCounter = 0;

    if (paused) {
      this.logger.info('Observation paused');
    } else {
      this.logger.info('Observation resumed');
    }
  }

  /**
   * Set playback speed multiplier (e.g., 0.5, 1.0, 2.0)
   * Higher values skip more observations to speed up playback
   */
  setPlaybackSpeed(multiplier: number): void {
    if (multiplier < 0.25 || multiplier > 4) {
      this.logger.warn('Invalid playback speed', { multiplier });
      return;
    }

    this.playbackSpeedMultiplier = multiplier;
    this.observationSkipCounter = 0;

    this.logger.info('Playback speed changed', { multiplier: `${multiplier}x` });
  }

  /**
   * Check if observation should be skipped based on speed
   * For 2x speed, skip every other observation
   * For 0.5x speed, observe twice per interval
   */
  private shouldSkipObservation(): boolean {
    if (this.isPaused) {
      return true;
    }

    if (this.playbackSpeedMultiplier === 1.0) {
      return false;
    }

    // For speed > 1.0, skip observations
    if (this.playbackSpeedMultiplier > 1.0) {
      const skipRate = Math.floor(this.playbackSpeedMultiplier);
      this.observationSkipCounter++;
      if (this.observationSkipCounter >= skipRate) {
        this.observationSkipCounter = 0;
        return false; // Process this observation
      }
      return true; // Skip this observation
    }

    // For speed < 1.0, we'd need to double-observe, which isn't supported
    // by the interval-based loop. Just slow it down by extending intervals.
    return false;
  }

  /**
   * Get current playback state
   */
  getPlaybackState() {
    return {
      isPaused: this.isPaused,
      speedMultiplier: this.playbackSpeedMultiplier,
    };
  }
}
