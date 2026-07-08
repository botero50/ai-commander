import { WorldState } from '@ai-commander/domain';
import { ObservationLoop, ObservationConfig } from '../state/observation-loop.js';
import { WorldMapper } from '../mapper/world-mapper.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface ObservationProviderConfig extends ObservationConfig {
  // Inherits frequency from ObservationConfig
}

export class ObservationProvider {
  private observationLoop: ObservationLoop;
  private worldMapper: WorldMapper;
  private logger: Logger;
  private ipcBridge: IPCBridge;
  private currentWorldState: WorldState | null = null;
  private lastUpdateTime: number = 0;
  private updateCount: number = 0;

  constructor(ipcBridge: IPCBridge, config: ObservationProviderConfig, logger: Logger) {
    this.ipcBridge = ipcBridge;
    this.logger = logger;
    this.worldMapper = new WorldMapper(logger);
    this.observationLoop = new ObservationLoop(ipcBridge, config, logger);

    this.logger.info('ObservationProvider initialized', { frequency: config.frequency });
  }

  async start(): Promise<void> {
    this.logger.info('Starting observation provider');
    await this.observationLoop.start();
    await this.observeOnce(); // Get initial state
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping observation provider');
    await this.observationLoop.stop();
  }

  getCurrentWorldState(): WorldState | null {
    return this.currentWorldState;
  }

  getMetrics() {
    return {
      ...this.observationLoop.getMetrics(),
      updateCount: this.updateCount,
      lastUpdateTime: this.lastUpdateTime,
      hasState: this.currentWorldState !== null,
    };
  }

  private async observeOnce(): Promise<void> {
    try {
      const gameState = this.observationLoop.getLastState();
      if (!gameState) {
        this.logger.debug('No game state available yet');
        return;
      }

      const startTime = Date.now();

      // Map to world state (observation loop already extracted the state)
      const worldState = this.worldMapper.map(gameState);

      this.currentWorldState = worldState;
      this.updateCount++;
      this.lastUpdateTime = Date.now() - startTime;

      if (this.lastUpdateTime > 50) {
        this.logger.warn('Slow observation update', {
          tick: worldState.time.currentTick.number,
          latency: this.lastUpdateTime,
          agents: worldState.agents.length,
        });
      }
    } catch (err) {
      this.logger.error('Failed to update world state', err);
      // Don't throw - allow observation to continue
    }
  }

  /**
   * Register a callback to be invoked on each state update.
   * Callback receives the new WorldState.
   */
  onStateUpdate(callback: (state: WorldState) => void): void {
    // Store callback for polling during observation loop
    // Note: This is a simple polling mechanism. In production,
    // this would use proper event emitters or pub/sub
    let lastTick = -1;

    const checkState = setInterval(() => {
      const gameState = this.observationLoop.getLastState();
      if (gameState && gameState.tick > lastTick) {
        lastTick = gameState.tick;
        try {
          const worldState = this.worldMapper.map(gameState);
          callback(worldState);
        } catch (err) {
          this.logger.error('Callback error', err);
        }
      }
    }, 50);

    // Store for cleanup on stop
    this.observationLoop;
  }
}
