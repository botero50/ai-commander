/**
 * STORY V2.2: Measure Everything - Test Suite
 *
 * Validates comprehensive metrics capture from one real chess game
 */

import { describe, it, expect } from 'vitest';
import { playOneGameWithMeasurements, type MeasurementMetrics } from './play-one-game-v2.2.js';

describe('STORY V2.2: Measure Everything', () => {
  it('should capture all metrics from one complete game', async () => {
    const metrics = await playOneGameWithMeasurements();

    // Verify all metrics exist
    expect(metrics).toHaveProperty('startupTimeMs');
    expect(metrics).toHaveProperty('firstMoveTimeMs');
    expect(metrics).toHaveProperty('avgMoveLatencyMs');
    expect(metrics).toHaveProperty('moveLatencies');
    expect(metrics).toHaveProperty('totalGameDurationMs');
    expect(metrics).toHaveProperty('totalMoves');
    expect(metrics).toHaveProperty('winner');
    expect(metrics).toHaveProperty('moveHistory');
    expect(metrics).toHaveProperty('pgn');
    expect(metrics).toHaveProperty('memoryBefore');
    expect(metrics).toHaveProperty('memoryAfter');
    expect(metrics).toHaveProperty('cpuUserMs');
    expect(metrics).toHaveProperty('cpuSystemMs');
    expect(metrics).toHaveProperty('thinkingTimeline');

    // Verify timing metrics
    expect(metrics.startupTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics.firstMoveTimeMs).toBeGreaterThan(0);
    expect(metrics.avgMoveLatencyMs).toBeGreaterThan(0);
    expect(metrics.totalGameDurationMs).toBeGreaterThan(0);

    // Verify game metrics
    expect(metrics.totalMoves).toBeGreaterThan(0);
    expect(metrics.totalMoves).toBeLessThanOrEqual(100); // maxMoves limit
    expect(['white-win', 'black-win', 'draw']).toContain(metrics.winner);

    // Verify move history
    expect(metrics.moveHistory.length).toBe(metrics.totalMoves);
    expect(metrics.moveLatencies.length).toBe(metrics.totalMoves);

    // Verify memory metrics
    expect(metrics.memoryBefore.heapUsedMb).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryAfter.heapUsedMb).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryPeakMb).toBeGreaterThanOrEqual(
      Math.max(metrics.memoryBefore.heapUsedMb, metrics.memoryAfter.heapUsedMb)
    );

    // Verify CPU metrics
    expect(metrics.cpuUserMs).toBeGreaterThanOrEqual(0);
    expect(metrics.cpuSystemMs).toBeGreaterThanOrEqual(0);

    // Verify PGN
    expect(metrics.pgn.length).toBeGreaterThan(0);
    expect(metrics.pgn).toContain('[');
    expect(metrics.pgn).toContain(']');

    // Verify thinking timeline
    expect(metrics.thinkingTimeline.length).toBe(metrics.totalMoves);
    for (const thinking of metrics.thinkingTimeline) {
      expect(thinking).toHaveProperty('turn');
      expect(thinking).toHaveProperty('color');
      expect(thinking).toHaveProperty('move');
      expect(thinking).toHaveProperty('explanation');
      expect(thinking).toHaveProperty('confidence');
      expect(thinking).toHaveProperty('latencyMs');
      expect(['white', 'black']).toContain(thinking.color);
      expect(thinking.confidence).toBeGreaterThan(0);
      expect(thinking.confidence).toBeLessThanOrEqual(1);
    }

    // Verify reasonableness of metrics
    expect(metrics.avgMoveLatencyMs).toBeLessThan(metrics.totalGameDurationMs);
    expect(metrics.firstMoveTimeMs).toBeLessThan(metrics.totalGameDurationMs);

    console.log(`
✅ STORY V2.2 COMPLETE: All metrics captured and validated
   - Timing: startup=${metrics.startupTimeMs}ms, first_move=${metrics.firstMoveTimeMs}ms, avg=${metrics.avgMoveLatencyMs}ms
   - Game: ${metrics.totalMoves} moves in ${metrics.totalGameDurationMs}ms, result=${metrics.winner}
   - Memory: before=${metrics.memoryBefore.heapUsedMb}MB, after=${metrics.memoryAfter.heapUsedMb}MB, peak=${metrics.memoryPeakMb}MB
   - CPU: user=${metrics.cpuUserMs}ms, system=${metrics.cpuSystemMs}ms
   - PGN: ${metrics.pgn.length} chars, ${metrics.moveHistory.length} moves recorded
   - Thinking: ${metrics.thinkingTimeline.length} decisions tracked
    `);
  }, { timeout: 20000 }); // 20 second timeout
});
