/**
 * Chess Engine Controller — Manages Stockfish engine via UCI protocol.
 *
 * Handles:
 * - Engine process lifecycle (start, shutdown)
 * - UCI protocol communication
 * - Move evaluation and best move retrieval
 * - Timeout handling and recovery
 */

import { spawn, type ChildProcess } from 'child_process';
import type { ChessEvaluation } from './chess-types.js';

export interface EngineConfig {
  readonly enginePath: string;
  readonly timeout: number; // milliseconds
  readonly threads: number;
  readonly hash: number; // megabytes
}

export class ChessEngine {
  private process: ChildProcess | null = null;
  private ready = false;
  private config: EngineConfig;
  private buffer = '';

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = {
      enginePath: config.enginePath || 'stockfish',
      timeout: config.timeout || 30000,
      threads: config.threads || 1,
      hash: config.hash || 256,
    };
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.enginePath, []);

        let uciReceived = false;
        const readyHandler = (data: Buffer) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'uciok') {
              uciReceived = true;
            }
            if (trimmed === 'readyok' && uciReceived) {
              this.ready = true;
              this.process?.stdout?.removeListener('data', readyHandler);
              resolve();
            }
          }
        };

        this.process.stdout?.on('data', readyHandler);
        this.process.stderr?.on('data', (data) => {
          console.error(`Engine error: ${data}`);
        });

        this.sendCommand('uci');
        this.sendCommand('isready');

        // Timeout if engine doesn't respond
        setTimeout(() => {
          if (!this.ready) {
            reject(new Error('Engine initialization timeout'));
          }
        }, this.config.timeout);
      } catch (error) {
        reject(new Error(`Failed to spawn engine: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      this.sendCommand('quit');
      this.process.kill();
      this.process = null;
      this.ready = false;
    }
  }

  async getBestMove(fen: string, timeMs: number = 1000): Promise<string> {
    if (!this.ready || !this.process) {
      throw new Error('Engine not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Best move timeout'));
      }, timeMs + 1000);

      const handler = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('bestmove ')) {
            clearTimeout(timeout);
            this.process?.stdout?.removeListener('data', handler);
            const move = trimmed.split(' ')[1];
            resolve(move);
            return;
          }
        }
      };

      this.process.stdout?.on('data', handler);

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go wtime 5000 btime 5000 movetime ${timeMs}`);
    });
  }

  async getEvaluation(fen: string, depth: number = 15): Promise<ChessEvaluation> {
    if (!this.ready || !this.process) {
      throw new Error('Engine not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Evaluation timeout'));
      }, this.config.timeout);

      let bestEval = { score: 0, depth: 0, confidence: 0 };

      const handler = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('info ')) {
            const depthMatch = trimmed.match(/depth (\d+)/);
            const scoreMatch = trimmed.match(/score (cp|mate) (-?\d+)/);

            if (depthMatch && scoreMatch) {
              const currentDepth = parseInt(depthMatch[1], 10);
              const scoreType = scoreMatch[1];
              const scoreValue = parseInt(scoreMatch[2], 10);

              if (currentDepth >= bestEval.depth) {
                if (scoreType === 'cp') {
                  bestEval.score = scoreValue;
                } else if (scoreType === 'mate') {
                  bestEval.score = scoreValue > 0 ? 10000 + scoreValue : -10000 + scoreValue;
                }
                bestEval.depth = currentDepth;
                bestEval.confidence = Math.min(1, currentDepth / depth);
              }
            }
          }

          if (trimmed.startsWith('bestmove ')) {
            clearTimeout(timeout);
            this.process?.stdout?.removeListener('data', handler);
            resolve({
              score: bestEval.score,
              depth: bestEval.depth,
              confidence: bestEval.confidence,
              timestamp: Date.now(),
            });
            return;
          }
        }
      };

      this.process.stdout?.on('data', handler);

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }

  async isReady(): Promise<boolean> {
    if (!this.ready || !this.process) {
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const handler = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim() === 'readyok') {
            clearTimeout(timeout);
            this.process?.stdout?.removeListener('data', handler);
            resolve(true);
            return;
          }
        }
      };

      this.process.stdout?.on('data', handler);
      this.sendCommand('isready');
    });
  }

  private sendCommand(command: string): void {
    if (!this.process || !this.process.stdin) {
      throw new Error('Engine process not available');
    }
    this.process.stdin.write(`${command}\n`);
  }

  isInitialized(): boolean {
    return this.ready && this.process !== null;
  }
}
