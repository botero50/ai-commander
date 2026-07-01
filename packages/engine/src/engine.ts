import { World } from '@ai-commander/ecs';
import type { EngineConfig } from './types/engine-config.js';

/**
 * Engine is the core execution engine for AI Commander.
 */
export class Engine {
  private readonly world: World;
  private readonly config: EngineConfig;
  private currentTick = 0;
  private running = false;

  constructor(config: EngineConfig) {
    this.config = config;
    this.world = new World();
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  tick(): void {
    if (!this.running) {
      return;
    }

    this.currentTick += 1;

    if (this.config.maxTicks && this.currentTick >= this.config.maxTicks) {
      this.stop();
    }
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getWorld(): World {
    return this.world;
  }
}
