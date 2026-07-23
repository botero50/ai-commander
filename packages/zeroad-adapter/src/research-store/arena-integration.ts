/**
 * EPIC 14 Phase 2: Arena Integration
 *
 * Bridges the Arena with the Research Data Store via events.
 *
 * The Arena publishes research events.
 * The Research Data Store subscribes and persists.
 * Everything else (metrics, analytics, reporting) subscribes independently.
 *
 * This is the ONLY integration point between Arena and Research Data Store.
 * Changes to storage never require changes to Arena.
 */

import { ResearchEventBus } from './event-bus';
import { ResearchDataAccessLayer } from './data-access';
import { ResearchDatabase } from './database';
import {
  ExperimentStarted,
  RunStarted,
  RunFinished,
  GameStarted,
  GameFinished,
  MovePlayed,
  DecisionGenerated,
  PositionRecorded,
  EnvironmentSnapshotCaptured,
  ArenaStarted,
  ArenaFinished,
  ArenaRecovered,
  EnvironmentData,
} from './events';
import { ExperimentInput, RunInput } from './types';

/**
 * ArenaResearchIntegration: Bridge between Arena and Research Data Store.
 *
 * Provides methods for Arena to publish research events.
 * Automatically persists events via the Data Access Layer.
 *
 * Usage in arena.js:
 * ```typescript
 * const integration = new ArenaResearchIntegration(db, eventBus);
 *
 * // Start of experiment
 * await integration.startExperiment(name, hypothesis)
 * const run = await integration.startRun(config, environment)
 *
 * // During game
 * const game = await playGame()
 * await integration.publishGameResult(game)
 *
 * // End of run
 * await integration.finishRun(status)
 * ```
 */
export class ArenaResearchIntegration {
  private db: ResearchDatabase;
  private eventBus: ResearchEventBus;
  private dataAccess: ResearchDataAccessLayer;

  private currentExperimentId: string | null = null;
  private currentRunId: string | null = null;
  private experimentStartTime: number | null = null;
  private runStartTime: number | null = null;

  constructor(
    db: ResearchDatabase,
    eventBus: ResearchEventBus,
    dataAccess: ResearchDataAccessLayer
  ) {
    this.db = db;
    this.eventBus = eventBus;
    this.dataAccess = dataAccess;
  }

  // ========================================================================
  // EXPERIMENT LIFECYCLE
  // ========================================================================

  /**
   * Start a new research experiment.
   * Called at the beginning of arena execution.
   */
  async startExperiment(input: ExperimentInput): Promise<string> {
    // Create experiment via data access layer
    const experiment = await this.dataAccess.createExperiment(input);
    this.currentExperimentId = experiment.id;
    this.experimentStartTime = Date.now();

    // Publish event for other systems
    this.eventBus.publish(
      new ExperimentStarted(
        experiment.id,
        experiment.name,
        experiment.hypothesis,
        input.description,
        input.target_games,
        input.success_criteria,
        input.git_commit,
        input.application_version
      )
    );

    return experiment.id;
  }

  /**
   * Finish the current experiment.
   */
  async finishExperiment(
    status: 'completed' | 'failed',
    gameCount?: number
  ): Promise<void> {
    if (!this.currentExperimentId) {
      throw new Error('No experiment currently active');
    }

    const durationSeconds = this.experimentStartTime
      ? Math.floor((Date.now() - this.experimentStartTime) / 1000)
      : 0;

    this.eventBus.publish(
      new ExperimentFinished(
        this.currentExperimentId,
        status,
        gameCount,
        durationSeconds
      )
    );

    this.currentExperimentId = null;
    this.experimentStartTime = null;
  }

  // ========================================================================
  // RUN LIFECYCLE
  // ========================================================================

  /**
   * Start a new run of the current experiment.
   */
  async startRun(
    input: Omit<RunInput, 'experiment_id'>,
    environment: EnvironmentData
  ): Promise<string> {
    if (!this.currentExperimentId) {
      throw new Error('No experiment currently active');
    }

    // Create environment snapshot
    this.eventBus.publish(
      new EnvironmentSnapshotCaptured(
        '', // runId not yet assigned
        this.currentExperimentId,
        environment
      )
    );

    // Create run via data access layer
    const run = await this.dataAccess.startRun({
      ...input,
      experiment_id: this.currentExperimentId,
    });

    this.currentRunId = run.id;
    this.runStartTime = Date.now();

    // Publish event
    this.eventBus.publish(
      new RunStarted(
        run.id,
        this.currentExperimentId,
        run.run_number,
        input.config_snapshot,
        environment,
        input.git_commit,
        input.application_version,
        input.random_seed
      )
    );

    // Publish arena started event
    this.eventBus.publish(
      new ArenaStarted(
        this.currentExperimentId,
        run.id,
        environment,
        input.git_commit,
        input.application_version
      )
    );

    return run.id;
  }

  /**
   * Finish the current run.
   */
  async finishRun(
    status: 'completed' | 'failed',
    gameCount?: number
  ): Promise<void> {
    if (!this.currentRunId || !this.currentExperimentId) {
      throw new Error('No run currently active');
    }

    const durationSeconds = this.runStartTime
      ? Math.floor((Date.now() - this.runStartTime) / 1000)
      : 0;

    this.eventBus.publish(
      new RunFinished(
        this.currentRunId,
        this.currentExperimentId,
        status,
        gameCount,
        durationSeconds
      )
    );

    // Publish arena finished event
    this.eventBus.publish(
      new ArenaFinished(
        this.currentRunId,
        this.currentExperimentId,
        status === 'completed' ? 'success' : 'error',
        gameCount,
        durationSeconds
      )
    );

    this.currentRunId = null;
    this.runStartTime = null;
  }

  // ========================================================================
  // GAME EVENTS
  // ========================================================================

  /**
   * Publish a game result.
   * Called after each game completes.
   */
  async publishGameResult(
    gameId: string,
    gameNumber: number,
    whiteModel: string,
    blackModel: string,
    whiteConfigId: string,
    blackConfigId: string,
    result: '1' | '0.5' | '0',
    pgn: string,
    finalFen: string,
    moveCount: number,
    durationMs: number,
    termination?: string,
    openingEco?: string,
    openingName?: string,
    whiteIllegalMoves?: number,
    blackIllegalMoves?: number,
    avgLatencyMs?: number,
    maxLatencyMs?: number,
    parsingErrors?: number
  ): Promise<void> {
    if (!this.currentRunId || !this.currentExperimentId) {
      throw new Error('No run currently active');
    }

    const executionStart = Date.now();

    // Publish game finished event
    this.eventBus.publish(
      new GameFinished(
        gameId,
        this.currentRunId,
        this.currentExperimentId,
        gameNumber,
        result,
        termination,
        pgn,
        finalFen,
        openingEco,
        openingName,
        moveCount,
        durationMs,
        executionStart,
        whiteIllegalMoves,
        blackIllegalMoves,
        avgLatencyMs,
        maxLatencyMs,
        parsingErrors
      )
    );
  }

  /**
   * Publish a move played event.
   * Called for each move during game execution.
   */
  async publishMoveResult(
    moveId: string,
    gameId: string,
    moveNumber: number,
    color: 'white' | 'black',
    san: string,
    fenBefore: string,
    fenAfter: string,
    latencyMs: number,
    confidence: number,
    isLegal: boolean,
    modelName: string,
    modelConfigId: string,
    illegalRetryCount?: number
  ): Promise<void> {
    if (!this.currentRunId || !this.currentExperimentId) {
      throw new Error('No run currently active');
    }

    const executionStart = Date.now();

    // Publish move played event
    this.eventBus.publish(
      new MovePlayed(
        moveId,
        gameId,
        this.currentRunId,
        this.currentExperimentId,
        moveNumber,
        color,
        san,
        fenBefore,
        fenAfter,
        latencyMs,
        confidence,
        isLegal,
        illegalRetryCount,
        modelName,
        modelConfigId,
        executionStart,
        executionStart
      )
    );

    // Record position
    await this.publishPosition(fenAfter);
  }

  // ========================================================================
  // LLM DECISION EVENTS
  // ========================================================================

  /**
   * Publish an LLM decision.
   * Called after receiving response from Ollama.
   */
  async publishLLMDecision(
    decisionId: string,
    moveId: string,
    gameId: string,
    modelIdentifier: string,
    modelConfigId: string,
    prompt: string,
    response: string,
    parsingStatus: 'success' | 'failed' | 'malformed',
    parsedMove?: string,
    promptVersion?: string,
    promptHash?: string,
    promptTemplateName?: string,
    tokensIn?: number,
    tokensOut?: number,
    parsingNotes?: string,
    retryCount?: number
  ): Promise<void> {
    if (!this.currentRunId || !this.currentExperimentId) {
      throw new Error('No run currently active');
    }

    const executionStart = Date.now();

    this.eventBus.publish(
      new DecisionGenerated(
        decisionId,
        moveId,
        gameId,
        this.currentRunId,
        this.currentExperimentId,
        modelIdentifier,
        modelConfigId,
        prompt,
        response,
        parsingStatus,
        parsedMove,
        promptVersion,
        promptHash,
        promptTemplateName,
        tokensIn,
        tokensOut,
        parsingNotes,
        retryCount,
        executionStart,
        executionStart
      )
    );
  }

  // ========================================================================
  // POSITION EVENTS
  // ========================================================================

  /**
   * Publish a position recorded event.
   * Called for new positions during game execution.
   */
  async publishPosition(
    fen: string,
    whitePieces?: number,
    blackPieces?: number,
    isEndgame?: boolean,
    isCheck?: boolean
  ): Promise<void> {
    this.eventBus.publish(
      new PositionRecorded(
        fen,
        whitePieces || 0,
        blackPieces || 0,
        isEndgame,
        isCheck
      )
    );
  }

  // ========================================================================
  // RUNTIME EVENTS
  // ========================================================================

  /**
   * Publish arena recovery event.
   * Called when arena recovers from an error.
   */
  async publishArenaRecovery(
    errorType: string,
    recovery: string,
    successfullRetry: boolean
  ): Promise<void> {
    if (!this.currentRunId || !this.currentExperimentId) {
      throw new Error('No run currently active');
    }

    this.eventBus.publish(
      new ArenaRecovered(
        this.currentRunId,
        this.currentExperimentId,
        errorType,
        recovery,
        successfullRetry
      )
    );
  }

  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================

  /**
   * Get current experiment ID.
   */
  getCurrentExperimentId(): string | null {
    return this.currentExperimentId;
  }

  /**
   * Get current run ID.
   */
  getCurrentRunId(): string | null {
    return this.currentRunId;
  }

  /**
   * Check if an experiment is active.
   */
  isExperimentActive(): boolean {
    return this.currentExperimentId !== null;
  }

  /**
   * Check if a run is active.
   */
  isRunActive(): boolean {
    return this.currentRunId !== null;
  }

  // ========================================================================
  // MAINTENANCE
  // ========================================================================

  /**
   * Flush all buffered records to database.
   * Call before shutting down.
   */
  async flush(): Promise<void> {
    // Flush is handled automatically by DataAccessLayer
    // This is here for explicit control if needed
  }

  /**
   * Stop the integration.
   * Flushes and cleans up.
   */
  async stop(): Promise<void> {
    await this.flush();
    this.dataAccess.stop();
  }

  /**
   * Get integration statistics.
   */
  getStats(): {
    currentExperiment: string | null;
    currentRun: string | null;
    eventBusStats: any;
    databaseStats: any;
  } {
    return {
      currentExperiment: this.currentExperimentId,
      currentRun: this.currentRunId,
      eventBusStats: this.eventBus.getStats(),
      databaseStats: this.db.stats(),
    };
  }
}

/**
 * Factory function to create and initialize integration.
 */
export async function createArenaIntegration(
  dbPath: string,
  schemaPath: string
): Promise<ArenaResearchIntegration> {
  // Initialize database
  const db = new ResearchDatabase({
    dbPath,
    schemaPath,
    wal: true,
  });
  await db.initialize();

  // Create event bus
  const eventBus = new ResearchEventBus();

  // Create data access layer
  const dataAccess = new ResearchDataAccessLayer(db, eventBus);

  // Create integration
  return new ArenaResearchIntegration(db, eventBus, dataAccess);
}
