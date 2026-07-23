import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  dbPath: string;
  schemaPath: string;
  wal?: boolean;
  maxConnections?: number;
}

/**
 * ResearchDatabase: Low-level database access for the Research Data Store.
 *
 * Responsibilities:
 * - Initialize SQLite database with WAL mode
 * - Load and execute schema
 * - Provide transaction support
 * - Manage database lifecycle
 *
 * Philosophy:
 * - Data integrity over speed
 * - ACID transactions for game atomicity
 * - WAL mode for concurrent reads while writing
 * - Immutable records (never update, only insert)
 */
export class ResearchDatabase {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = {
      wal: true,
      maxConnections: 5,
      ...config,
    };
  }

  /**
   * Initialize the database and load schema.
   * Safe to call multiple times (idempotent).
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    // Create directory if needed
    const dir = path.dirname(this.config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(this.config.dbPath);

    // Enable WAL mode for concurrent access
    if (this.config.wal) {
      this.db.pragma('journal_mode = WAL');
      // Increase timeout for writes
      this.db.pragma('busy_timeout = 10000');
      // Foreign key constraints
      this.db.pragma('foreign_keys = ON');
    }

    // Load and execute schema
    const schema = fs.readFileSync(this.config.schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get raw database instance for direct queries.
   * Use sparingly; prefer TypedQueries wrapper.
   */
  getRawDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Execute a query with bindings.
   * Returns all results.
   */
  query<T = any>(sql: string, params?: any[]): T[] {
    const db = this.getRawDb();
    const stmt = db.prepare(sql);
    return stmt.all(...(params || [])) as T[];
  }

  /**
   * Execute a query and get a single result.
   * Returns null if no rows found.
   */
  queryOne<T = any>(sql: string, params?: any[]): T | null {
    const db = this.getRawDb();
    const stmt = db.prepare(sql);
    return (stmt.get(...(params || [])) as T) || null;
  }

  /**
   * Execute an insert/update/delete statement.
   * Returns number of affected rows.
   */
  execute(sql: string, params?: any[]): number {
    const db = this.getRawDb();
    const stmt = db.prepare(sql);
    return stmt.run(...(params || [])).changes;
  }

  /**
   * Begin a transaction.
   * Used for atomic operations (e.g., recording a complete game).
   */
  transaction<T>(callback: (db: Database.Database) => T): T {
    const db = this.getRawDb();
    const transaction = db.transaction(callback);
    return transaction(db);
  }

  /**
   * Verify database integrity.
   * Runs PRAGMA integrity_check and returns results.
   */
  verify(): string[] {
    const db = this.getRawDb();
    const result = db.pragma('integrity_check') as any[];
    return result.map((row) => row.integrity_check);
  }

  /**
   * Get database statistics.
   * Returns counts and file size information.
   */
  stats(): {
    tables: number;
    experiments: number;
    runs: number;
    games: number;
    moves: number;
    llmDecisions: number;
    positions: number;
    fileSizeBytes: number;
    pageCount: number;
    pageSize: number;
  } {
    const db = this.getRawDb();

    const fileSizeBytes = fs.statSync(this.config.dbPath).size;
    const pageCount = (db.pragma('page_count') as any[])[0]?.page_count || 0;
    const pageSize = (db.pragma('page_size') as any[])[0]?.page_size || 4096;

    const tableCount = (
      db.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).get() as any
    ).count;

    const experimentCount = (
      db.prepare('SELECT COUNT(*) as count FROM experiments').get() as any
    ).count;

    const runCount = (
      db.prepare('SELECT COUNT(*) as count FROM runs').get() as any
    ).count;

    const gameCount = (
      db.prepare('SELECT COUNT(*) as count FROM games').get() as any
    ).count;

    const moveCount = (
      db.prepare('SELECT COUNT(*) as count FROM moves').get() as any
    ).count;

    const llmDecisionCount = (
      db.prepare('SELECT COUNT(*) as count FROM llm_decisions').get() as any
    ).count;

    const positionCount = (
      db.prepare('SELECT COUNT(*) as count FROM positions').get() as any
    ).count;

    return {
      tables: tableCount,
      experiments: experimentCount,
      runs: runCount,
      games: gameCount,
      moves: moveCount,
      llmDecisions: llmDecisionCount,
      positions: positionCount,
      fileSizeBytes,
      pageCount,
      pageSize,
    };
  }

  /**
   * Vacuum the database (compress and optimize).
   * Should be run periodically or after deleting many records.
   */
  vacuum(): void {
    const db = this.getRawDb();
    db.exec('VACUUM');
  }

  /**
   * Create a backup of the database file.
   * Returns path to backup file.
   */
  backup(backupPath?: string): string {
    const targetPath = backupPath || `${this.config.dbPath}.backup`;
    fs.copyFileSync(this.config.dbPath, targetPath);
    return targetPath;
  }

  /**
   * Restore from a backup file.
   * Closes current connection, replaces file, reinitializes.
   */
  async restore(backupPath: string): Promise<void> {
    this.close();
    fs.copyFileSync(backupPath, this.config.dbPath);
    await this.initialize();
  }

  /**
   * Delete all data from derived tables (but keep immutable core).
   * Used for regenerating analytics.
   */
  clearDerivedAnalytics(): void {
    const db = this.getRawDb();
    db.transaction(() => {
      db.exec('DELETE FROM opening_stats');
      db.exec('DELETE FROM model_performance');
      db.exec('DELETE FROM elo_progression');
    })();
  }

  /**
   * Reset occurrence_count in positions table.
   * Used before recalculating from moves.
   */
  resetPositionCounts(): void {
    const db = this.getRawDb();
    db.prepare('UPDATE positions SET occurrence_count = 0').run();
  }
}
