/**
 * EPIC 14 Phase 2: Research Data Access Layer
 *
 * Abstraction over the Research Data Store.
 * Hides SQLite implementation completely.
 *
 * Expresses operations in research concepts:
 * - createExperiment()
 * - startRun()
 * - recordGame()
 * - recordMove()
 * - recordDecision()
 * - recordPosition()
 *
 * Never: INSERT, SELECT, UPDATE, DELETE
 * Never: db.prepare(), db.run(), db.all()
 *
 * The runtime only cares about research operations.
 * Storage is an implementation detail.
 */

import { ResearchDatabase } from './database';
import { ResearchEventBus } from './event-bus';
import {
  Experiment,
  Run,
  Game,
  Move,
  LLMDecision,
  Position,
  ModelConfig,
  EnvironmentSnapshot,
  ExperimentInput,
  RunInput,
  GameInput,
  MoveInput,
  LLMDecisionInput,
} from './types';
import {
  GameFinished,
  MovePlayed,
  DecisionGenerated,
  PositionRecorded,
} from './events';
import { v4 as uuidv4 } from 'uuid';

/**
 * ResearchDataAccessLayer: Clean abstraction over storage.
 *
 * Responsibilities:
 * - Persist research events to database
 * - Provide research-centric query interface
 * - Manage batch writing (internal optimization)
 * - Maintain data integrity
 * - Hide SQLite implementation
 */
export class ResearchDataAccessLayer {
  private db: ResearchDatabase;
  private eventBus: ResearchEventBus;

  // Batch buffers for efficient writing
  private gameBuffer: GameInput[] = [];
  private moveBuffer: MoveInput[] = [];
  private decisionBuffer: LLMDecisionInput[] = [];
  private positionBuffer: { fen: string }[] = [];

  // Batch configuration
  private readonly GAME_BATCH_SIZE = 100;
  private readonly MOVE_BATCH_SIZE = 1000;
  private readonly DECISION_BATCH_SIZE = 1000;
  private readonly POSITION_BATCH_SIZE = 500;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

  private flushTimer: NodeJS.Timeout | null = null;

  constructor(db: ResearchDatabase, eventBus: ResearchEventBus) {
    this.db = db;
    this.eventBus = eventBus;

    // Subscribe to events from the event bus
    this.setupSubscriptions();

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Setup subscriptions to research events.
   * This is where events from the Arena are persisted.
   */
  private setupSubscriptions(): void {
    // Game finished: persist game record
    this.eventBus.subscribe('GameFinished', (event: GameFinished) => {
      this.onGameFinished(event);
    });

    // Move played: buffer move record
    this.eventBus.subscribe('MovePlayed', (event: MovePlayed) => {
      this.onMovePlayed(event);
    });

    // Decision generated: buffer decision record
    this.eventBus.subscribe('DecisionGenerated', (event: DecisionGenerated) => {
      this.onDecisionGenerated(event);
    });

    // Position recorded: buffer position record
    this.eventBus.subscribe('PositionRecorded', (event: PositionRecorded) => {
      this.onPositionRecorded(event);
    });
  }

  /**
   * Start periodic flush of buffered records.
   * Writes happen automatically in background.
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Error flushing buffered records:', error);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop periodic flush.
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush before shutdown
    this.flush().catch((error) => {
      console.error('Error in final flush:', error);
    });
  }

  // ========================================================================
  // PUBLIC API: Research-Centric Operations
  // ========================================================================

  /**
   * Create a new experiment.
   */
  async createExperiment(input: ExperimentInput): Promise<Experiment> {
    const experiment: Experiment = {
      id: uuidv4(),
      ...input,
      status: 'in-progress',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    this.db.execute(
      `INSERT INTO experiments (
        id, name, hypothesis, description, target_games, success_criteria,
        git_commit, application_version, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        experiment.id,
        experiment.name,
        experiment.hypothesis,
        experiment.description,
        experiment.target_games,
        experiment.success_criteria,
        experiment.git_commit,
        experiment.application_version,
        experiment.status,
        experiment.created_at,
        experiment.updated_at,
      ]
    );

    return experiment;
  }

  /**
   * Start a new run of an experiment.
   */
  async startRun(input: RunInput): Promise<Run> {
    const run: Run = {
      id: uuidv4(),
      ...input,
      status: 'in-progress',
      created_at: Date.now(),
      completed_game_count: 0,
      updated_at: Date.now(),
    };

    this.db.execute(
      `INSERT INTO runs (
        id, experiment_id, run_number, config_snapshot, environment_snapshot_id,
        git_commit, application_version, random_seed, execution_start, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.experiment_id,
        run.run_number,
        run.config_snapshot,
        run.environment_snapshot_id,
        run.git_commit,
        run.application_version,
        run.random_seed,
        run.execution_start,
        run.status,
        run.created_at,
        run.updated_at,
      ]
    );

    return run;
  }

  /**
   * Record a game (from event).
   * Buffers for batch writing.
   */
  async recordGame(gameData: GameInput): Promise<Game> {
    const game: Game = {
      id: gameData.id || uuidv4(),
      ...gameData,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    this.gameBuffer.push({
      ...gameData,
      id: game.id,
    });

    // Flush if buffer full
    if (this.gameBuffer.length >= this.GAME_BATCH_SIZE) {
      await this.flush();
    }

    return game;
  }

  /**
   * Record a move (from event).
   * Buffers for batch writing.
   */
  async recordMove(moveData: MoveInput): Promise<Move> {
    const move: Move = {
      id: moveData.id || uuidv4(),
      ...moveData,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    this.moveBuffer.push({
      ...moveData,
      id: move.id,
    });

    // Flush if buffer full
    if (this.moveBuffer.length >= this.MOVE_BATCH_SIZE) {
      await this.flush();
    }

    return move;
  }

  /**
   * Record an LLM decision (from event).
   * Buffers for batch writing.
   */
  async recordDecision(decisionData: LLMDecisionInput): Promise<LLMDecision> {
    const decision: LLMDecision = {
      id: decisionData.id || uuidv4(),
      ...decisionData,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    this.decisionBuffer.push({
      ...decisionData,
      id: decision.id,
    });

    // Flush if buffer full
    if (this.decisionBuffer.length >= this.DECISION_BATCH_SIZE) {
      await this.flush();
    }

    return decision;
  }

  /**
   * Record a position (from event).
   * Buffers for batch writing.
   */
  async recordPosition(fen: string): Promise<Position> {
    // Check if position already exists
    const existing = this.db.queryOne<Position>(
      'SELECT * FROM positions WHERE fen = ?',
      [fen]
    );

    if (existing) {
      // Update occurrence count
      this.db.execute('UPDATE positions SET occurrence_count = occurrence_count + 1 WHERE fen = ?', [
        fen,
      ]);
      return existing;
    }

    // New position
    const position: Position = {
      fen,
      occurrence_count: 1,
      first_seen: Date.now(),
      last_seen: Date.now(),
      updated_at: Date.now(),
    };

    this.positionBuffer.push({ fen });

    if (this.positionBuffer.length >= this.POSITION_BATCH_SIZE) {
      await this.flush();
    }

    return position;
  }

  /**
   * Rebuild derived analytics from immutable data.
   */
  async rebuildDerivedAnalytics(): Promise<void> {
    // Clear derived tables
    this.db.clearDerivedAnalytics();

    // Rebuild opening stats
    await this.rebuildOpeningStats();

    // Rebuild model performance
    await this.rebuildModelPerformance();

    // Rebuild Elo progression
    await this.rebuildEloProgression();
  }

  /**
   * Verify database integrity.
   */
  async verifyIntegrity(): Promise<boolean> {
    const results = this.db.verify();

    // Check for corruption
    for (const result of results) {
      if (result !== 'ok') {
        console.error('Database integrity check failed:', result);
        return false;
      }
    }

    // Check orphaned records
    const orphanedMoves = this.db.query<any>(
      `SELECT m.id FROM moves m
       LEFT JOIN games g ON m.game_id = g.id
       WHERE g.id IS NULL LIMIT 10`
    );

    if (orphanedMoves.length > 0) {
      console.error('Found orphaned moves:', orphanedMoves.length);
      return false;
    }

    const orphanedDecisions = this.db.query<any>(
      `SELECT l.id FROM llm_decisions l
       LEFT JOIN moves m ON l.move_id = m.id
       WHERE m.id IS NULL LIMIT 10`
    );

    if (orphanedDecisions.length > 0) {
      console.error('Found orphaned decisions:', orphanedDecisions.length);
      return false;
    }

    return true;
  }

  // ========================================================================
  // PRIVATE: Event Handlers & Batching
  // ========================================================================

  /**
   * Handle GameFinished event.
   */
  private async onGameFinished(event: GameFinished): Promise<void> {
    await this.recordGame({
      id: event.gameId,
      experiment_id: event.experimentId,
      run_id: event.runId,
      game_number: event.gameNumber,
      white_model: '', // Not in event
      black_model: '', // Not in event
      white_config_id: '', // Not in event
      black_config_id: '', // Not in event
      result: event.result,
      termination: event.termination,
      pgn: event.pgn,
      final_fen: event.finalFen,
      opening_eco: event.openingEco,
      opening_name: event.openingName,
      move_count: event.moveCount || 0,
      duration_ms: event.durationMs || 0,
      environment_snapshot_id: '', // Not in event
      git_commit: '', // Not in event
      application_version: '', // Not in event
      random_seed: undefined,
      engine_version: undefined,
      execution_start: event.timestamp,
      execution_end: event.timestamp,
      white_illegal_moves: event.whiteIllegalMoves || 0,
      black_illegal_moves: event.blackIllegalMoves || 0,
      avg_latency_ms: event.avgLatencyMs,
      max_latency_ms: event.maxLatencyMs,
      parsing_errors: event.parsingErrors || 0,
    });
  }

  /**
   * Handle MovePlayed event.
   */
  private async onMovePlayed(event: MovePlayed): Promise<void> {
    await this.recordMove({
      id: event.moveId,
      game_id: event.gameId,
      experiment_id: event.experimentId,
      run_id: event.runId,
      move_number: event.moveNumber,
      color: event.color,
      san: event.san,
      fen_before: event.fenBefore,
      fen_after: event.fenAfter,
      latency_ms: event.latencyMs,
      confidence: event.confidence,
      is_legal: event.isLegal,
      illegal_retry_count: event.illegalRetryCount || 0,
      model_name: event.modelName || '',
      model_config_id: event.modelConfigId || '',
      git_commit: '', // Not in event
      application_version: '', // Not in event
      execution_start: event.executionStart || event.timestamp,
      execution_end: event.executionEnd || event.timestamp,
    });
  }

  /**
   * Handle DecisionGenerated event.
   */
  private async onDecisionGenerated(event: DecisionGenerated): Promise<void> {
    await this.recordDecision({
      id: event.decisionId,
      move_id: event.moveId,
      game_id: event.gameId,
      experiment_id: event.experimentId,
      run_id: event.runId,
      prompt: event.prompt,
      prompt_version: event.promptVersion,
      prompt_hash: event.promptHash,
      prompt_template_name: event.promptTemplateName,
      model_identifier: event.modelIdentifier,
      model_config_id: event.modelConfigId,
      response: event.response,
      tokens_in: event.tokensIn,
      tokens_out: event.tokensOut,
      parsing_status: event.parsingStatus,
      parsed_move: event.parsedMove,
      parsing_notes: event.parsingNotes,
      retry_count: event.retryCount || 0,
      git_commit: '', // Not in event
      application_version: '', // Not in event
      execution_start: event.executionStart || event.timestamp,
      execution_end: event.executionEnd || event.timestamp,
    });
  }

  /**
   * Handle PositionRecorded event.
   */
  private async onPositionRecorded(event: PositionRecorded): Promise<void> {
    await this.recordPosition(event.fen);
  }

  /**
   * Flush all buffers to database (batched writes).
   */
  private async flush(): Promise<void> {
    // Use transaction to ensure atomicity
    this.db.transaction((db: any) => {
      // Write games
      for (const game of this.gameBuffer) {
        this.writeGame(db, game);
      }
      this.gameBuffer = [];

      // Write moves
      for (const move of this.moveBuffer) {
        this.writeMove(db, move);
      }
      this.moveBuffer = [];

      // Write decisions
      for (const decision of this.decisionBuffer) {
        this.writeDecision(db, decision);
      }
      this.decisionBuffer = [];

      // Write positions
      for (const position of this.positionBuffer) {
        this.writePosition(db, position);
      }
      this.positionBuffer = [];
    });
  }

  /**
   * Write game to database (internal).
   */
  private writeGame(db: any, game: GameInput & { id: string }): void {
    db.execute(
      `INSERT INTO games (
        id, experiment_id, run_id, game_number, white_model, black_model,
        white_config_id, black_config_id, result, termination, pgn, final_fen,
        opening_eco, opening_name, move_count, duration_ms, environment_snapshot_id,
        git_commit, application_version, random_seed, engine_version,
        execution_start, execution_end, created_at, updated_at,
        white_illegal_moves, black_illegal_moves, avg_latency_ms, max_latency_ms, parsing_errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.id,
        game.experiment_id,
        game.run_id,
        game.game_number,
        game.white_model,
        game.black_model,
        game.white_config_id,
        game.black_config_id,
        game.result,
        game.termination,
        game.pgn,
        game.final_fen,
        game.opening_eco,
        game.opening_name,
        game.move_count,
        game.duration_ms,
        game.environment_snapshot_id,
        game.git_commit,
        game.application_version,
        game.random_seed,
        game.engine_version,
        game.execution_start,
        game.execution_end,
        Date.now(),
        Date.now(),
        game.white_illegal_moves || 0,
        game.black_illegal_moves || 0,
        game.avg_latency_ms,
        game.max_latency_ms,
        game.parsing_errors || 0,
      ]
    );
  }

  /**
   * Write move to database (internal).
   */
  private writeMove(db: any, move: MoveInput & { id: string }): void {
    db.execute(
      `INSERT INTO moves (
        id, game_id, experiment_id, run_id, move_number, color, san,
        fen_before, fen_after, latency_ms, confidence, is_legal,
        illegal_retry_count, model_name, model_config_id, git_commit,
        application_version, execution_start, execution_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        move.id,
        move.game_id,
        move.experiment_id,
        move.run_id,
        move.move_number,
        move.color,
        move.san,
        move.fen_before,
        move.fen_after,
        move.latency_ms,
        move.confidence,
        move.is_legal ? 1 : 0,
        move.illegal_retry_count || 0,
        move.model_name,
        move.model_config_id,
        move.git_commit,
        move.application_version,
        move.execution_start,
        move.execution_end,
        Date.now(),
        Date.now(),
      ]
    );
  }

  /**
   * Write decision to database (internal).
   */
  private writeDecision(db: any, decision: LLMDecisionInput & { id: string }): void {
    db.execute(
      `INSERT INTO llm_decisions (
        id, move_id, game_id, experiment_id, run_id, prompt, prompt_version,
        prompt_hash, prompt_template_name, model_identifier, model_config_id,
        response, tokens_in, tokens_out, parsing_status, parsed_move,
        parsing_notes, retry_count, git_commit, application_version,
        execution_start, execution_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        decision.id,
        decision.move_id,
        decision.game_id,
        decision.experiment_id,
        decision.run_id,
        decision.prompt,
        decision.prompt_version,
        decision.prompt_hash,
        decision.prompt_template_name,
        decision.model_identifier,
        decision.model_config_id,
        decision.response,
        decision.tokens_in,
        decision.tokens_out,
        decision.parsing_status,
        decision.parsed_move,
        decision.parsing_notes,
        decision.retry_count || 0,
        decision.git_commit,
        decision.application_version,
        decision.execution_start,
        decision.execution_end,
        Date.now(),
        Date.now(),
      ]
    );
  }

  /**
   * Write position to database (internal).
   */
  private writePosition(db: any, position: { fen: string }): void {
    const existing = db.prepare('SELECT * FROM positions WHERE fen = ?').get(
      position.fen
    );

    if (existing) {
      db.prepare(
        'UPDATE positions SET occurrence_count = occurrence_count + 1, last_seen = ? WHERE fen = ?'
      ).run(Date.now(), position.fen);
    } else {
      db.prepare(
        `INSERT INTO positions (fen, occurrence_count, first_seen, last_seen, updated_at)
         VALUES (?, 1, ?, ?, ?)`
      ).run(position.fen, Date.now(), Date.now(), Date.now());
    }
  }

  /**
   * Rebuild opening_stats from immutable data.
   */
  private async rebuildOpeningStats(): Promise<void> {
    const stats = this.db.query<any>(
      `SELECT opening_eco, opening_name, COUNT(*) as occurrence_count,
              SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as white_wins,
              SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
              SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as black_wins,
              AVG(move_count) as avg_moves
       FROM games
       WHERE opening_eco IS NOT NULL
       GROUP BY opening_eco`
    );

    for (const stat of stats) {
      this.db.execute(
        `INSERT INTO opening_stats (
          id, eco_code, opening_name, occurrence_count, white_wins, black_wins, draws, avg_moves, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          stat.opening_eco,
          stat.opening_name,
          stat.occurrence_count,
          stat.white_wins || 0,
          stat.black_wins || 0,
          stat.draws || 0,
          Math.round(stat.avg_moves || 0),
          Date.now(),
        ]
      );
    }
  }

  /**
   * Rebuild model_performance from immutable data.
   */
  private async rebuildModelPerformance(): Promise<void> {
    // Get unique models
    const models = this.db.query<any>(
      `SELECT DISTINCT white_model as model FROM games
       UNION
       SELECT DISTINCT black_model FROM games`
    );

    for (const row of models) {
      const model = row.model;

      // Calculate stats for this model as white
      const whiteStats = this.db.queryOne<any>(
        `SELECT COUNT(*) as games,
                SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as losses,
                AVG(avg_latency_ms) as avg_latency
         FROM games
         WHERE white_model = ?`,
        [model]
      ) || { games: 0, wins: 0, draws: 0, losses: 0, avg_latency: 0 };

      // Calculate stats for this model as black
      const blackStats = this.db.queryOne<any>(
        `SELECT COUNT(*) as games,
                SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as losses,
                AVG(avg_latency_ms) as avg_latency
         FROM games
         WHERE black_model = ?`,
        [model]
      ) || { games: 0, wins: 0, draws: 0, losses: 0, avg_latency: 0 };

      const totalGames =
        (whiteStats.games || 0) + (blackStats.games || 0);
      const totalWins = (whiteStats.wins || 0) + (blackStats.wins || 0);
      const totalDraws = (whiteStats.draws || 0) + (blackStats.draws || 0);
      const totalLosses = (whiteStats.losses || 0) + (blackStats.losses || 0);
      const totalLatency =
        ((whiteStats.avg_latency || 0) + (blackStats.avg_latency || 0)) / 2;

      const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
      const legalMoveRate = 100; // TODO: calculate from moves table

      this.db.execute(
        `INSERT INTO model_performance (
          id, model_identifier, games_as_white, games_as_black, wins_as_white, wins_as_black,
          total_wins, draws, losses, win_rate_percent, avg_decision_latency_ms,
          legal_move_rate_percent, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          model,
          whiteStats.games || 0,
          blackStats.games || 0,
          whiteStats.wins || 0,
          blackStats.wins || 0,
          totalWins,
          totalDraws,
          totalLosses,
          winRate,
          Math.round(totalLatency),
          legalMoveRate,
          Date.now(),
        ]
      );
    }
  }

  /**
   * Rebuild elo_progression from immutable data.
   */
  private async rebuildEloProgression(): Promise<void> {
    // TODO: Implement Elo calculation from games table
    // For now, placeholder
    console.log('Elo progression rebuild not yet implemented');
  }
}

export { ResearchDatabase };
