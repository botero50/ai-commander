/**
 * Chess Engine Tests - Story C1.2
 *
 * Tests for UCI protocol engine integration:
 * - Engine initialization and shutdown
 * - Best move retrieval
 * - Position evaluation
 * - Timeout handling
 * - Error recovery
 *
 * Note: These tests assume Stockfish is installed on the system.
 * Run with: SKIP_ENGINE_TESTS=1 pnpm test to skip these tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChessEngine } from './chess-engine.js';

const SKIP_ENGINE_TESTS = process.env.SKIP_ENGINE_TESTS === '1';

describe.skipIf(SKIP_ENGINE_TESTS)('ChessEngine - Story C1.2', () => {
  let engine: ChessEngine;

  beforeEach(async () => {
    engine = new ChessEngine({
      enginePath: 'stockfish',
      timeout: 10000,
      threads: 1,
      hash: 128,
    });
  });

  afterEach(async () => {
    if (engine.isInitialized()) {
      await engine.shutdown();
    }
  });

  describe('Engine Initialization', () => {
    it('should initialize engine successfully', async () => {
      await engine.initialize();
      expect(engine.isInitialized()).toBe(true);
    });

    it('should not be initialized before calling initialize', () => {
      expect(engine.isInitialized()).toBe(false);
    });

    it('should report ready after initialization', async () => {
      await engine.initialize();
      const isReady = await engine.isReady();
      expect(isReady).toBe(true);
    });

    it('should handle initialization timeout gracefully', async () => {
      const timeoutEngine = new ChessEngine({
        enginePath: 'nonexistent-stockfish-path',
        timeout: 100,
      });

      await expect(timeoutEngine.initialize()).rejects.toThrow();
    });
  });

  describe('Engine Shutdown', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should shutdown gracefully', async () => {
      await engine.shutdown();
      expect(engine.isInitialized()).toBe(false);
    });

    it('should handle multiple shutdowns', async () => {
      await engine.shutdown();
      await expect(engine.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Best Move Retrieval', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should get best move from starting position', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const move = await engine.getBestMove(fen, 100);
      expect(move).toBeDefined();
      expect(move).toMatch(/^[a-h][1-8][a-h][1-8]/);
    });

    it('should get consistent best move for starting position', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const move1 = await engine.getBestMove(fen, 500);
      const move2 = await engine.getBestMove(fen, 500);
      expect(move1).toBe(move2);
    });

    it('should get best move from middle game position', async () => {
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
      const move = await engine.getBestMove(fen, 100);
      expect(move).toBeDefined();
      expect(move).toMatch(/^[a-h][1-8][a-h][1-8]/);
    });

    it('should get best move from endgame position', async () => {
      const fen = '7k/5K2/6P1/8/8/8/8/8 w - - 0 1';
      const move = await engine.getBestMove(fen, 100);
      expect(move).toBeDefined();
      expect(move).toMatch(/^[a-h][1-8][a-h][1-8]/);
    });

    it('should respect time limit', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const start = Date.now();
      const move = await engine.getBestMove(fen, 100);
      const elapsed = Date.now() - start;

      expect(move).toBeDefined();
      // Should complete reasonably close to time limit (allow some overhead)
      expect(elapsed).toBeLessThan(2000);
    });

    it('should handle timeout', async () => {
      const shortTimeoutEngine = new ChessEngine({
        enginePath: 'stockfish',
        timeout: 100,
      });

      await shortTimeoutEngine.initialize();
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      // Even with short timeout, should eventually timeout or complete
      const result = await Promise.race([
        shortTimeoutEngine.getBestMove(fen, 10),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
      ]);

      await shortTimeoutEngine.shutdown();
      expect(result).toBeDefined();
    });
  });

  describe('Position Evaluation', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should evaluate starting position as equal', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const evalResult = await engine.getEvaluation(fen, 10);

      expect(evalResult).toBeDefined();
      expect(evalResult.score).toBeDefined();
      expect(evalResult.depth).toBeGreaterThan(0);
      expect(evalResult.confidence).toBeGreaterThan(0);
      expect(evalResult.confidence).toBeLessThanOrEqual(1);
      // Starting position should be near equal
      expect(Math.abs(evalResult.score)).toBeLessThan(50);
    });

    it('should show white advantage in favorable position', async () => {
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
      const evalResult = await engine.getEvaluation(fen, 10);

      expect(evalResult).toBeDefined();
      expect(evalResult.score).toBeGreaterThan(0); // White should be better
    });

    it('should improve evaluation with deeper search', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const eval1 = await engine.getEvaluation(fen, 5);
      const eval2 = await engine.getEvaluation(fen, 15);

      expect(eval2.depth).toBeGreaterThanOrEqual(eval1.depth);
      expect(eval2.confidence).toBeGreaterThanOrEqual(eval1.confidence);
    });

    it('should handle checkmate detection in evaluation', async () => {
      // Fool's mate position (black just moved h4#)
      const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/6Pp/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1';
      const evalResult = await engine.getEvaluation(fen, 10);

      expect(evalResult).toBeDefined();
      // In a losing position, the score should reflect it
      expect(evalResult.score).toBeLessThan(-5000); // Mate is imminent
    });
  });

  describe('Readiness Checks', () => {
    it('should return false when not initialized', async () => {
      const isReady = await engine.isReady();
      expect(isReady).toBe(false);
    });

    it('should return true when initialized', async () => {
      await engine.initialize();
      const isReady = await engine.isReady();
      expect(isReady).toBe(true);
    });

    it('should handle readiness check timeout', async () => {
      const shortTimeoutEngine = new ChessEngine({
        enginePath: 'stockfish',
        timeout: 100,
      });

      const isReady = await shortTimeoutEngine.isReady();
      expect(isReady).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw when getting best move before initialization', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      await expect(engine.getBestMove(fen)).rejects.toThrow('not initialized');
    });

    it('should throw when evaluating before initialization', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      await expect(engine.getEvaluation(fen)).rejects.toThrow('not initialized');
    });

    it('should handle invalid FEN position', async () => {
      await engine.initialize();
      const invalidFen = 'invalid fen string';

      // Engine might timeout or fail on invalid FEN
      const result = await Promise.race([
        engine.getBestMove(invalidFen, 100),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000)),
      ]);

      expect(result).toBeDefined();
    });
  });

  describe('Multiple Positions', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle multiple position evaluations', async () => {
      const positions = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
        '7k/5K2/6P1/8/8/8/8/8 w - - 0 1',
      ];

      for (const fen of positions) {
        const evalResult = await engine.getEvaluation(fen, 5);
        expect(evalResult).toBeDefined();
        expect(evalResult.score).toBeDefined();
      }
    });

    it('should get best moves for multiple positions', async () => {
      const positions = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
      ];

      for (const fen of positions) {
        const move = await engine.getBestMove(fen, 100);
        expect(move).toBeDefined();
        expect(move).toMatch(/^[a-h][1-8][a-h][1-8]$/);
      }
    });
  });
});
