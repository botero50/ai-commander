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
}
