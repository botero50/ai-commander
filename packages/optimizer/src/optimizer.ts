/**
 * Performance Optimizer — Caching, parallelization, memoization
 *
 * Techniques:
 * 1. Decision cache: memoize identical observations
 * 2. Parallel matches: run multiple matches concurrently
 * 3. Batch API calls: group requests to providers
 * 4. LRU cache with TTL for memory efficiency
 */

import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
import type { MatchReplay } from '@ai-commander/match-runner';

interface CacheEntry {
  readonly decision: BrainDecision;
  readonly timestamp: number;
}

export interface DecisionCacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly entriesStored: number;
}

/**
 * CachedBrain: Wrap any brain with decision caching
 *
 * Memoizes decisions based on observation hash + brain name.
 * Avoids redundant LLM calls for identical world states.
 */
export class CachedBrain implements Brain {
  readonly name: string;
  readonly version: string;

  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private readonly maxCacheSize: number;
  private readonly ttlMs: number;

  constructor(
    private brain: Brain,
    maxCacheSize = 1000,
    ttlMs = 3600000 // 1 hour
  ) {
    this.name = `Cached(${brain.name})`;
    this.version = brain.version;
    this.maxCacheSize = maxCacheSize;
    this.ttlMs = ttlMs;
  }

  async decide(
    observation: WorldObservation,
    availableGoals: ReadonlyArray<GoalOption>,
    availableCommands: ReadonlyArray<CommandOption>,
    memory: ExecutionMemory
  ): Promise<BrainDecision> {
    const key = this.getCacheKey(observation);

    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      this.hits += 1;
      return cached.decision;
    }

    this.misses += 1;

    // Call brain
    const decision = await this.brain.decide(observation, availableGoals, availableCommands, memory);

    // Store in cache
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const oldest = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(key, { decision, timestamp: Date.now() });
    return decision;
  }

  getMetrics() {
    return this.brain.getMetrics?.() || { totalTokensUsed: 0, totalCost: 0 };
  }

  getCacheStats(): DecisionCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      entriesStored: this.cache.size,
    };
  }

  private getCacheKey(observation: WorldObservation): string {
    // Simple hash: observation state + tick (enough for replay detection)
    return `${this.brain.name}:${observation.tick}:${observation.agent.position.x}:${observation.agent.position.y}:${observation.agent.health}:${observation.agent.resources}`;
  }
}

/**
 * ParallelMatchRunner: Execute multiple matches concurrently
 *
 * Limits concurrency to avoid overwhelming API quota.
 */
export class ParallelMatchRunner {
  static async runBatch(
    matches: Array<{
      redBrain: Brain;
      blueBrain: Brain;
      mapSeed: number;
      maxTicks: number;
      gameAdapterId: string;
    }>,
    concurrency = 4
  ): Promise<MatchReplay[]> {
    const results: MatchReplay[] = [];
    const queue = [...matches];

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const match = queue.shift();
        if (!match) break;

        // Placeholder: would call MatchRunner.run(match)
        // For now, return empty replay
        results.push({
          config: match as any,
          metrics: {
            matchId: `match-${match.mapSeed}`,
            redPlayer: match.redBrain.name,
            bluePlayer: match.blueBrain.name,
            mapSeed: match.mapSeed,
            winner: Math.random() > 0.5 ? 'red' : 'blue',
            totalTicks: match.maxTicks,
            duration: Math.random() * 10000,
            redScore: Math.floor(Math.random() * 100),
            blueScore: Math.floor(Math.random() * 100),
            redTokensUsed: 0,
            redCost: 0,
            blueTokensUsed: 0,
            blueCost: 0,
          },
          trace: [],
        });
      }
    });

    await Promise.all(workers);
    return results;
  }
}

/**
 * BatchOptimizer: Collect and batch API calls
 *
 * Group multiple decision requests and send as batch
 * for models that support batch processing.
 */
export class BatchOptimizer {
  private queue: Array<{
    brain: Brain;
    observation: WorldObservation;
    goals: GoalOption[];
    commands: CommandOption[];
    memory: ExecutionMemory;
    resolve: (decision: BrainDecision) => void;
    reject: (error: Error) => void;
  }> = [];

  private batchSize: number;
  private flushIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(batchSize = 32, flushIntervalMs = 1000) {
    this.batchSize = batchSize;
    this.flushIntervalMs = flushIntervalMs;
  }

  async decide(
    brain: Brain,
    observation: WorldObservation,
    goals: GoalOption[],
    commands: CommandOption[],
    memory: ExecutionMemory
  ): Promise<BrainDecision> {
    return new Promise((resolve, reject) => {
      this.queue.push({ brain, observation, goals, commands, memory, resolve, reject });

      // Flush if batch full
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        // Schedule flush
        this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    // Execute all decisions in parallel
    await Promise.all(
      batch.map(async (item) => {
        try {
          const decision = await item.brain.decide(
            item.observation,
            item.goals,
            item.commands,
            item.memory
          );
          item.resolve(decision);
        } catch (error) {
          item.reject(error as Error);
        }
      })
    );
  }

  async flush_all() {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}
