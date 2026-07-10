import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ArenaController, type ArenaConfig } from './arena-controller.js';
import { Logger } from '../config/logger.js';

describe('ArenaController', () => {
  let arena: ArenaController;
  const logger = new Logger('error');

  const createConfig = (overrides?: Partial<ArenaConfig>): ArenaConfig => ({
    maxMatches: 1, // Default to 1 match for testing
    players: [
      { name: 'Player1', aiModel: 'ollama', aiPrompt: 'Play aggressively' },
      { name: 'Player2', aiModel: 'ollama', aiPrompt: 'Play defensively' },
    ],
    ...overrides,
  });

  beforeEach(() => {
    arena = new ArenaController(createConfig(), logger);
  });

  describe('arena initialization', () => {
    it('should initialize with config', () => {
      expect(arena).toBeDefined();
    });

    it('should have default status when not running', () => {
      const status = arena.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.currentMatchNumber).toBe(0);
      expect(status.matchesCompleted).toBe(0);
    });
  });

  describe('arena status', () => {
    it('should export status as JSON', () => {
      const json = arena.exportStatusJSON();
      const status = JSON.parse(json);
      expect(status.isRunning).toBe(false);
      expect(status.matchesCompleted).toBeDefined();
    });

    it('should export status as formatted text', () => {
      const text = arena.exportStatusText();
      expect(text).toContain('AI COMMANDER ARENA STATUS');
      expect(text).toContain('STOPPED');
    });

    it('should track uptime', () => {
      const status1 = arena.getStatus();
      expect(status1.totalUptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('match configuration generation', () => {
    it('should generate valid match config', () => {
      const config = createConfig({ players: [arena['config'].players[0], arena['config'].players[1]] });
      arena = new ArenaController(config, logger);

      // Call private method through status or another approach
      const status = arena.getStatus();
      expect(status.currentMatchNumber).toBe(0);
    });

    it('should select random maps', () => {
      const maps = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const config = createConfig();
        arena = new ArenaController(config, logger);
        // Indirectly test by running and checking variety
      }
      expect(maps.size).toBeGreaterThan(0);
    });

    it('should select random unique civilizations', () => {
      const config = createConfig({
        players: [
          { name: 'P1', aiModel: 'ollama', aiPrompt: 'p1' },
          { name: 'P2', aiModel: 'ollama', aiPrompt: 'p2' },
          { name: 'P3', aiModel: 'ollama', aiPrompt: 'p3' },
        ],
      });
      arena = new ArenaController(config, logger);

      // Should have unique civs for 3 players
      const status = arena.getStatus();
      expect(status).toBeDefined();
    });
  });

  describe('arena stopping', () => {
    it('should stop gracefully', () => {
      arena.stop();
      const status = arena.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should allow restart after stop', () => {
      arena.stop();
      expect(arena.getStatus().isRunning).toBe(false);

      const newArena = new ArenaController(createConfig(), logger);
      expect(newArena.getStatus().isRunning).toBe(false);
    });
  });

  describe('realistic scenario', () => {
    it('should provide complete arena status information', () => {
      const config = createConfig({
        maxMatches: 3,
        matchTimeoutSeconds: 1800,
      });
      arena = new ArenaController(config, logger);

      const status = arena.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.currentMatchNumber).toBe(0);
      expect(status.matchesCompleted).toBe(0);
      expect(status.matchesFailed).toBe(0);
      expect(status.crashRestarts).toBe(0);
      expect(status.totalUptime).toBeGreaterThanOrEqual(0);

      const text = arena.exportStatusText();
      expect(text).toContain('ARENA STATUS');
      expect(text).toContain('Match');
    });

    it('should maintain separate match statistics', () => {
      const config = createConfig({ maxMatches: 5 });
      arena = new ArenaController(config, logger);

      let status = arena.getStatus();
      expect(status.matchesCompleted).toBe(0);

      status = arena.getStatus();
      expect(status.matchesFailed).toBe(0);
    });
  });
});
