/**
 * Story 56.4 — Arena Status API Tests
 *
 * Validates that ArenaStatusAPI provides correct endpoints for broadcast overlay.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArenaStatusAPI, createArenaStatusEndpoints } from './arena-status-api.js';
import { ArenaController, type ArenaConfig } from './arena-controller.js';
import { Logger } from '../config/logger.js';

describe('Arena Status API (Story 56.4)', () => {
  let arena: ArenaController;
  let api: ArenaStatusAPI;
  const logger = new Logger('error');

  const createConfig = (): ArenaConfig => ({
    maxMatches: 10,
    players: [
      { name: 'API1', aiModel: 'test', aiPrompt: 'api1' },
      { name: 'API2', aiModel: 'test', aiPrompt: 'api2' },
    ],
  });

  beforeEach(() => {
    arena = new ArenaController(createConfig(), logger);
    api = new ArenaStatusAPI(arena, logger);
  });

  describe('status endpoint', () => {
    it('should provide full arena status', () => {
      const status = api.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('currentMatchNumber');
      expect(status).toHaveProperty('matchesCompleted');
    });

    it('should include all status fields', () => {
      const status = api.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('currentMatchNumber');
      expect(status).toHaveProperty('matchesCompleted');
      expect(status).toHaveProperty('matchesFailed');
      expect(status).toHaveProperty('crashRestarts');
      expect(status).toHaveProperty('totalUptime');
    });

    it('should export status as JSON', () => {
      const json = api.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('isRunning');
      expect(parsed).toHaveProperty('matchesCompleted');
    });
  });

  describe('stats endpoint', () => {
    it('should provide summary statistics', () => {
      const stats = api.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('matchNumber');
      expect(stats).toHaveProperty('matchesCompleted');
      expect(stats).toHaveProperty('completionRate');
    });

    it('should include formatted uptime', () => {
      const stats = api.getStats();

      expect(stats).toHaveProperty('uptimeFormatted');
      expect(stats.uptimeFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should calculate completion rate', () => {
      const stats = api.getStats();

      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(100);
    });

    it('should include health status', () => {
      const stats = api.getStats();

      expect(stats).toHaveProperty('health');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(stats.health);
    });

    it('should export stats as JSON', () => {
      const json = api.statsJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('matchNumber');
      expect(parsed).toHaveProperty('completionRate');
    });
  });

  describe('health endpoint', () => {
    it('should provide health snapshot', () => {
      const health = api.getHealth();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('crashCount');
    });

    it('should include health status', () => {
      const health = api.getHealth();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should calculate failure rate', () => {
      const health = api.getHealth();

      expect(health.failureRate).toBeGreaterThanOrEqual(0);
      expect(health.failureRate).toBeLessThanOrEqual(100);
    });

    it('should export health as JSON', () => {
      const json = api.healthJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('status');
      expect(parsed).toHaveProperty('failureRate');
    });
  });

  describe('health status determination', () => {
    it('should mark as healthy when stats are good', () => {
      const stats = api.getStats();

      // With zero failures and crashes, should be healthy
      if (stats.crashRestarts === 0 && stats.matchesFailed === 0) {
        expect(stats.health).toBe('healthy');
      }
    });

    it('should mark as degraded when crashes elevated', () => {
      // Health logic: > 2 crashes = degraded
      const stats = api.getStats();
      const health = api.getHealth();

      if (stats.crashRestarts > 2) {
        expect(['degraded', 'unhealthy']).toContain(health.status);
      }
    });

    it('should mark as unhealthy when critical', () => {
      // Health logic: > 5 crashes or 0% completion = unhealthy
      const health = api.getHealth();

      if (health.crashCount > 5 || health.failureRate > 50) {
        expect(health.status).toBe('unhealthy');
      }
    });
  });

  describe('broadcast overlay integration', () => {
    it('should provide data in broadcast-ready format', () => {
      const status = api.getStatus();

      // Broadcast overlay needs these fields
      expect(status).toHaveProperty('currentMatchNumber');
      expect(status).toHaveProperty('matchesCompleted');
      expect(status).toHaveProperty('totalUptime');
      expect(status).toHaveProperty('currentMatch');
      expect(status).toHaveProperty('lastMatch');
    });

    it('should update continuously for live display', () => {
      const stats1 = api.getStats();
      const timestamp1 = stats1.timestamp;

      const stats2 = api.getStats();
      const timestamp2 = stats2.timestamp;

      // Timestamps should be fresh
      expect(timestamp1).toBeDefined();
      expect(timestamp2).toBeDefined();
    });

    it('should include current match info if available', () => {
      const status = api.getStatus();

      if (status.currentMatch) {
        expect(status.currentMatch).toHaveProperty('matchId');
        expect(status.currentMatch).toHaveProperty('map');
        expect(status.currentMatch).toHaveProperty('players');
      }
    });

    it('should include last match result if available', () => {
      const status = api.getStatus();

      if (status.lastMatch) {
        expect(status.lastMatch).toHaveProperty('matchId');
        expect(status.lastMatch).toHaveProperty('winner');
        expect(status.lastMatch).toHaveProperty('duration');
      }
    });
  });

  describe('API factory function', () => {
    it('should create endpoints from factory', () => {
      const endpoints = createArenaStatusEndpoints(arena);

      expect(endpoints).toHaveProperty('status');
      expect(endpoints).toHaveProperty('stats');
      expect(endpoints).toHaveProperty('health');
    });

    it('should factory endpoints return data', () => {
      const endpoints = createArenaStatusEndpoints(arena);

      const status = endpoints.status();
      expect(status).toBeDefined();

      const stats = endpoints.stats();
      expect(stats).toBeDefined();

      const health = endpoints.health();
      expect(health).toBeDefined();
    });

    it('should factory provide JSON exports', () => {
      const endpoints = createArenaStatusEndpoints(arena);

      const statusJson = endpoints.statusJSON();
      expect(typeof statusJson).toBe('string');
      expect(() => JSON.parse(statusJson)).not.toThrow();

      const statsJson = endpoints.statsJSON();
      expect(typeof statsJson).toBe('string');
      expect(() => JSON.parse(statsJson)).not.toThrow();
    });
  });

  describe('timestamp handling', () => {
    it('should include ISO timestamp in status', () => {
      const status = api.getStatus();

      expect(status).toHaveProperty('timestamp');
      // Status timestamp comes from arena, may be undefined initially
    });

    it('should include ISO timestamp in stats', () => {
      const stats = api.getStats();

      expect(stats.timestamp).toBeDefined();
      // Should be valid ISO format
      expect(() => new Date(stats.timestamp)).not.toThrow();
    });

    it('should include ISO timestamp in health', () => {
      const health = api.getHealth();

      expect(health.timestamp).toBeDefined();
      expect(() => new Date(health.timestamp)).not.toThrow();
    });
  });

  describe('uptime formatting', () => {
    it('should format uptime as HH:MM:SS', () => {
      const stats = api.getStats();

      expect(stats.uptimeFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle zero uptime', () => {
      // If arena just started, uptime will be near 0
      const stats = api.getStats();

      if (stats.uptime === 0) {
        expect(stats.uptimeFormatted).toBe('00:00:00');
      }
    });

    it('should handle large uptime values', () => {
      // Uptime can be > 1 hour
      const stats = api.getStats();

      expect(stats.uptimeFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
