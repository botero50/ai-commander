/**
 * Story 56.2 — Automatic Match Cleanup
 *
 * After a match ends automatically:
 * - Stop AI loops
 * - Dispose adapters
 * - Close RL Interface connections
 * - Release runtime resources
 * - Reset Arena state
 * - Prepare for another match
 *
 * No application restart required. Arena returns to clean state.
 */

import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import type { GameSession } from '@ai-commander/adapter';

export interface CleanupResult {
  readonly success: boolean;
  readonly resourcesReleased: number;
  readonly errors: string[];
  readonly duration: number; // milliseconds
}

export class MatchCleanup {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'MatchCleanup');
  }

  /**
   * Clean up after a completed match.
   * Releases all resources and returns arena to clean state.
   */
  async cleanup(
    adapter: ZeroADAdapter,
    session: GameSession | null
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let resourcesReleased = 0;

    this.logger.info('Starting match cleanup', {
      hasSession: session !== null,
      hasAdapter: adapter !== null,
    });

    try {
      // 1. Stop game session (closes RL Interface connection, stops game process)
      if (session) {
        try {
          this.logger.debug('Stopping game session');
          await session.stop();
          resourcesReleased++;
          this.logger.debug('Game session stopped');
        } catch (err) {
          const errMsg = `Failed to stop game session: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(errMsg);
          this.logger.warn(errMsg, err);
        }
      }

      // 2. Shutdown adapter (releases IPC bridge, process manager, observation provider)
      if (adapter) {
        try {
          this.logger.debug('Shutting down adapter');
          await adapter.shutdown();
          resourcesReleased++;
          this.logger.debug('Adapter shutdown complete');
        } catch (err) {
          const errMsg = `Failed to shutdown adapter: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(errMsg);
          this.logger.warn(errMsg, err);
        }
      }

      // 3. Force garbage collection hint (optional, helps cleanup in long-running processes)
      if (global.gc) {
        try {
          global.gc();
          this.logger.debug('Garbage collection triggered');
        } catch (err) {
          this.logger.debug('Garbage collection failed (expected on some runtimes)', err);
        }
      }

      const duration = Date.now() - startTime;

      const result: CleanupResult = {
        success: errors.length === 0,
        resourcesReleased,
        errors,
        duration,
      };

      if (result.success) {
        this.logger.info('Match cleanup completed successfully', {
          resourcesReleased,
          duration,
        });
      } else {
        this.logger.warn('Match cleanup completed with errors', {
          resourcesReleased,
          errorCount: errors.length,
          duration,
          errors,
        });
      }

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Cleanup catastrophic failure: ${errMsg}`);

      this.logger.error('Cleanup failed with exception', err);

      return {
        success: false,
        resourcesReleased,
        errors,
        duration,
      };
    }
  }

  /**
   * Verify cleanup was successful (optional validation).
   * Checks that no stale resources remain.
   */
  async verify(adapter: ZeroADAdapter | null): Promise<boolean> {
    try {
      // If adapter still exists and is initialized, cleanup wasn't complete
      if (adapter && (adapter as any).initialized) {
        this.logger.warn('Verification failed: adapter still initialized');
        return false;
      }

      // Could add additional checks here:
      // - Check no orphan processes remain
      // - Check no stale IPC connections exist
      // - Check memory was released

      this.logger.debug('Cleanup verification passed');
      return true;
    } catch (err) {
      this.logger.warn('Cleanup verification failed', err);
      return false;
    }
  }
}
