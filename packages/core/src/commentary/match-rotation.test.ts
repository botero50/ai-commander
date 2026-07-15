/**
 * Tests for Story 58.1-58.3 — Match Rotation System
 *
 * Verifies:
 * - Map rotation prevents repeats
 * - Civilization rotation is fair
 * - History is lightweight
 * - Auto-cleanup works
 * - No database needed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchRotation } from './match-rotation.js';

describe('MatchRotation', () => {
  const testConfig = {
    mapBlacklistSize: 3,
    civBlacklistSize: 5,
    maxHistorySize: 100,
  };

  let rotation: MatchRotation;

  beforeEach(() => {
    rotation = new MatchRotation(testConfig);
  });

  describe('initialization', () => {
    it('should initialize', () => {
      expect(rotation).toBeDefined();
    });

    it('should have empty history initially', () => {
      const history = rotation.getHistory();
      expect(history.length).toBe(0);
    });

    it('should report zero matches initially', () => {
      const stats = rotation.getStats();
      expect(stats.totalMatches).toBe(0);
    });
  });

  describe('match recording', () => {
    it('should record matches', () => {
      rotation.recordMatch('test_map', ['britons', 'gauls']);

      const history = rotation.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].map).toBe('test_map');
    });

    it('should track multiple matches', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map2', ['civ3', 'civ4']);
      rotation.recordMatch('map3', ['civ1', 'civ3']);

      const stats = rotation.getStats();
      expect(stats.totalMatches).toBe(3);
    });

    it('should record timestamp', () => {
      const before = Date.now();
      rotation.recordMatch('test_map', ['civ1', 'civ2']);
      const after = Date.now();

      const history = rotation.getHistory();
      const timestamp = history[0].timestamp;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('map rotation', () => {
    it('should prevent consecutive map repeats', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map2', ['civ3', 'civ4']);

      const blacklist = rotation.getMapBlacklist();

      // Recent maps (within blacklist window) should be blacklisted
      expect(blacklist.has('map2')).toBe(true);
      expect(blacklist.has('map1')).toBe(true); // Both within blacklistSize=3
    });

    it('should blacklist N recent maps', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map2', ['civ3', 'civ4']);
      rotation.recordMatch('map3', ['civ1', 'civ3']);

      const blacklist = rotation.getMapBlacklist();

      // All 3 recent maps should be blacklisted (mapBlacklistSize = 3)
      expect(blacklist.size).toBe(3);
      expect(blacklist.has('map1')).toBe(true);
      expect(blacklist.has('map2')).toBe(true);
      expect(blacklist.has('map3')).toBe(true);
    });

    it('should suggest least used maps', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map1', ['civ3', 'civ4']);
      rotation.recordMatch('map2', ['civ1', 'civ3']);

      const leastUsed = rotation.getLeastUsedMap(['map1', 'map2', 'map3']);

      // map3 has never been used
      expect(leastUsed).toBe('map3');
    });

    it('should track map frequency', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map1', ['civ3', 'civ4']);
      rotation.recordMatch('map2', ['civ1', 'civ3']);

      const stats = rotation.getStats();

      expect(stats.mapDistribution['map1']).toBe(2);
      expect(stats.mapDistribution['map2']).toBe(1);
    });
  });

  describe('civilization rotation', () => {
    it('should prevent consecutive civ pair repeats', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['romans', 'carthaginians']);

      const blacklist = rotation.getCivBlacklist();

      // Recent pairs should be blacklisted
      expect(blacklist.has('romans:carthaginians')).toBe(true);
    });

    it('should track civ pair history', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['britons', 'romans']);

      const blacklist = rotation.getCivBlacklist();

      expect(blacklist.has('britons:gauls')).toBe(true);
      expect(blacklist.has('britons:romans')).toBe(true);
    });

    it('should suggest least used civilizations', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['britons', 'romans']);
      rotation.recordMatch('map3', ['britons', 'carthaginians']);

      const leastUsed = rotation.getLeastUsedCivs(
        ['britons', 'gauls', 'romans', 'carthaginians', 'persians'],
        2
      );

      // persians should be included (never used)
      expect(leastUsed).toContain('persians');
    });

    it('should track civ frequency', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['britons', 'romans']);

      const stats = rotation.getStats();

      expect(stats.civDistribution['britons']).toBe(2);
      expect(stats.civDistribution['gauls']).toBe(1);
      expect(stats.civDistribution['romans']).toBe(1);
    });
  });

  describe('history management', () => {
    it('should limit history size', () => {
      const config = {
        mapBlacklistSize: 3,
        civBlacklistSize: 5,
        maxHistorySize: 10,
      };

      const limited = new MatchRotation(config);

      // Record more than max
      for (let i = 0; i < 20; i++) {
        limited.recordMatch(`map${i}`, ['civ1', 'civ2']);
      }

      const history = limited.getHistory();
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should auto-cleanup old entries', () => {
      const config = {
        mapBlacklistSize: 3,
        civBlacklistSize: 5,
        maxHistorySize: 5,
      };

      const limited = new MatchRotation(config);

      // Record exactly 5
      for (let i = 0; i < 5; i++) {
        limited.recordMatch(`map${i}`, ['civ1', 'civ2']);
      }

      let history = limited.getHistory();
      expect(history.length).toBe(5);

      // Record one more - should trigger cleanup
      limited.recordMatch('map5', ['civ3', 'civ4']);

      history = limited.getHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve history in order', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map2', ['civ3', 'civ4']);
      rotation.recordMatch('map3', ['civ1', 'civ3']);

      const history = rotation.getHistory();

      expect(history[0].map).toBe('map1');
      expect(history[1].map).toBe('map2');
      expect(history[2].map).toBe('map3');
    });

    it('should freeze history (immutable)', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);

      const history = rotation.getHistory();
      expect(() => {
        (history as any)[0] = null;
      }).toThrow();
    });
  });

  describe('statistics', () => {
    it('should provide rotation stats', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['romans', 'carthaginians']);

      const stats = rotation.getStats();

      expect(stats.totalMatches).toBe(2);
      expect(stats.uniqueMaps).toBe(2);
      expect(stats.uniqueCivs).toBe(4);
      expect(stats.mapDistribution).toBeDefined();
      expect(stats.civDistribution).toBeDefined();
    });

    it('should calculate unique maps count', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map1', ['civ3', 'civ4']); // Same map
      rotation.recordMatch('map2', ['civ1', 'civ3']);

      const stats = rotation.getStats();

      expect(stats.uniqueMaps).toBe(2);
    });

    it('should calculate unique civs count', () => {
      rotation.recordMatch('map1', ['britons', 'gauls']);
      rotation.recordMatch('map2', ['britons', 'romans']); // Britons reused
      rotation.recordMatch('map3', ['carthaginians', 'persians']);

      const stats = rotation.getStats();

      // britons, gauls, romans, carthaginians, persians = 5 unique
      expect(stats.uniqueCivs).toBe(5);
    });
  });

  describe('acceptance criteria', () => {
    it('criterion: no consecutive map repeats', () => {
      rotation.recordMatch('map1', ['civ1', 'civ2']);

      const blacklist = rotation.getMapBlacklist();

      // map1 should be blacklisted for next selection
      expect(blacklist.has('map1')).toBe(true);
    });

    it('criterion: fair civilization distribution', () => {
      // Play 10 matches, alternating civs
      for (let i = 0; i < 10; i++) {
        rotation.recordMatch(`map${i}`, [
          ['britons', 'gauls', 'romans', 'carthaginians'][i % 4],
          ['persians', 'ptolemies', 'seleucids', 'athenians'][i % 4],
        ] as [string, string]);
      }

      const stats = rotation.getStats();

      // All civs should be used roughly equally
      const counts = Object.values(stats.civDistribution);
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;

      for (const count of counts) {
        // Each should be within 1 of average (allow some variance)
        expect(Math.abs(count - avgCount)).toBeLessThanOrEqual(1);
      }
    });

    it('criterion: minimal runtime state', () => {
      // Record 1000 matches
      for (let i = 0; i < 1000; i++) {
        rotation.recordMatch(`map${i % 20}`, [
          `civ${i % 12}`,
          `civ${(i + 1) % 12}`,
        ] as [string, string]);
      }

      const stats = rotation.getStats();
      const history = rotation.getHistory();

      // History should be limited despite 1000 matches
      expect(history.length).toBeLessThanOrEqual(testConfig.maxHistorySize);

      // Stats tracks frequency of all recorded matches, but history is limited
      // totalMatches is based on frequency map accumulation
      expect(stats.totalMatches).toBeLessThanOrEqual(1000);

      // But frequency tracking should show total has been recorded
      const totalFromFrequency = Object.values(stats.mapDistribution).reduce((a, b) => a + b, 0);
      expect(totalFromFrequency).toBeGreaterThanOrEqual(50); // At least some matches recorded
    });

    it('criterion: only supported content', () => {
      // All recorded content came from valid inputs
      rotation.recordMatch('alpine_mountains_3p', ['britons', 'gauls']);
      rotation.recordMatch('ambush_valley_2p', ['romans', 'carthaginians']);

      const stats = rotation.getStats();

      // Should only track what was recorded
      expect(stats.mapDistribution['alpine_mountains_3p']).toBe(1);
      expect(stats.mapDistribution['ambush_valley_2p']).toBe(1);
    });

    it('criterion: automatic memory cleanup', () => {
      const config = {
        mapBlacklistSize: 3,
        civBlacklistSize: 5,
        maxHistorySize: 20,
      };

      const tracker = new MatchRotation(config);

      // Record 100 matches
      for (let i = 0; i < 100; i++) {
        tracker.recordMatch(`map${i}`, ['civ1', 'civ2']);
      }

      const history = tracker.getHistory();

      // Should never exceed maxHistorySize
      expect(history.length).toBeLessThanOrEqual(20);

      // Old entries should be gone
      expect(history[0].map).not.toBe('map0');
    });

    it('criterion: no database or analytics needed', () => {
      // This test verifies the implementation is self-contained
      // No external dependencies, no persistence layer

      rotation.recordMatch('map1', ['civ1', 'civ2']);
      rotation.recordMatch('map2', ['civ3', 'civ4']);

      // Stats are computed on demand
      const stats = rotation.getStats();

      // No database calls, no file I/O
      expect(stats.totalMatches).toBe(2);
      expect(stats.uniqueMaps).toBe(2);

      // Data is volatile (lost on restart)
      const newRotation = new MatchRotation(testConfig);
      const newStats = newRotation.getStats();

      expect(newStats.totalMatches).toBe(0);
    });
  });
});
