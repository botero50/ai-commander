import { describe, it, expect, beforeEach } from 'vitest';
import {
  worldToJSON,
  renderPrompt,
  createObservation,
  validateObservation,
  getObservationStats,
} from '../src/world/observation-protocol.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Observation Protocol', () => {
  let world = createInitialWorld();

  beforeEach(() => {
    world = createInitialWorld();
  });

  describe('World to JSON Conversion', () => {
    it('converts world snapshot to JSON', () => {
      const json = worldToJSON(world);

      expect(json).toBeDefined();
      expect(json.tick).toBe(0);
      expect(json.gameState).toBe('playing');
      expect(json.resources).toBeGreaterThanOrEqual(0);
    });

    it('includes all workers', () => {
      const json = worldToJSON(world);

      expect(json.workers).toBeDefined();
      expect(Array.isArray(json.workers)).toBe(true);
      expect(json.workers.length).toBe(world.workers.length);
    });

    it('includes all military units', () => {
      const json = worldToJSON(world);

      expect(json.military).toBeDefined();
      expect(Array.isArray(json.military)).toBe(true);
    });

    it('includes known enemies', () => {
      const json = worldToJSON(world);

      expect(json.knownEnemies).toBeDefined();
      expect(Array.isArray(json.knownEnemies)).toBe(true);
    });

    it('includes resource deposits', () => {
      const json = worldToJSON(world);

      expect(json.resourceDeposits).toBeDefined();
      expect(Array.isArray(json.resourceDeposits)).toBe(true);
    });

    it('includes base location', () => {
      const json = worldToJSON(world);

      expect(json.base).toBeDefined();
      expect(json.base.x).toBe(world.baseX);
      expect(json.base.y).toBe(world.baseY);
    });

    it('preserves worker details', () => {
      const json = worldToJSON(world);

      if (json.workers.length > 0) {
        const worker = json.workers[0];
        expect(worker.position).toBeDefined();
        expect(worker.carrying).toBeDefined();
        expect(worker.busy).toEqual(expect.any(Boolean));
      }
    });

    it('preserves military details', () => {
      const worldWithMilitary = {
        ...world,
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 10, y: 10, health: 100 }],
      } as any;

      const json = worldToJSON(worldWithMilitary);

      expect(json.military.length).toBe(1);
      const unit = json.military[0];
      expect(unit.type).toBe('infantry');
      expect(unit.health).toBe(100);
    });
  });

  describe('Prompt Rendering', () => {
    it('renders observation as prompt', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes tick number in prompt', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('Tick 0');
    });

    it('includes resource count in prompt', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('Resources:');
    });

    it('includes base location in prompt', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('Base Location');
    });

    it('includes workforce section', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('WORKFORCE');
    });

    it('includes military section', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('MILITARY');
    });

    it('includes enemies section', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('KNOWN ENEMIES');
    });

    it('includes deposits section', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('RESOURCE DEPOSITS');
    });

    it('handles empty workers list', () => {
      const emptyWorld = { ...world, workers: [] } as any;
      const json = worldToJSON(emptyWorld);
      const prompt = renderPrompt(json);

      expect(prompt).toContain('No workers');
    });

    it('handles empty enemies list', () => {
      const json = worldToJSON(world);
      const prompt = renderPrompt(json);

      if (world.knownEnemies.length === 0) {
        expect(prompt).toContain('No known enemies');
      }
    });
  });

  describe('Canonical Observation', () => {
    it('creates observation from world', () => {
      const observation = createObservation(world, 'match1', 'player1');

      expect(observation).toBeDefined();
      expect(observation.context).toBeDefined();
      expect(observation.json).toBeDefined();
      expect(observation.prompt).toBeDefined();
    });

    it('includes context metadata', () => {
      const observation = createObservation(world, 'match-abc', 'player-xyz');

      expect(observation.context.matchId).toBe('match-abc');
      expect(observation.context.playerId).toBe('player-xyz');
      expect(observation.context.timestamp).toBeGreaterThan(0);
    });

    it('includes JSON representation', () => {
      const observation = createObservation(world, 'match1', 'player1');

      expect(observation.json.tick).toBe(world.tick);
      expect(observation.json.resources).toBe(world.playerResources);
    });

    it('includes prompt representation', () => {
      const observation = createObservation(world, 'match1', 'player1');

      expect(observation.prompt).toContain('WORLD OBSERVATION');
      expect(observation.prompt.length).toBeGreaterThan(0);
    });

    it('formats both JSON and prompt identically', () => {
      const obs1 = createObservation(world, 'match1', 'player1');
      const obs2 = createObservation(world, 'match1', 'player1');

      // JSON should be identical for same world state
      expect(JSON.stringify(obs1.json)).toBe(JSON.stringify(obs2.json));
      // Prompts should be identical
      expect(obs1.prompt).toBe(obs2.prompt);
    });
  });

  describe('Observation Validation', () => {
    it('validates correct observation', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const errors = validateObservation(observation);

      expect(errors.length).toBe(0);
    });

    it('detects invalid matchId', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const invalid = { ...observation, context: { ...observation.context, matchId: '' } };

      const errors = validateObservation(invalid);
      expect(errors.some((e) => e.includes('matchId'))).toBe(true);
    });

    it('detects invalid playerId', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const invalid = { ...observation, context: { ...observation.context, playerId: '' } };

      const errors = validateObservation(invalid);
      expect(errors.some((e) => e.includes('playerId'))).toBe(true);
    });

    it('detects negative tick', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const invalid = { ...observation, json: { ...observation.json, tick: -5 } };

      const errors = validateObservation(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('detects negative resources', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const invalid = { ...observation, json: { ...observation.json, resources: -10 } };

      const errors = validateObservation(invalid);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('detects empty prompt', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const invalid = { ...observation, prompt: '' };

      const errors = validateObservation(invalid);
      expect(errors.some((e) => e.includes('prompt'))).toBe(true);
    });
  });

  describe('Observation Statistics', () => {
    it('calculates observation stats', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const stats = getObservationStats(observation);

      expect(stats).toBeDefined();
      expect(stats.workerCount).toBeGreaterThanOrEqual(0);
      expect(stats.militaryCount).toBeGreaterThanOrEqual(0);
      expect(stats.enemyCount).toBeGreaterThanOrEqual(0);
      expect(stats.depositCount).toBeGreaterThanOrEqual(0);
      expect(stats.totalUnits).toBeGreaterThanOrEqual(0);
    });

    it('includes prompt length', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const stats = getObservationStats(observation);

      expect(stats.promptLength).toBe(observation.prompt.length);
    });

    it('includes JSON size', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const stats = getObservationStats(observation);

      expect(stats.jsonSize).toBeGreaterThan(0);
    });

    it('tracks total units', () => {
      const observation = createObservation(world, 'match1', 'player1');
      const stats = getObservationStats(observation);

      expect(stats.totalUnits).toBe(stats.workerCount + stats.militaryCount);
    });
  });

  describe('Canonical Format Guarantees', () => {
    it('same world always produces same JSON', () => {
      const json1 = worldToJSON(world);
      const json2 = worldToJSON(world);

      expect(JSON.stringify(json1)).toBe(JSON.stringify(json2));
    });

    it('same world always produces same prompt', () => {
      const prompt1 = renderPrompt(worldToJSON(world));
      const prompt2 = renderPrompt(worldToJSON(world));

      expect(prompt1).toBe(prompt2);
    });

    it('different worlds produce different observations', () => {
      const world2 = { ...world, playerResources: 100 } as any;

      const obs1 = createObservation(world, 'match1', 'player1');
      const obs2 = createObservation(world2, 'match1', 'player1');

      expect(obs1.json).not.toEqual(obs2.json);
    });

    it('observations are deterministic', () => {
      const observations = Array.from({ length: 5 }, () => createObservation(world, 'match1', 'player1'));

      for (let i = 1; i < observations.length; i++) {
        expect(JSON.stringify(observations[i].json)).toBe(JSON.stringify(observations[0].json));
        expect(observations[i].prompt).toBe(observations[0].prompt);
      }
    });
  });

  describe('Provider Independence', () => {
    it('JSON format is provider-agnostic', () => {
      const json = worldToJSON(world);

      // Should be parseable by any language/provider
      expect(() => JSON.stringify(json)).not.toThrow();
      expect(JSON.parse(JSON.stringify(json))).toBeDefined();
    });

    it('prompt format is human-readable', () => {
      const prompt = renderPrompt(worldToJSON(world));

      // Should be clear and structured
      expect(prompt).toContain('===');
      expect(prompt).toContain('---');
      expect(prompt).toContain(':');
    });

    it('observation contains no provider-specific fields', () => {
      const observation = createObservation(world, 'match1', 'player1');

      const json = observation.json;
      const keys = Object.keys(json);

      // Should only contain generic fields
      const allowedKeys = [
        'tick',
        'gameState',
        'resources',
        'workers',
        'military',
        'knownEnemies',
        'resourceDeposits',
        'base',
      ];

      for (const key of keys) {
        expect(allowedKeys).toContain(key);
      }
    });
  });

  describe('Performance', () => {
    it('converts to JSON efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        worldToJSON(world);
      }
      const duration = performance.now() - start;

      // Should be fast (less than 10ms per conversion average)
      expect(duration / 100).toBeLessThan(10);
    });

    it('renders prompt efficiently', () => {
      const json = worldToJSON(world);
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        renderPrompt(json);
      }
      const duration = performance.now() - start;

      // Should be fast
      expect(duration / 100).toBeLessThan(10);
    });
  });
});
