/**
 * Arena Research Store Wrapper
 *
 * Integrates Arena with EPIC 14 Phase 2 Research Data Store.
 *
 * This wrapper handles:
 * - Research integration lifecycle (init, start, stop)
 * - Event publishing for all game/move/decision events
 * - Arena state management (current experiment/run)
 * - Error handling and logging
 * - Transparent batching (internal to data access layer)
 *
 * Arena code calls methods like recordGameResult(), recordMove(), etc.
 * Wrapper routes events to ResearchEventBus → ResearchDataAccessLayer → SQLite
 *
 * Zero coupling: Arena doesn't know about events, batching, or storage.
 */

import path from 'path';
import { Logger } from './config/logger.js';

export interface GameRecord {
  readonly id: string;
  readonly gameNumber?: number;
  readonly white: { model: string; configId?: string };
  readonly black: { model: string; configId?: string };
  readonly result?: string;
  readonly pgn?: string;
  readonly finalFen?: string;
  readonly moves?: MoveRecord[];
  readonly durationMs?: number;
  readonly termination?: string;
  readonly openingEco?: string;
  readonly openingName?: string;
}

export interface MoveRecord {
  readonly id?: string;
  readonly gameId: string;
  readonly number: number;
  readonly color: string;
  readonly san: string;
  readonly fenBefore: string;
  readonly fenAfter: string;
  readonly latencyMs?: number;
  readonly confidence?: number;
  readonly isLegal?: boolean;
  readonly modelName: string;
  readonly configId?: string;
  readonly illegalRetries?: number;
  readonly decision?: {
    readonly id?: string;
    readonly prompt?: string;
    readonly response?: string;
    readonly parsingStatus?: string;
    readonly parsedMove?: string;
    readonly tokensIn?: number;
    readonly tokensOut?: number;
  };
}

/**
 * Wrapper for integrating Arena with Research Data Store
 */
export class ArenaResearchWrapper {
  private integration: any = null; // ResearchIntegration type
  private experimentId: string | null = null;
  private runId: string | null = null;
  private logger: Logger;
  private gameCount = 0;
  private isInitialized = false;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'ArenaResearchWrapper');
  }

  /**
   * Initialize research integration
   * Creates/opens SQLite database and sets up event bus
   */
  async initialize(dbPath: string, schemaPath: string): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Research integration already initialized');
      return;
    }

    try {
      // Import research store dynamically to avoid circular dependencies
      const { createArenaIntegration } = await import('@ai-commander/research-store');

      this.integration = await createArenaIntegration(dbPath, schemaPath);
      this.isInitialized = true;
      this.gameCount = 0;

      this.logger.info('Research integration initialized', {
        dbPath,
        schemaPath: path.basename(schemaPath),
      });
    } catch (error) {
      this.logger.error('Failed to initialize research integration', error);
      throw error;
    }
  }

  /**
   * Start a new experiment
   * Called once at Arena startup
   */
  async startExperiment(name: string, hypothesis: string): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized. Call initialize() first.');
    }

    try {
      this.experimentId = await this.integration.startExperiment({
        name,
        hypothesis,
        git_commit: process.env.GIT_COMMIT || 'unknown',
        application_version: '1.0.0',
      });

      this.logger.info('Experiment started', {
        experimentId: this.experimentId,
        name,
      });
    } catch (error) {
      this.logger.error('Failed to start experiment', error);
      throw error;
    }
  }

  /**
   * Start a new run within the experiment
   * Called at the beginning of each Arena session
   */
  async startRun(config: any): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }
    if (!this.experimentId) {
      throw new Error('Experiment not started. Call startExperiment() first.');
    }

    try {
      const os = await import('os');
      const osModule = os as any;

      this.runId = await this.integration.startRun(
        {
          run_number: 1,
          config_snapshot: JSON.stringify(config),
          git_commit: process.env.GIT_COMMIT || 'unknown',
          application_version: '1.0.0',
          execution_start: Date.now(),
        },
        {
          os: process.platform,
          osVersion: osModule.release(),
          nodeVersion: process.version,
          cpuCores: osModule.cpus().length,
          ramGb: Math.round(osModule.totalmem() / 1024 / 1024 / 1024),
          storageAvailableGb: 0, // TODO: calculate available disk space
          ollamaVersion: process.env.OLLAMA_VERSION || 'unknown',
        }
      );

      this.gameCount = 0;
      this.logger.info('Run started', { runId: this.runId });
    } catch (error) {
      this.logger.error('Failed to start run', error);
      throw error;
    }
  }

  /**
   * Record a game result
   * Called after each game completes
   */
  async recordGameResult(game: GameRecord): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.publishGameResult(
        game.id,
        game.gameNumber || ++this.gameCount,
        game.white.model || 'unknown',
        game.black.model || 'unknown',
        game.white.configId || 'default',
        game.black.configId || 'default',
        game.result || 'draw',
        game.pgn || '',
        game.finalFen || '',
        game.moves?.length || 0,
        game.durationMs || 0,
        game.termination || 'unknown',
        game.openingEco || 'unknown',
        game.openingName || 'unknown'
      );

      this.logger.debug('Game result recorded', {
        gameId: game.id,
        gameNumber: game.gameNumber || this.gameCount,
      });
    } catch (error) {
      this.logger.error('Failed to record game result', {
        gameId: game.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Record a move within a game
   * Called for each move after execution
   */
  async recordMove(move: MoveRecord): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.publishMoveResult(
        move.id || `move-${Date.now()}-${Math.random()}`,
        move.gameId || 'unknown',
        move.number || 0,
        move.color || 'white',
        move.san || 'unknown',
        move.fenBefore || '',
        move.fenAfter || '',
        move.latencyMs || 0,
        move.confidence ?? 0.5,
        move.isLegal !== false,
        move.modelName || 'unknown',
        move.configId || 'default',
        move.illegalRetries || 0
      );

      this.logger.debug('Move recorded', {
        moveId: move.id,
        gameId: move.gameId,
        moveNumber: move.number,
      });
    } catch (error) {
      this.logger.error('Failed to record move', {
        moveId: move.id,
        gameId: move.gameId,
        error,
      });
      throw error;
    }
  }

  /**
   * Record an LLM decision for a move
   * Called after LLM generates a move
   */
  async recordLLMDecision(move: MoveRecord): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      const decision = move.decision || {};

      await this.integration.publishLLMDecision(
        decision.id || `decision-${Date.now()}-${Math.random()}`,
        move.id || 'unknown',
        move.gameId || 'unknown',
        `ollama:${move.modelName || 'unknown'}`,
        move.configId || 'default',
        decision.prompt || '',
        decision.response || '',
        decision.parsingStatus || 'unknown',
        decision.parsedMove || move.san || 'unknown',
        undefined, // reasoning
        undefined, // confidence_score
        undefined, // error_message
        decision.tokensIn || 0,
        decision.tokensOut || 0
      );

      this.logger.debug('LLM decision recorded', {
        decisionId: decision.id,
        moveId: move.id,
        gameId: move.gameId,
      });
    } catch (error) {
      this.logger.error('Failed to record LLM decision', {
        moveId: move.id,
        gameId: move.gameId,
        error,
      });
      throw error;
    }
  }

  /**
   * Finish the current run
   * Called when a session ends (success or failure)
   */
  async finishRun(status: 'completed' | 'failed', gameCount?: number): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      const finalGameCount = gameCount ?? this.gameCount;
      await this.integration.finishRun(status, finalGameCount);

      this.logger.info('Run finished', {
        status,
        gameCount: finalGameCount,
      });
    } catch (error) {
      this.logger.error('Failed to finish run', { status, error });
      throw error;
    }
  }

  /**
   * Finish the experiment
   * Called when Arena is shutting down
   */
  async finishExperiment(status: 'completed' | 'failed', gameCount?: number): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      const finalGameCount = gameCount ?? this.gameCount;
      await this.integration.finishExperiment(status, finalGameCount);

      this.logger.info('Experiment finished', {
        status,
        gameCount: finalGameCount,
      });
    } catch (error) {
      this.logger.error('Failed to finish experiment', { status, error });
      throw error;
    }
  }

  /**
   * Flush any buffered data and close connections
   * Called on Arena shutdown
   */
  async stop(): Promise<void> {
    if (!this.integration) {
      this.logger.debug('Research integration not active, nothing to stop');
      return;
    }

    try {
      await this.integration.stop();
      this.integration = null;
      this.isInitialized = false;

      this.logger.info('Research integration stopped');
    } catch (error) {
      this.logger.error('Failed to stop research integration', error);
      throw error;
    }
  }

  /**
   * Get current state (for debugging/monitoring)
   */
  getState(): {
    isInitialized: boolean;
    experimentId: string | null;
    runId: string | null;
    gameCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      experimentId: this.experimentId,
      runId: this.runId,
      gameCount: this.gameCount,
    };
  }
}
