/**
 * EPIC 14 Phase 2: Validation & Testing Framework
 *
 * Tools for validating the Research Data Store integration.
 *
 * Tests:
 * 1. Event publishing works
 * 2. Events are persisted correctly
 * 3. All data types are preserved
 * 4. Batch writing is transparent
 * 5. Database integrity is maintained
 * 6. Performance is not degraded
 */

import { ResearchDatabase } from './database';
import { ResearchEventBus } from './event-bus';
import { ResearchDataAccessLayer } from './data-access';
import { ArenaResearchIntegration } from './arena-integration';

/**
 * ValidationResult: Test result with details.
 */
export interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: Record<string, any>;
}

/**
 * ResearchDataStoreValidator: Comprehensive validation suite.
 */
export class ResearchDataStoreValidator {
  private db: ResearchDatabase;
  private eventBus: ResearchEventBus;
  private dataAccess: ResearchDataAccessLayer;
  private integration: ArenaResearchIntegration;

  constructor(
    db: ResearchDatabase,
    eventBus: ResearchEventBus,
    dataAccess: ResearchDataAccessLayer,
    integration: ArenaResearchIntegration
  ) {
    this.db = db;
    this.eventBus = eventBus;
    this.dataAccess = dataAccess;
    this.integration = integration;
  }

  /**
   * Run all validation tests.
   */
  async runAllTests(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Basic functionality tests
    results.push(await this.testEventBusPublish());
    results.push(await this.testEventBusSubscription());
    results.push(await this.testExperimentCreation());
    results.push(await this.testRunCreation());

    // Data persistence tests
    results.push(await this.testGamePersistence());
    results.push(await this.testMovePersistence());
    results.push(await this.testDecisionPersistence());
    results.push(await this.testPositionDeduplication());

    // Integration tests
    results.push(await this.testCompleteGameFlow());
    results.push(await this.testBatchWriting());

    // Integrity tests
    results.push(await this.testDataIntegrity());
    results.push(await this.testForeignKeyIntegrity());
    results.push(await this.testNoOrphanedRecords());

    // Performance tests
    results.push(await this.testBatchPerformance());
    results.push(await this.testDatabaseSize());

    return results;
  }

  /**
   * Test: Event bus can publish events.
   */
  private async testEventBusPublish(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const { GameFinished } = await import('./events');

      this.eventBus.publish(
        new GameFinished(
          'test-game-1',
          'test-run-1',
          'test-exp-1',
          1,
          '1',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          25,
          15000
        )
      );

      const stats = this.eventBus.getStats();
      const passed = stats.totalEvents > 0;

      return {
        name: 'Event Bus Publishing',
        passed,
        message: passed ? 'Event published successfully' : 'No events found',
        duration: Date.now() - start,
        details: { eventCount: stats.totalEvents },
      };
    } catch (error) {
      return {
        name: 'Event Bus Publishing',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Event bus subscription works.
   */
  private async testEventBusSubscription(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      let subscriptionWorked = false;
      const { GameFinished } = await import('./events');

      this.eventBus.subscribe('GameFinished', () => {
        subscriptionWorked = true;
      });

      this.eventBus.publish(
        new GameFinished(
          'test-game-2',
          'test-run-1',
          'test-exp-1',
          2,
          '0.5',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          30,
          20000
        )
      );

      return {
        name: 'Event Bus Subscription',
        passed: subscriptionWorked,
        message: subscriptionWorked
          ? 'Subscription triggered'
          : 'Subscription not triggered',
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'Event Bus Subscription',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Experiment creation works.
   */
  private async testExperimentCreation(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const experiment = await this.dataAccess.createExperiment({
        name: 'validation-test-experiment',
        hypothesis: 'Test experiment for validation',
        git_commit: 'test-commit',
        application_version: '1.0.0-test',
      });

      const passed = !!experiment.id && experiment.status === 'in-progress';

      return {
        name: 'Experiment Creation',
        passed,
        message: passed ? 'Experiment created' : 'Experiment creation failed',
        duration: Date.now() - start,
        details: { experimentId: experiment.id },
      };
    } catch (error) {
      return {
        name: 'Experiment Creation',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Run creation works.
   */
  private async testRunCreation(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const run = await this.dataAccess.startRun(
        {
          run_number: 1,
          config_snapshot: JSON.stringify({ test: true }),
          git_commit: 'test-commit',
          application_version: '1.0.0-test',
          execution_start: Date.now(),
        },
        {
          os: 'test',
          osVersion: '1.0',
          nodeVersion: 'v18',
          cpuCores: 4,
          ramGb: 16,
        }
      );

      const passed = !!run.id && run.status === 'in-progress';

      return {
        name: 'Run Creation',
        passed,
        message: passed ? 'Run created' : 'Run creation failed',
        duration: Date.now() - start,
        details: { runId: run.id },
      };
    } catch (error) {
      return {
        name: 'Run Creation',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Games persist to database.
   */
  private async testGamePersistence(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      await this.dataAccess.recordGame({
        id: 'test-game-persist',
        experiment_id: 'test-exp',
        run_id: 'test-run',
        game_number: 1,
        white_model: 'tinyllama',
        black_model: 'mistral',
        white_config_id: 'cfg-1',
        black_config_id: 'cfg-2',
        result: '1',
        pgn: '[Event "Test"]',
        final_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        move_count: 10,
        duration_ms: 5000,
        environment_snapshot_id: 'env-1',
        git_commit: 'test',
        application_version: '1.0.0-test',
        execution_start: Date.now(),
        execution_end: Date.now(),
      });

      // Flush to ensure write
      await this.dataAccess['flush']();

      // Query database
      const games = this.db.query<any>(
        'SELECT * FROM games WHERE id = ?',
        ['test-game-persist']
      );

      const passed = games.length === 1;

      return {
        name: 'Game Persistence',
        passed,
        message: passed ? 'Game persisted to database' : 'Game not found',
        duration: Date.now() - start,
        details: { gameCount: games.length },
      };
    } catch (error) {
      return {
        name: 'Game Persistence',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Moves persist to database.
   */
  private async testMovePersistence(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      await this.dataAccess.recordMove({
        id: 'test-move-persist',
        game_id: 'test-game',
        experiment_id: 'test-exp',
        run_id: 'test-run',
        move_number: 1,
        color: 'white',
        san: 'e4',
        fen_before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fen_after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        latency_ms: 100,
        confidence: 95,
        is_legal: true,
        model_name: 'tinyllama',
        model_config_id: 'cfg-1',
        git_commit: 'test',
        application_version: '1.0.0-test',
        execution_start: Date.now(),
        execution_end: Date.now(),
      });

      // Flush to ensure write
      await this.dataAccess['flush']();

      // Query database
      const moves = this.db.query<any>(
        'SELECT * FROM moves WHERE id = ?',
        ['test-move-persist']
      );

      const passed = moves.length === 1;

      return {
        name: 'Move Persistence',
        passed,
        message: passed ? 'Move persisted to database' : 'Move not found',
        duration: Date.now() - start,
        details: { moveCount: moves.length },
      };
    } catch (error) {
      return {
        name: 'Move Persistence',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: LLM decisions persist to database.
   */
  private async testDecisionPersistence(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      await this.dataAccess.recordDecision({
        id: 'test-decision-persist',
        move_id: 'test-move',
        game_id: 'test-game',
        experiment_id: 'test-exp',
        run_id: 'test-run',
        prompt: 'What is the best move?',
        response: 'e4',
        parsing_status: 'success',
        parsed_move: 'e4',
        model_identifier: 'ollama:tinyllama:7b',
        model_config_id: 'cfg-1',
        git_commit: 'test',
        application_version: '1.0.0-test',
        execution_start: Date.now(),
        execution_end: Date.now(),
      });

      // Flush to ensure write
      await this.dataAccess['flush']();

      // Query database
      const decisions = this.db.query<any>(
        'SELECT * FROM llm_decisions WHERE id = ?',
        ['test-decision-persist']
      );

      const passed = decisions.length === 1;

      return {
        name: 'Decision Persistence',
        passed,
        message: passed ? 'Decision persisted to database' : 'Decision not found',
        duration: Date.now() - start,
        details: { decisionCount: decisions.length },
      };
    } catch (error) {
      return {
        name: 'Decision Persistence',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Positions are deduplicated.
   */
  private async testPositionDeduplication(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

      // Record same position twice
      await this.dataAccess.recordPosition(fen);
      await this.dataAccess.recordPosition(fen);

      // Flush
      await this.dataAccess['flush']();

      // Query database
      const positions = this.db.query<any>(
        'SELECT * FROM positions WHERE fen = ?',
        [fen]
      );

      const passed = positions.length === 1 && positions[0].occurrence_count === 2;

      return {
        name: 'Position Deduplication',
        passed,
        message: passed
          ? 'Position deduplicated correctly'
          : 'Position deduplication failed',
        duration: Date.now() - start,
        details: {
          positionCount: positions.length,
          occurrenceCount: positions[0]?.occurrence_count,
        },
      };
    } catch (error) {
      return {
        name: 'Position Deduplication',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Complete game flow (experiment → run → game → move → decision).
   */
  private async testCompleteGameFlow(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const experimentId = await this.integration.startExperiment({
        name: 'complete-flow-test',
        hypothesis: 'Test complete flow',
        git_commit: 'test',
        application_version: '1.0.0-test',
      });

      const runId = await this.integration.startRun(
        {
          run_number: 1,
          config_snapshot: '{}',
          git_commit: 'test',
          application_version: '1.0.0-test',
          execution_start: Date.now(),
        },
        {
          os: 'test',
          osVersion: '1.0',
          nodeVersion: 'v18',
        }
      );

      await this.integration.publishGameResult(
        'flow-test-game',
        1,
        'tinyllama',
        'mistral',
        'cfg-1',
        'cfg-2',
        '1',
        '[Event "Test"]',
        'final-fen',
        10,
        5000
      );

      await this.integration.publishMoveResult(
        'flow-test-move',
        'flow-test-game',
        1,
        'white',
        'e4',
        'start-fen',
        'end-fen',
        100,
        95,
        true,
        'tinyllama',
        'cfg-1'
      );

      await this.integration.publishLLMDecision(
        'flow-test-decision',
        'flow-test-move',
        'flow-test-game',
        'ollama:tinyllama:7b',
        'cfg-1',
        'What is the best move?',
        'e4',
        'success',
        'e4'
      );

      // Flush all buffers
      await this.dataAccess['flush']();

      // Verify all records exist
      const experiment = this.db.query<any>(
        'SELECT * FROM experiments WHERE id = ?',
        [experimentId]
      );
      const run = this.db.query<any>(
        'SELECT * FROM runs WHERE id = ?',
        [runId]
      );
      const game = this.db.query<any>(
        'SELECT * FROM games WHERE id = ?',
        ['flow-test-game']
      );
      const move = this.db.query<any>(
        'SELECT * FROM moves WHERE id = ?',
        ['flow-test-move']
      );
      const decision = this.db.query<any>(
        'SELECT * FROM llm_decisions WHERE id = ?',
        ['flow-test-decision']
      );

      const passed =
        experiment.length === 1 &&
        run.length === 1 &&
        game.length === 1 &&
        move.length === 1 &&
        decision.length === 1;

      return {
        name: 'Complete Game Flow',
        passed,
        message: passed
          ? 'Complete flow successful'
          : 'Flow incomplete or records missing',
        duration: Date.now() - start,
        details: {
          experimentCount: experiment.length,
          runCount: run.length,
          gameCount: game.length,
          moveCount: move.length,
          decisionCount: decision.length,
        },
      };
    } catch (error) {
      return {
        name: 'Complete Game Flow',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Batch writing is transparent (events buffered).
   */
  private async testBatchWriting(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      // Publish 10 games without flushing
      for (let i = 0; i < 10; i++) {
        await this.dataAccess.recordGame({
          id: `batch-test-game-${i}`,
          experiment_id: 'batch-exp',
          run_id: 'batch-run',
          game_number: i + 1,
          white_model: 'tinyllama',
          black_model: 'mistral',
          white_config_id: 'cfg-1',
          black_config_id: 'cfg-2',
          result: i % 3 === 0 ? '1' : i % 3 === 1 ? '0.5' : '0',
          pgn: `[Event "Test ${i}"]`,
          final_fen: 'final-fen',
          move_count: 25,
          duration_ms: 5000,
          environment_snapshot_id: 'env-1',
          git_commit: 'test',
          application_version: '1.0.0-test',
          execution_start: Date.now(),
          execution_end: Date.now(),
        });
      }

      // Manually flush
      await this.dataAccess['flush']();

      // Verify all 10 games persisted
      const games = this.db.query<any>(
        'SELECT COUNT(*) as count FROM games WHERE id LIKE ?',
        ['batch-test-game-%']
      );

      const passed = games[0].count >= 10;

      return {
        name: 'Batch Writing',
        passed,
        message: passed ? 'Batch writing successful' : 'Not all games persisted',
        duration: Date.now() - start,
        details: { gameCount: games[0].count },
      };
    } catch (error) {
      return {
        name: 'Batch Writing',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Database integrity verified.
   */
  private async testDataIntegrity(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const passed = await this.dataAccess.verifyIntegrity();

      return {
        name: 'Data Integrity',
        passed,
        message: passed
          ? 'Database integrity verified'
          : 'Integrity check failed',
        duration: Date.now() - start,
      };
    } catch (error) {
      return {
        name: 'Data Integrity',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Foreign key integrity maintained.
   */
  private async testForeignKeyIntegrity(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      // Try to insert a move with invalid game_id
      const orphanMove = this.db.query<any>(
        `SELECT m.id FROM moves m
         LEFT JOIN games g ON m.game_id = g.id
         WHERE g.id IS NULL LIMIT 1`
      );

      const passed = orphanMove.length === 0;

      return {
        name: 'Foreign Key Integrity',
        passed,
        message: passed ? 'No orphaned moves' : 'Orphaned moves found',
        duration: Date.now() - start,
        details: { orphanCount: orphanMove.length },
      };
    } catch (error) {
      return {
        name: 'Foreign Key Integrity',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: No orphaned records exist.
   */
  private async testNoOrphanedRecords(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const orphanMoves = this.db.query<any>(
        `SELECT COUNT(*) as count FROM moves m
         LEFT JOIN games g ON m.game_id = g.id
         WHERE g.id IS NULL`
      );

      const orphanDecisions = this.db.query<any>(
        `SELECT COUNT(*) as count FROM llm_decisions l
         LEFT JOIN moves m ON l.move_id = m.id
         WHERE m.id IS NULL`
      );

      const passed =
        (orphanMoves[0]?.count || 0) === 0 &&
        (orphanDecisions[0]?.count || 0) === 0;

      return {
        name: 'No Orphaned Records',
        passed,
        message: passed ? 'No orphaned records' : 'Orphaned records found',
        duration: Date.now() - start,
        details: {
          orphanMoves: orphanMoves[0]?.count || 0,
          orphanDecisions: orphanDecisions[0]?.count || 0,
        },
      };
    } catch (error) {
      return {
        name: 'No Orphaned Records',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Batch writing performance acceptable.
   */
  private async testBatchPerformance(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const gameStart = Date.now();

      // Record 100 games
      for (let i = 0; i < 100; i++) {
        await this.dataAccess.recordGame({
          id: `perf-test-game-${i}`,
          experiment_id: 'perf-exp',
          run_id: 'perf-run',
          game_number: i + 1,
          white_model: 'tinyllama',
          black_model: 'mistral',
          white_config_id: 'cfg-1',
          black_config_id: 'cfg-2',
          result: '1',
          pgn: 'pgn',
          final_fen: 'fen',
          move_count: 25,
          duration_ms: 5000,
          environment_snapshot_id: 'env-1',
          git_commit: 'test',
          application_version: '1.0.0-test',
          execution_start: Date.now(),
          execution_end: Date.now(),
        });
      }

      const gameDuration = Date.now() - gameStart;
      const gamesPerSecond = (100 / gameDuration) * 1000;
      const targetGamesPerSecond = 1000; // Should handle at least 1000 games/sec

      const passed = gamesPerSecond >= targetGamesPerSecond;

      return {
        name: 'Batch Performance',
        passed,
        message: passed
          ? `Performance acceptable: ${gamesPerSecond.toFixed(0)} games/sec`
          : `Performance below target: ${gamesPerSecond.toFixed(0)} games/sec (target: ${targetGamesPerSecond})`,
        duration: Date.now() - start,
        details: { gamesPerSecond: gamesPerSecond.toFixed(2) },
      };
    } catch (error) {
      return {
        name: 'Batch Performance',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Test: Database file size reasonable.
   */
  private async testDatabaseSize(): Promise<ValidationResult> {
    const start = Date.now();
    try {
      const stats = this.db.stats();
      const sizeMb = stats.fileSizeBytes / 1024 / 1024;
      const maxSizeMb = 100; // 100MB for test data

      const passed = sizeMb <= maxSizeMb;

      return {
        name: 'Database Size',
        passed,
        message: passed
          ? `Database size reasonable: ${sizeMb.toFixed(2)}MB`
          : `Database too large: ${sizeMb.toFixed(2)}MB (max: ${maxSizeMb}MB)`,
        duration: Date.now() - start,
        details: {
          sizeBytes: stats.fileSizeBytes,
          sizeMb: sizeMb.toFixed(2),
          pageCount: stats.pageCount,
          pageSize: stats.pageSize,
        },
      };
    } catch (error) {
      return {
        name: 'Database Size',
        passed: false,
        message: `Error: ${error}`,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Generate test report.
   */
  async generateReport(): Promise<string> {
    const results = await this.runAllTests();
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    let report = `# Research Data Store Validation Report\n\n`;
    report += `**Summary:** ${passed}/${results.length} tests passed (${failed} failed)\n`;
    report += `**Total Duration:** ${totalDuration}ms\n\n`;

    report += `## Test Results\n\n`;
    for (const result of results) {
      const status = result.passed ? '✅' : '❌';
      report += `### ${status} ${result.name}\n`;
      report += `- Status: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
      report += `- Message: ${result.message}\n`;
      report += `- Duration: ${result.duration}ms\n`;
      if (result.details) {
        report += `- Details: ${JSON.stringify(result.details)}\n`;
      }
      report += '\n';
    }

    return report;
  }
}
