/**
 * STORY V2.3: Record the Game - Test Suite
 *
 * Validates game record generation and serialization
 */

import { describe, it, expect } from 'vitest';
import { playOneGameWithRecord, type GameRecord } from './play-one-game-v2.3.js';

describe('STORY V2.3: Record the Game', () => {
  it('should generate a complete game record', async () => {
    const record = await playOneGameWithRecord();

    // Verify record structure
    expect(record).toHaveProperty('gameId');
    expect(record).toHaveProperty('timestamp');
    expect(record).toHaveProperty('players');
    expect(record).toHaveProperty('result');
    expect(record).toHaveProperty('pgnHeader');
    expect(record).toHaveProperty('pgn');
    expect(record).toHaveProperty('moves');
    expect(record).toHaveProperty('moveList');
    expect(record).toHaveProperty('thinking');
    expect(record).toHaveProperty('openingMoves');
    expect(record).toHaveProperty('endgameMoves');

    // Verify metadata
    expect(record.gameId).toMatch(/^game-\d+-.+$/);
    expect(record.timestamp).toBeGreaterThan(0);
    expect(record.players.white).toBe('Ollama');
    expect(record.players.black).toBe('Ollama');

    // Verify result
    expect(['white', 'black', 'draw']).toContain(record.result.winner);
    expect(record.result.reason).not.toBe('');
    expect(record.result.moves).toBeGreaterThan(0);
    expect(record.result.duration).toBeGreaterThan(0);

    // Verify PGN
    expect(record.pgn.length).toBeGreaterThan(0);
    expect(record.pgn).toContain('[Event');
    expect(record.pgn).toContain('[White');
    expect(record.pgn).toContain('[Black');
    expect(record.pgn).toContain('[Result');
    expect(record.pgn).toContain(record.result.winner === 'white' ? '1-0' :
                                 record.result.winner === 'black' ? '0-1' : '1/2-1/2');

    // Verify moves
    expect(record.moves.length).toBe(record.result.moves);
    expect(record.moveList.length).toBe(record.result.moves);

    for (const move of record.moves) {
      expect(move).toHaveProperty('number');
      expect(move).toHaveProperty('turn');
      expect(['white', 'black']).toContain(move.turn);
      expect(move).toHaveProperty('move');
      expect(move).toHaveProperty('fen');
      expect(move).toHaveProperty('timestamp');
      expect(move).toHaveProperty('latencyMs');
      expect(move).toHaveProperty('confidence');
    }

    // Verify thinking timeline
    expect(record.thinking.length).toBe(record.result.moves);
    for (const thought of record.thinking) {
      expect(thought).toHaveProperty('moveNumber');
      expect(thought).toHaveProperty('player');
      expect(['white', 'black']).toContain(thought.player);
      expect(thought).toHaveProperty('decision');
      expect(thought).toHaveProperty('confidence');
      expect(thought.confidence).toBeGreaterThan(0);
      expect(thought.confidence).toBeLessThanOrEqual(1);
      expect(thought).toHaveProperty('latencyMs');
      expect(thought.latencyMs).toBeGreaterThan(0);
    }

    // Verify opening and endgame
    expect(record.openingMoves.length).toBeGreaterThan(0);
    expect(record.endgameMoves.length).toBeGreaterThan(0);

    // Verify serialization
    const json = JSON.stringify(record);
    expect(json.length).toBeGreaterThan(0);
    const parsed = JSON.parse(json) as GameRecord;
    expect(parsed.gameId).toBe(record.gameId);
    expect(parsed.result.moves).toBe(record.result.moves);

    console.log(`
✅ STORY V2.3 COMPLETE: Game record generated and validated
   - Game ID: ${record.gameId}
   - Result: ${record.result.winner} by ${record.result.reason}
   - Moves: ${record.result.moves} in ${record.result.duration}ms
   - PGN: ${record.pgn.length} chars
   - Thinking: ${record.thinking.length} decisions recorded
   - Serializable: ${json.length} bytes as JSON
    `);
  }, { timeout: 20000 }); // 20 second timeout
});
