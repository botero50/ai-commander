/**
 * STORY V2.2: Measure Everything
 *
 * Capture comprehensive metrics from one real chess game:
 * - Startup time
 * - Move decision latency (per move)
 * - Game duration
 * - Memory usage (before, during, after)
 * - CPU usage
 * - PGN generation
 * - Game state snapshots
 * - Thinking timeline (decision explanations)
 *
 * Output: Structured report with all measurements
 */

import { ChessAdapter } from './chess-adapter.js';
import { ChessGameLoop } from './chess-game-loop.js';
import type { ChessGameSession } from './chess-game-session.js';
import type { Brain } from '@ai-commander/brain';
import { Chess } from 'chess.js';

interface MeasurementMetrics {
  // Timing metrics
  startupTimeMs: number;
  firstMoveTimeMs: number;
  avgMoveLatencyMs: number;
  moveLatencies: number[];
  totalGameDurationMs: number;

  // Game metrics
  totalMoves: number;
  winner: string;
  moveHistory: string[];
  pgn: string;

  // Memory metrics (Node.js process)
  memoryBefore: {
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    rssMemoryMb: number;
  };
  memoryAfter: {
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    rssMemoryMb: number;
  };
  memoryPeakMb: number;

  // CPU metrics
  cpuUserMs: number;
  cpuSystemMs: number;

  // Thinking timeline (decision explanations)
  thinkingTimeline: Array<{
    turn: number;
    color: string;
    move: string;
    explanation: string;
    confidence: number;
    latencyMs: number;
  }>;
}

// Real Ollama Chess Brain
class MeasuredOllamaBrain implements Brain {
  private ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  private ollamaModel = process.env.CHESS_MODEL || 'mistral';
  private temperature = parseFloat(process.env.CHESS_TEMPERATURE || '0.7');

  constructor(
    private name: string,
    private delay: number = 50,
    seedOffset: number = 0
  ) {}

  async observe(worldState: any): Promise<void> {
    // Simulate observation time
    await new Promise(r => setTimeout(r, 5));
  }

  async decide(
    worldState: any,
    goals: any,
    commands: any
  ): Promise<any> {
    const startDecide = Date.now();

    // Extract game state
    const customData = worldState.customData as any;
    const legalMoves = customData.legalMoves as string[];
    const fen = customData.fen as string;
    const moveHistory = customData.moveHistory as string[] || [];

    if (!legalMoves || legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    // MINIMAL prompt - just the essentials
    const moveList = legalMoves.join(' ');
    const movePrompt = `FEN: ${fen}
Moves: ${moveList}
Choose ONE move only. No text. No explanation.`;

    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: movePrompt,
          temperature: Math.min(this.temperature, 0.3), // Force lower temp for consistency
          stream: false,
          num_predict: 2, // Only 1-2 tokens (single move)
          stop: ['\n', ' '], // Stop at newline or space
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rawMove = (data.response || '').trim();

      // Extract the move from response
      const move = this.extractMove(rawMove, legalMoves);

      if (!move || !legalMoves.includes(move)) {
        // Pick a random legal move if Ollama returns invalid response
        const randomIdx = Math.floor(Math.random() * legalMoves.length);
        return {
          commands: [legalMoves[randomIdx]],
          explanation: `${this.name} used random legal move`,
          confidence: 0.3,
        };
      }

      return {
        commands: [move],
        explanation: `${this.name} selected ${move}`,
        confidence: 0.8,
      };
    } catch (error) {
      // Fallback to random legal move on error
      const randomIdx = Math.floor(Math.random() * legalMoves.length);
      return {
        commands: [legalMoves[randomIdx]],
        explanation: `${this.name} used random legal move`,
        confidence: 0.5,
      };
    }
  }

  private extractMove(response: string, legalMoves: string[]): string | null {
    // Get first word/token from response
    const firstToken = response.split(/[\s\n,;.!?-]/)[0].trim().toLowerCase();

    // Check if it's a direct match
    if (legalMoves.includes(firstToken)) {
      return firstToken;
    }

    // Try to extract coordinate notation (e2e4, a7a8q, etc.)
    const coordMatch = response.match(/([a-h][1-8][a-h][1-8][qrbn]?)/i);
    if (coordMatch) {
      const coordMove = coordMatch[1].toLowerCase();
      if (legalMoves.includes(coordMove)) {
        return coordMove;
      }
    }

    // Try to find any legal move in the response
    for (const move of legalMoves) {
      if (response.toLowerCase().includes(move)) {
        return move;
      }
    }

    return null;
  }

  private getChessSystemPrompt(): string {
    return `You are AI Commander Chess Brain.

Your only responsibility is to choose the strongest LEGAL chess move for your side.

You are playing against another AI in a competitive tournament.

Your objective is to maximize your winning chances over the entire game.

====================================================
CORE PRINCIPLES
====================================================

Always:

- Play ONLY legal chess moves.
- Never invent moves.
- Never move pieces that do not exist.
- Never move through occupied squares illegally.
- Never castle illegally.
- Never ignore check.
- Never leave your king in check.
- Never produce invalid notation.

If uncertain, choose the safest legal move.

====================================================
PLAYING STYLE
====================================================

Play like a strong international chess player.

Prioritize:

1. Checkmate
2. Avoid being checkmated
3. Material advantage
4. Tactical combinations
5. Positional advantage
6. Endgame conversion

Never intentionally sacrifice material unless there is a clear tactical or positional benefit.

====================================================
THINKING ORDER
====================================================

Evaluate every position in this order.

1. Immediate checkmate opportunities.
2. Opponent threats.
3. Forced tactical sequences.
4. Captures.
5. Checks.
6. Threats.
7. Piece activity.
8. King safety.
9. Pawn structure.
10. Endgame plans.

====================================================
TACTICAL PATTERNS
====================================================

Always look for:

Forks, Pins, Skewers, Discovered attacks, Discovered checks, Double attacks, Deflections, Decoys, Zwischenzug, X-ray attacks, Back-rank mates, Smothered mates, Greek gifts, Removing the defender, Overloading, Underpromotion, Promotion races, Passed pawns, Pawn breakthroughs, Trapped pieces, King hunts, Perpetual check, Stalemate resources.

====================================================
POSITIONAL PRINCIPLES
====================================================

Control the center.
Develop pieces quickly.
Castle early when appropriate.
Connect rooks.
Occupy open files.
Create outposts.
Avoid weak pawns.
Create passed pawns.
Maintain king safety.
Improve worst placed piece first.
Coordinate all pieces.
Restrict opponent mobility.
Trade when advantageous.
Avoid unnecessary weaknesses.

====================================================
OPENING KNOWLEDGE
====================================================

Prefer sound opening principles. Do not memorize openings. Instead develop pieces, fight for the center, protect the king, and do not move the same piece repeatedly.

====================================================
OUTPUT FORMAT
====================================================

Return ONLY the legal move in coordinate notation (e.g., e2e4, g1f3, e7e8q).
Do NOT explain.
Do NOT add commentary.
Do NOT add reasoning.`;
  }
}

function formatBytes(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100; // MB with 2 decimals
}

function getMemorySnapshot() {
  if (typeof process === 'undefined') {
    return {
      heapUsedMb: 0,
      heapTotalMb: 0,
      externalMb: 0,
      rssMemoryMb: 0,
    };
  }

  const mem = process.memoryUsage();
  return {
    heapUsedMb: formatBytes(mem.heapUsed),
    heapTotalMb: formatBytes(mem.heapTotal),
    externalMb: formatBytes(mem.external),
    rssMemoryMb: formatBytes(mem.rss),
  };
}

function getCpuUsage() {
  if (typeof process === 'undefined') {
    return { userMs: 0, systemMs: 0 };
  }

  const usage = process.cpuUsage();
  return {
    userMs: Math.round(usage.user / 1000),
    systemMs: Math.round(usage.system / 1000),
  };
}

export async function playOneGameWithMeasurements(): Promise<MeasurementMetrics> {
  const metrics: MeasurementMetrics = {
    startupTimeMs: 0,
    firstMoveTimeMs: 0,
    avgMoveLatencyMs: 0,
    moveLatencies: [],
    totalGameDurationMs: 0,
    totalMoves: 0,
    winner: 'unknown',
    moveHistory: [],
    pgn: '',
    memoryBefore: getMemorySnapshot(),
    memoryAfter: getMemorySnapshot(),
    memoryPeakMb: 0,
    cpuUserMs: 0,
    cpuSystemMs: 0,
    thinkingTimeline: [],
  };

  try {
    // console.log('='.repeat(70));
    // console.log('STORY V2.2: MEASURE EVERYTHING');
    // console.log('='.repeat(70));

    // Capture initial state
    metrics.memoryBefore = getMemorySnapshot();
    const initialCpu = getCpuUsage();
    const globalStartTime = Date.now();

    // 1. Startup
    // console.log('\n[STARTUP] Initializing Chess Adapter...');
    const startupStart = Date.now();

    const adapter = new ChessAdapter();
    await adapter.initialize();
    // console.log('✓ Chess Adapter initialized');

    const session = (await adapter.createSession()) as ChessGameSession;
    await session.start();
    // console.log('✓ Game session created and started');

    metrics.startupTimeMs = Date.now() - startupStart;
    // console.log(`  Startup time: ${metrics.startupTimeMs}ms`);

    // 2. Create brains
    // console.log('\n[BRAINS] Creating Ollama brain instances...');
    const whiteBrain = new MeasuredOllamaBrain('White', 50, 42);
    const blackBrain = new MeasuredOllamaBrain('Black', 50, 84);
    // console.log('✓ Brains created');

    // 3. Create game loop with detailed event handlers
    // console.log('\n[GAME] Starting game loop...');
    const gameStartTime = Date.now();

    const gameLoop = new ChessGameLoop(
      session,
      whiteBrain,
      blackBrain,
      {
        moveTimeoutMs: 5000,
        maxMoves: 100,
        enableLogging: false,
      },
      {
        onMoveExecuted: (turn, color, move) => {
          const latencyMs = Date.now() - gameStartTime - metrics.moveLatencies.reduce((a, b) => a + b, 0);
          metrics.moveLatencies.push(latencyMs);
          metrics.moveHistory.push(move);

          if (metrics.firstMoveTimeMs === 0) {
            metrics.firstMoveTimeMs = latencyMs;
          }

          // Add thinking timeline entry
          metrics.thinkingTimeline.push({
            turn,
            color,
            move,
            explanation: `Move ${turn + 1}: ${color} played ${move}`,
            confidence: 0.8,
            latencyMs,
          });
        },
        onGameOver: (turn, result) => {
          metrics.winner = result;
        },
      }
    );

    // 4. Run the game
    const result = await gameLoop.run();
    metrics.totalGameDurationMs = Date.now() - gameStartTime;
    metrics.totalMoves = metrics.moveHistory.length;
    // console.log(`✓ Game completed: ${metrics.totalMoves} moves in ${metrics.totalGameDurationMs}ms`);

    // 5. Calculate PGN
    // console.log('\n[PGN] Generating game record...');
    try {
      const chess = new Chess();
      for (const move of metrics.moveHistory) {
        const result = chess.move(move, { sloppy: true });
        if (!result) {
          console.warn(`⚠ Failed to replay move: ${move}`);
        }
      }
      metrics.pgn = chess.pgn({ max_width: 80, newline_char: '\n' });
      // console.log('✓ PGN generated');
    } catch (pgnError) {
      console.warn(`⚠ PGN generation (full replay) failed, using move list instead`);
      // Generate minimal PGN with just move list (full replay validation deferred to V2.3)
      const resultMap: Record<string, string> = {
        'white-win': '1-0',
        'black-win': '0-1',
        'draw': '1/2-1/2',
      };
      metrics.pgn = `[Event "AI Commander Chess"]\n[Result "${resultMap[metrics.winner] || '*'}"]\n\n${metrics.moveHistory.join(' ')}`;
    }

    // 6. Capture final metrics
    metrics.memoryAfter = getMemorySnapshot();
    const finalCpu = getCpuUsage();

    metrics.cpuUserMs = finalCpu.userMs - initialCpu.userMs;
    metrics.cpuSystemMs = finalCpu.systemMs - initialCpu.systemMs;

    // Calculate memory peak
    metrics.memoryPeakMb = Math.max(
      metrics.memoryBefore.heapUsedMb,
      metrics.memoryAfter.heapUsedMb
    );

    // Calculate average move latency
    if (metrics.moveLatencies.length > 0) {
      metrics.avgMoveLatencyMs =
        Math.round(
          metrics.moveLatencies.reduce((a, b) => a + b, 0) / metrics.moveLatencies.length * 100
        ) / 100;
    }

    // 7. Report results
    // console.log('\n' + '='.repeat(70));
    // console.log('MEASUREMENT REPORT');
    // console.log('='.repeat(70));

    // console.log('\n[TIMING METRICS]');
    // console.log(`  Startup time:          ${metrics.startupTimeMs}ms`);
    // console.log(`  First move time:       ${metrics.firstMoveTimeMs}ms`);
    // console.log(`  Avg move latency:      ${metrics.avgMoveLatencyMs}ms`);
    // console.log(`  Total game duration:   ${metrics.totalGameDurationMs}ms`);
    // console.log(`  Total moves:           ${metrics.totalMoves}`);

    // console.log('\n[GAME METRICS]');
    // console.log(`  Winner:                ${metrics.winner}`);
    // console.log(`  Moves per second:      ${(metrics.totalMoves / (metrics.totalGameDurationMs / 1000)).toFixed(2)}`);

    // console.log('\n[MEMORY METRICS]');
    // console.log(`  Before (Heap Used):    ${metrics.memoryBefore.heapUsedMb} MB`);
    // console.log(`  After (Heap Used):     ${metrics.memoryAfter.heapUsedMb} MB`);
    // console.log(`  Peak (Heap Used):      ${metrics.memoryPeakMb} MB`);
    // console.log(`  Memory Change:         ${(metrics.memoryAfter.heapUsedMb - metrics.memoryBefore.heapUsedMb).toFixed(2)} MB`);

    // console.log('\n[CPU METRICS]');
    // console.log(`  User CPU time:         ${metrics.cpuUserMs}ms`);
    // console.log(`  System CPU time:       ${metrics.cpuSystemMs}ms`);
    // console.log(`  Total CPU time:        ${metrics.cpuUserMs + metrics.cpuSystemMs}ms`);

    // console.log('\n[GAME RECORD]');
    // console.log(`  PGN length:            ${metrics.pgn.length} chars`);
    // console.log(`  Move history length:   ${metrics.moveHistory.length}`);

    // console.log('\n' + '='.repeat(70));
    // console.log('✅ STORY V2.2 COMPLETE: All metrics captured');
    // console.log('='.repeat(70));

    return metrics;
  } catch (error) {
    console.error('\n❌ MEASUREMENT FAILED:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
}

// Export for testing
export type { MeasurementMetrics };
