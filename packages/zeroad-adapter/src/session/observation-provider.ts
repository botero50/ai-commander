import { ObservationProvider as IObservationProvider } from '@ai-commander/adapter';
import { WorldState } from '@ai-commander/domain';
import { Logger } from '../config/logger.js';
import { ObservationProvider } from '../observation/observation-provider.js';

export class ZeroADObservationProvider implements IObservationProvider {
  private observationLoop: ObservationProvider;
  private logger: Logger;

  constructor(observationLoop: ObservationProvider, logger: Logger) {
    this.observationLoop = observationLoop;
    this.logger = logger;
  }

  async getWorldState(): Promise<WorldState> {
    try {
      const state = this.observationLoop.getCurrentWorldState();
      if (!state) {
        throw new Error('No world state available');
      }
      return state;
    } catch (err) {
      this.logger.error('Failed to get world state', err);
      throw err;
    }
  }

  async getWorldStateAt(tick: number): Promise<WorldState | undefined> {
    // 0 A.D. doesn't support historical state retrieval
    this.logger.warn('Historical state retrieval not supported', { tick });
    return undefined;
  }

  async isObservationAvailable(): Promise<boolean> {
    try {
      const state = this.observationLoop.getCurrentWorldState();
      return state !== null;
    } catch {
      return false;
    }
  }
}
