import { describe, it, expect } from 'vitest';
import {
  MatchMetadataBuilder,
  hashPrompt,
  createOllamaMetadata,
  createPetraMetadata,
  calculateLatencyStats,
  type MatchMetadata,
  type AIModelMetadata,
} from './match-metadata.js';

describe('MatchMetadata', () => {
  describe('MatchMetadataBuilder', () => {
    it('should build complete metadata', () => {
      const metadata = new MatchMetadataBuilder()
        .matchId('2026-07-10-ABC123')
        .timestamp('2026-07-10T12:00:00Z')
        .duration(10000, 300)
        .game({
          map: 'acropolis_bay_2p',
          gameVersion: '0.26.13',
          adapterVersion: '1.0.0',
          difficulty: 'moderate',
          speed: 'normal',
          gameType: 'skirmish',
        })
        .players([
          {
            id: 1,
            civilization: 'Athenians',
            ai: createOllamaMetadata('neural-chat:latest', '1.0', {
              temperature: 0.7,
              topP: 0.9,
              topK: 40,
              numPredict: 256,
            }),
          },
          {
            id: 2,
            civilization: 'Spartans',
            ai: createPetraMetadata(),
          },
        ])
        .performance({
          rlInterfaceLatency: {
            min: 10,
            max: 150,
            average: 50,
            median: 45,
            p95: 120,
            p99: 145,
          },
          gameTickLatency: {
            min: 1000,
            max: 2000,
            average: 1350,
            median: 1340,
          },
          decisionLatency: {
            min: 100,
            max: 500,
            average: 250,
          },
          commandThroughput: {
            commandsPerSecond: 1.28,
            commandsPerTick: 1.78,
            peakCommandsPerTick: 3,
          },
        })
        .commandStats({
          total: 534,
          byPlayer: { 1: 534, 2: 0 },
          invalid: 0,
          failed: 0,
        })
        .winner(1, 'tick_limit')
        .environment();

      const built = metadata.build();

      expect(built.matchId).toBe('2026-07-10-ABC123');
      expect(built.timestamp).toBe('2026-07-10T12:00:00Z');
      expect(built.duration.gameTicksCompleted).toBe(300);
      expect(built.game.map).toBe('acropolis_bay_2p');
      expect(built.players.length).toBe(2);
      expect(built.commandStats.successRate).toBe(1);
      expect(built.winner?.playerId).toBe(1);
      expect(built.environment.os).toBeDefined();
    });

    it('should throw if required fields missing', () => {
      expect(() => new MatchMetadataBuilder().build()).toThrow('matchId is required');

      expect(() =>
        new MatchMetadataBuilder()
          .matchId('test-id')
          .build()
      ).toThrow('timestamp is required');

      expect(() =>
        new MatchMetadataBuilder()
          .matchId('test-id')
          .timestamp('2026-07-10T12:00:00Z')
          .build()
      ).toThrow('duration is required');
    });

    it('should calculate success rate', () => {
      const metadata = new MatchMetadataBuilder()
        .matchId('test')
        .timestamp('2026-07-10T12:00:00Z')
        .duration(10000, 300)
        .game({
          map: 'acropolis_bay_2p',
          gameVersion: '0.26.13',
          adapterVersion: '1.0.0',
          difficulty: 'moderate',
          speed: 'normal',
          gameType: 'skirmish',
        })
        .players([])
        .performance({
          rlInterfaceLatency: { min: 0, max: 0, average: 0, median: 0, p95: 0, p99: 0 },
          gameTickLatency: { min: 0, max: 0, average: 0, median: 0 },
          decisionLatency: { min: 0, max: 0, average: 0 },
          commandThroughput: {
            commandsPerSecond: 0,
            commandsPerTick: 0,
            peakCommandsPerTick: 0,
          },
        })
        .commandStats({
          total: 100,
          byPlayer: { 1: 100 },
          invalid: 10,
          failed: 5,
        })
        .environment();

      const built = metadata.build();
      expect(built.commandStats.successRate).toBe(0.85); // (100 - 10 - 5) / 100
    });
  });

  describe('hashPrompt', () => {
    it('should generate deterministic hash', () => {
      const prompt = 'You are a strategic AI controlling a civilization.';
      const hash1 = hashPrompt(prompt);
      const hash2 = hashPrompt(prompt);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    it('should differ for different prompts', () => {
      const hash1 = hashPrompt('Prompt A');
      const hash2 = hashPrompt('Prompt B');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createOllamaMetadata', () => {
    it('should create Ollama metadata with all fields', () => {
      const meta = createOllamaMetadata(
        'neural-chat:latest',
        '1.0',
        {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          numPredict: 256,
        },
        'You are a strategic AI.'
      );

      expect(meta.id).toBe('ollama-neural-chat:latest');
      expect(meta.name).toBe('neural-chat:latest');
      expect(meta.version).toBe('1.0');
      expect(meta.type).toBe('ollama');
      expect(meta.parameters.temperature).toBe(0.7);
      expect(meta.parameters.maxTokens).toBe(256);
      expect(meta.promptHash).toBeDefined();
      expect(meta.systemPrompt).toBe('You are a strategic AI.');
    });

    it('should handle missing system prompt', () => {
      const meta = createOllamaMetadata(
        'neural-chat:latest',
        '1.0',
        {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          numPredict: 256,
        }
      );

      expect(meta.promptHash).toBeUndefined();
      expect(meta.systemPrompt).toBeUndefined();
    });
  });

  describe('createPetraMetadata', () => {
    it('should create Petra metadata', () => {
      const meta = createPetraMetadata();

      expect(meta.id).toBe('petra-builtin');
      expect(meta.name).toBe('Petra');
      expect(meta.type).toBe('petra');
      expect(meta.version).toBe('0.26.13');
      expect(meta.parameters).toEqual({});
    });
  });

  describe('calculateLatencyStats', () => {
    it('should calculate stats from samples', () => {
      const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = calculateLatencyStats(samples);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.average).toBe(55);
      expect(stats.median).toBe(60); // Floor of (10 / 2) = 5, which is index 5 = 60
    });

    it('should calculate percentiles', () => {
      const samples = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100
      const stats = calculateLatencyStats(samples);

      expect(stats.p95).toBeGreaterThan(90);
      expect(stats.p99).toBeGreaterThan(95);
      expect(stats.p99).toBeGreaterThanOrEqual(stats.p95);
    });

    it('should handle empty samples', () => {
      const stats = calculateLatencyStats([]);

      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
    });

    it('should handle single sample', () => {
      const stats = calculateLatencyStats([42]);

      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.average).toBe(42);
      expect(stats.median).toBe(42);
    });
  });

  describe('Full metadata creation flow', () => {
    it('should create complete match metadata with all details', () => {
      const systemPrompt =
        'You are an RTS commander. Expand your economy, build military, and defeat opponents.';

      const metadata = new MatchMetadataBuilder()
        .matchId('2026-07-10-DEF456')
        .timestamp('2026-07-10T14:30:00Z')
        .duration(415400, 300)
        .game({
          map: 'acropolis_bay_2p',
          mapVersion: '1.0',
          gameVersion: '0.26.13',
          adapterVersion: '1.0.0',
          difficulty: 'moderate',
          speed: 'normal',
          gameType: 'skirmish',
        })
        .players([
          {
            id: 1,
            civilization: 'Athenians',
            ai: createOllamaMetadata(
              'neural-chat:latest',
              '1.0',
              {
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                numPredict: 256,
              },
              systemPrompt
            ),
            startingResources: {
              food: 300,
              wood: 200,
              stone: 50,
              metal: 50,
            },
          },
          {
            id: 2,
            civilization: 'Spartans',
            ai: createPetraMetadata(),
            startingResources: {
              food: 300,
              wood: 200,
              stone: 50,
              metal: 50,
            },
          },
        ])
        .performance({
          rlInterfaceLatency: calculateLatencyStats(
            Array.from({ length: 100 }, () => 10 + Math.random() * 50)
          ),
          gameTickLatency: {
            min: 1000,
            max: 2000,
            average: 1385,
            median: 1380,
          },
          decisionLatency: calculateLatencyStats(
            Array.from({ length: 300 }, () => 100 + Math.random() * 200)
          ),
          commandThroughput: {
            commandsPerSecond: 1.28,
            commandsPerTick: 1.78,
            peakCommandsPerTick: 3,
          },
        })
        .commandStats({
          total: 534,
          byPlayer: { 1: 534, 2: 0 },
          invalid: 0,
          failed: 0,
        })
        .winner(1, 'tick_limit')
        .environment();

      const built = metadata.build();

      // Verify complete structure
      expect(built.matchId).toBe('2026-07-10-DEF456');
      expect(built.game.gameVersion).toBe('0.26.13');
      expect(built.players[0].ai.promptHash).toBeDefined();
      expect(built.players[0].ai.promptHash).toMatch(/^[a-f0-9]{64}$/);
      expect(built.players[1].ai.type).toBe('petra');
      expect(built.performance.rlInterfaceLatency.p95).toBeGreaterThan(0);
      expect(built.commandStats.successRate).toBe(1);
      expect(built.environment.cpuCores).toBeGreaterThan(0);
    });
  });
});
