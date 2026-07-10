/**
 * Story 47.2 — Match Metadata
 *
 * Create comprehensive metadata describing every aspect of a match:
 * - Game environment (0 A.D. version, adapter version)
 * - AI models used (names, versions, configurations)
 * - Game configuration (map, difficulty, settings)
 * - Prompts used for decision-making
 * - Performance metrics (latency, throughput)
 * - Command statistics
 */

export interface AIModelMetadata {
  id: string;
  name: string;
  version: string;
  type: 'ollama' | 'openai' | 'claude' | 'gemini' | 'petra';
  parameters: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    contextWindow?: number;
  };
  systemPrompt?: string;
  promptHash?: string; // SHA256 of prompt for version tracking
}

export interface GameConfigMetadata {
  map: string;
  mapVersion?: string;
  gameVersion: string;
  adapterVersion: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'veryhard';
  speed: 'slow' | 'normal' | 'fast' | 'veryfast';
  gameType: 'skirmish' | 'campaign' | 'multiplayer';
}

export interface PlayerMetadata {
  id: number;
  civilization: string;
  ai: AIModelMetadata;
  startingResources?: {
    food: number;
    wood: number;
    stone: number;
    metal: number;
  };
}

export interface PerformanceMetadata {
  rlInterfaceLatency: {
    min: number; // milliseconds
    max: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  gameTickLatency: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  decisionLatency: {
    min: number;
    max: number;
    average: number;
  };
  commandThroughput: {
    commandsPerSecond: number;
    commandsPerTick: number;
    peakCommandsPerTick: number;
  };
}

export interface MatchMetadata {
  matchId: string;
  timestamp: string;
  duration: {
    realTimeMs: number;
    realTimeSeconds: number;
    gameTicksCompleted: number;
  };
  game: GameConfigMetadata;
  players: PlayerMetadata[];
  performance: PerformanceMetadata;
  commandStats: {
    total: number;
    byPlayer: Record<number, number>;
    invalid: number;
    failed: number;
    successRate: number;
  };
  winner?: {
    playerId: number;
    reason: 'elimination' | 'tick_limit' | 'surrender';
  };
  environment: {
    os: string;
    node: string;
    cpuCores: number;
    memoryMb: number;
  };
}

export class MatchMetadataBuilder {
  private metadata: Partial<MatchMetadata> = {};

  matchId(id: string): this {
    this.metadata.matchId = id;
    return this;
  }

  timestamp(ts: string): this {
    this.metadata.timestamp = ts;
    return this;
  }

  duration(realTimeMs: number, gameTicksCompleted: number): this {
    this.metadata.duration = {
      realTimeMs,
      realTimeSeconds: realTimeMs / 1000,
      gameTicksCompleted,
    };
    return this;
  }

  game(config: GameConfigMetadata): this {
    this.metadata.game = config;
    return this;
  }

  players(players: PlayerMetadata[]): this {
    this.metadata.players = players;
    return this;
  }

  performance(perf: PerformanceMetadata): this {
    this.metadata.performance = perf;
    return this;
  }

  commandStats(stats: {
    total: number;
    byPlayer: Record<number, number>;
    invalid: number;
    failed: number;
  }): this {
    this.metadata.commandStats = {
      ...stats,
      successRate: (stats.total - stats.invalid - stats.failed) / Math.max(stats.total, 1),
    };
    return this;
  }

  winner(playerId: number, reason: 'elimination' | 'tick_limit' | 'surrender'): this {
    this.metadata.winner = { playerId, reason };
    return this;
  }

  environment(): this {
    const os = process.platform;
    const cpuCores = require('os').cpus().length;
    const memoryMb = Math.round(require('os').totalmem() / 1024 / 1024);
    const node = process.version;

    this.metadata.environment = {
      os,
      node,
      cpuCores,
      memoryMb,
    };
    return this;
  }

  build(): MatchMetadata {
    if (!this.metadata.matchId) throw new Error('matchId is required');
    if (!this.metadata.timestamp) throw new Error('timestamp is required');
    if (!this.metadata.duration) throw new Error('duration is required');
    if (!this.metadata.game) throw new Error('game config is required');
    if (!this.metadata.players) throw new Error('players metadata is required');
    if (!this.metadata.performance) throw new Error('performance metadata is required');
    if (!this.metadata.commandStats) throw new Error('command stats are required');
    if (!this.metadata.environment) throw new Error('environment info is required');

    return this.metadata as MatchMetadata;
  }
}

/**
 * Generate a prompt hash for version control
 */
export function hashPrompt(prompt: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

/**
 * Create metadata for an Ollama AI model
 */
export function createOllamaMetadata(
  name: string,
  version: string,
  params: {
    temperature: number;
    topP: number;
    topK: number;
    numPredict: number;
  },
  systemPrompt?: string
): AIModelMetadata {
  return {
    id: `ollama-${name}`,
    name,
    version,
    type: 'ollama',
    parameters: {
      temperature: params.temperature,
      topP: params.topP,
      topK: params.topK,
      maxTokens: params.numPredict,
      contextWindow: 4096, // Default for ollama
    },
    systemPrompt,
    promptHash: systemPrompt ? hashPrompt(systemPrompt) : undefined,
  };
}

/**
 * Create metadata for Petra AI
 */
export function createPetraMetadata(): AIModelMetadata {
  return {
    id: 'petra-builtin',
    name: 'Petra',
    version: '0.26.13', // Built-in to 0 A.D.
    type: 'petra',
    parameters: {
      // Petra has no configurable parameters (built-in)
    },
  };
}

/**
 * Calculate latency statistics from raw latency samples
 */
export function calculateLatencyStats(samples: number[]): {
  min: number;
  max: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
} {
  if (samples.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, p95: 0, p99: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { min, max, average, median, p95, p99 };
}
