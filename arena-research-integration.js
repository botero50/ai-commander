/**
 * Arena Research Integration
 *
 * Bridges the autonomous chess arena (arena.js) with the Research Data Store via GameEventBus.
 * Subscribes to game events and persists them to a SQLite database.
 *
 * Key principle: Arena publishes events to GameEventBus.
 * This integration subscribes and routes events to persistence layer.
 * Fully decoupled, event-driven architecture.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGameEventBus } from './game-event-bus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * SQL schema for research database
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hypothesis TEXT,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  run_number INTEGER,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  game_count INTEGER DEFAULT 0,
  FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  white_model TEXT,
  black_model TEXT,
  result TEXT,
  move_count INTEGER,
  duration_ms INTEGER,
  pgn TEXT,
  final_fen TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS moves (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  move_number INTEGER,
  color TEXT,
  san TEXT,
  uci TEXT,
  fen_before TEXT,
  fen_after TEXT,
  latency_ms INTEGER,
  confidence REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS llm_decisions (
  id TEXT PRIMARY KEY,
  move_id TEXT,
  game_id TEXT NOT NULL,
  move_number INTEGER,
  prompt TEXT,
  response TEXT,
  parsing_status TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (move_id) REFERENCES moves(id)
);

CREATE INDEX IF NOT EXISTS idx_runs_experiment ON runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_games_run ON games(run_id);
CREATE INDEX IF NOT EXISTS idx_moves_game ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_decisions_game ON llm_decisions(game_id);
`;

export class ArenaResearchIntegration {
  constructor() {
    this.gameEventBus = getGameEventBus();
    this.db = null;
    this.dbPath = null;
    this.experimentId = null;
    this.runId = null;
    this.gameCount = 0;
    this.moveCount = 0;
    this.isInitialized = false;
  }

  /**
   * Initialize research integration with SQLite database
   */
  async initialize(dbPath) {
    try {
      this.dbPath = dbPath;

      // Open database
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');

      // Create schema
      this.db.exec(SCHEMA);

      // Subscribe to game events
      this.subscribeToGameEvents();
      this.isInitialized = true;

      console.log('✅ Research integration initialized');
      console.log(`   Database: ${dbPath}`);
      console.log(`   Events: game.started, move.made, game.finished`);
    } catch (error) {
      console.error('❌ Failed to initialize research integration:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to game events and persist them
   */
  subscribeToGameEvents() {
    // Subscribe to game.started
    this.gameEventBus.subscribe('game.started', (event) => {
      try {
        if (!this.db) return;

        // Create game record early (so moves can reference it via FK)
        const gameStmt = this.db.prepare(`
          INSERT OR IGNORE INTO games
          (id, run_id, white_model, black_model, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);

        gameStmt.run(
          event.gameId,
          this.runId,
          event.whiteModel,
          event.blackModel,
          event.timestamp
        );
      } catch (error) {
        console.error('Error handling game.started event:', error.message);
      }
    });

    // Subscribe to move.made
    this.gameEventBus.subscribe('move.made', (event) => {
      try {
        if (!this.db) return;

        // Generate IDs
        const moveId = `${event.gameId}-move-${event.moveNumber}`;
        const decisionId = `${event.gameId}-decision-${event.moveNumber}`;

        // Insert move record
        const moveStmt = this.db.prepare(`
          INSERT OR REPLACE INTO moves
          (id, game_id, move_number, color, san, uci, fen_before, fen_after, latency_ms, confidence, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        moveStmt.run(
          moveId,
          event.gameId,
          event.moveNumber,
          event.color,
          event.san,
          event.uci,
          event.fenBefore,
          event.fenAfter,
          event.latencyMs,
          event.confidence,
          event.timestamp
        );

        // Insert decision record if available
        if (event.decision) {
          const decisionStmt = this.db.prepare(`
            INSERT OR REPLACE INTO llm_decisions
            (id, move_id, game_id, move_number, prompt, response, parsing_status, tokens_in, tokens_out, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          decisionStmt.run(
            decisionId,
            moveId,
            event.gameId,
            event.moveNumber,
            event.decision.prompt,
            event.decision.response,
            event.decision.parsingStatus,
            event.decision.tokensIn,
            event.decision.tokensOut,
            event.timestamp
          );
        }

        this.moveCount++;
      } catch (error) {
        console.error('Error handling move.made event:', error.message);
      }
    });

    // Subscribe to game.finished
    this.gameEventBus.subscribe('game.finished', (event) => {
      try {
        if (!this.db) return;

        // Insert game record
        const gameStmt = this.db.prepare(`
          INSERT OR REPLACE INTO games
          (id, run_id, white_model, black_model, result, move_count, duration_ms, pgn, final_fen, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        gameStmt.run(
          event.gameId,
          this.runId,
          event.whiteModel,
          event.blackModel,
          event.result,
          event.moveCount,
          event.durationMs,
          event.pgn,
          event.finalFen,
          event.timestamp
        );

        this.gameCount++;

        // Log progress
        if (this.gameCount % 5 === 0) {
          console.log(`   📊 Recorded ${this.gameCount} games, ${this.moveCount} moves`);
        }
      } catch (error) {
        console.error('Error handling game.finished event:', error.message);
      }
    });
  }

  /**
   * Start an experiment
   */
  async startExperiment(input) {
    try {
      if (!this.isInitialized) {
        throw new Error('Research not initialized');
      }

      this.experimentId = `exp-${Date.now()}`;

      const stmt = this.db.prepare(`
        INSERT INTO experiments (id, name, hypothesis, created_at, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        this.experimentId,
        input.name,
        input.hypothesis || null,
        Date.now(),
        'active'
      );

      console.log(`✅ Experiment started: ${this.experimentId}`);
      return this.experimentId;
    } catch (error) {
      console.error('❌ Failed to start experiment:', error.message);
      throw error;
    }
  }

  /**
   * Start a run within the experiment
   */
  async startRun(input, environment) {
    try {
      if (!this.isInitialized) {
        throw new Error('Research not initialized');
      }

      this.runId = `run-${Date.now()}`;
      this.gameCount = 0;
      this.moveCount = 0;

      const stmt = this.db.prepare(`
        INSERT INTO runs (id, experiment_id, run_number, created_at, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        this.runId,
        this.experimentId,
        input.run_number || 1,
        Date.now(),
        'active'
      );

      console.log(`✅ Run started: ${this.runId}`);
      return this.runId;
    } catch (error) {
      console.error('❌ Failed to start run:', error.message);
      throw error;
    }
  }

  /**
   * Finish the current run
   */
  async finishRun() {
    try {
      if (!this.isInitialized || !this.runId) return;

      const stmt = this.db.prepare(`
        UPDATE runs SET status = ?, game_count = ? WHERE id = ?
      `);

      stmt.run('completed', this.gameCount, this.runId);

      console.log(`✅ Run finished: ${this.gameCount} games recorded`);
    } catch (error) {
      console.error('❌ Failed to finish run:', error.message);
      throw error;
    }
  }

  /**
   * Finish the experiment
   */
  async finishExperiment() {
    try {
      if (!this.isInitialized || !this.experimentId) return;

      const stmt = this.db.prepare(`
        UPDATE experiments SET status = ? WHERE id = ?
      `);

      stmt.run('completed', this.experimentId);

      console.log(`✅ Experiment finished: ${this.gameCount} games recorded`);
    } catch (error) {
      console.error('❌ Failed to finish experiment:', error.message);
      throw error;
    }
  }

  /**
   * Close the research database
   */
  async stop() {
    try {
      if (this.db) {
        this.db.close();
      }

      console.log('✅ Research database closed');
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ Failed to stop research:', error.message);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      experimentId: this.experimentId,
      runId: this.runId,
      gamesRecorded: this.gameCount,
      movesRecorded: this.moveCount,
    };
  }
}
